// ════════════════════════════════════════════════════════
//  DB
// ════════════════════════════════════════════════════════
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ════════════════════════════════════════════════════════
//  ナビゲーション
// ════════════════════════════════════════════════════════
const SECTION_META = {
  'live':                { title: 'Dashboard',      icon: 'bi-broadcast'    },
  'reports':             { title: '日報編集',        icon: 'bi-journal-text' },
  'analytics':           { title: 'レポート',         icon: 'bi-bar-chart-line'},
  'csv':                 { title: 'CSVダウンロード',  icon: 'bi-download'     },
  'master-branches':     { title: '支店マスタ',      icon: 'bi-building'     },
  'master-trucks':       { title: '車輌マスタ',      icon: 'bi-truck'        },
  'master-destinations': { title: '配達先マスタ',    icon: 'bi-pin-map'      },
  'master-courses':      { title: 'コースマスタ',    icon: 'bi-map'          },
  'master-stops':        { title: 'コース配達先',    icon: 'bi-list-ol'      },
};

function navigate(sectionKey) {
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.getElementById('section-' + sectionKey)?.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === sectionKey);
  });

  const meta = SECTION_META[sectionKey] || {};
  document.getElementById('topbar-title').textContent = meta.title || '';
  document.getElementById('topbar-icon').className = (meta.icon || '') + ' icon';

  closeSidebar();
  if (SECTION_ON_ENTER[sectionKey]) SECTION_ON_ENTER[sectionKey]();
}

document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.section));
});

// ════════════════════════════════════════════════════════
//  モバイル: サイドバー開閉
// ════════════════════════════════════════════════════════
const sidebar  = document.getElementById('sidebar');
const backdrop = document.getElementById('sidebar-backdrop');

function openSidebar()  { sidebar.classList.add('open');    backdrop.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); backdrop.classList.remove('show'); }

document.getElementById('btn-toggle-sidebar').addEventListener('click', openSidebar);
backdrop.addEventListener('click', closeSidebar);

// ════════════════════════════════════════════════════════
//  Dashboard — データ取得
// ════════════════════════════════════════════════════════
const today = () => new Date().toLocaleDateString('sv');

const fmtTime = iso => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

async function loadDashboard() {
  // 車輌マスタ（全台）と本日の日報を並列取得
  const [
    { data: trucks },
    { data: todayReports },
  ] = await Promise.all([
    db.from('trucks').select('id, name, branches(name)').order('name'),
    db.from('reports').select('id, truck_id, status, courses(name)').eq('date', today()),
  ]);

  // 本日の日報に紐づく stop_records を一括取得
  const reportIds = (todayReports || []).map(r => r.id);
  let stopRecords = [];
  if (reportIds.length) {
    const { data } = await db
      .from('stop_records')
      .select('report_id, destination_name, departed_at, arrived_at, stop_number, weight_kg')
      .in('report_id', reportIds)
      .order('stop_number', { ascending: false });
    stopRecords = data || [];
  }

  // truck_id → branch名 のマップ（支店別集計用）
  const truckBranchMap = {};
  (trucks || []).forEach(t => {
    truckBranchMap[t.id] = t.branches?.name || '支店未設定';
  });

  // report_id → truck_id のマップ
  const reportTruckMap = {};
  (todayReports || []).forEach(r => { reportTruckMap[r.id] = r.truck_id; });

  // 支店別 配達済み集計
  const byBranch = {};
  stopRecords.filter(s => s.arrived_at).forEach(s => {
    const truckId = reportTruckMap[s.report_id];
    const branch  = truckBranchMap[truckId] || '—';
    if (!byBranch[branch]) byBranch[branch] = { count: 0, weight: 0 };
    byBranch[branch].count++;
    byBranch[branch].weight += s.weight_kg || 0;
  });

  renderDashboard(trucks || [], todayReports || [], stopRecords, byBranch);
}

function renderDashboard(trucks, todayReports, stopRecords, byBranch) {
  // truck_id → 本日の日報（active 優先。なければ completed）
  const reportByTruck = {};
  todayReports.forEach(r => {
    const cur = reportByTruck[r.truck_id];
    if (!cur || (r.status === 'active' && cur.status !== 'active')) {
      reportByTruck[r.truck_id] = r;
    }
  });

  // report_id → 最新 stop_record（stop_number 降順で先頭 = 最新）
  const latestStopByReport = {};
  stopRecords.forEach(s => {
    if (!latestStopByReport[s.report_id]) latestStopByReport[s.report_id] = s;
  });

  // テーブル行データを先に組み立て、カウントは同じデータから算出
  const truckRows = trucks.map(truck => {
    const report     = reportByTruck[truck.id];
    const latestStop = report ? latestStopByReport[report.id] : null;
    const st         = truckStatus(report, latestStop);
    return { truck, report, latestStop, st };
  });

  let countPre = 0, countMoving = 0, countReturned = 0;
  truckRows.forEach(({ st }) => {
    if (st === '出庫前' || st === '未出庫')     countPre++;
    if (st === '移動中' || st === '到着済み')   countMoving++;
    if (st === '帰社済')                       countReturned++;
  });

  // 日付ラベル
  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'short' });

  // 支店別 配達済み集計チップ
  const statsEl = document.getElementById('dash-branch-stats');
  const entries = Object.entries(byBranch);
  statsEl.innerHTML = entries.length === 0
    ? '<span style="color:#94a3b8;font-size:.82rem">配達済みなし</span>'
    : entries.map(([branch, s]) => `
        <span class="branch-stat-chip">
          <span class="bsc-name">${esc(branch)}</span>
          <span class="bsc-val"><span class="bsc-num">${s.count}</span>件</span>
          <span class="bsc-val"><span class="bsc-num">${s.weight.toFixed(1)}</span>kg</span>
        </span>`).join('');

  // サマリーカード
  setCount('count-predepart', countPre);
  setCount('count-moving',    countMoving);
  setCount('count-returned',  countReturned);

  // 更新時刻
  document.getElementById('dash-updated-at').textContent =
    '最終更新 ' + fmtTime(new Date().toISOString());

  // テーブル描画（truckRows をそのまま使う）
  const tbody = document.getElementById('vehicle-table-body');
  const rows = truckRows.map(({ truck, report, latestStop }) =>
    renderTruckRow(truck, report, latestStop)
  ).join('');

  tbody.innerHTML = `
    <table class="vt">
      <thead>
        <tr>
          <th>車輌</th>
          <th>支店</th>
          <th>コース</th>
          <th>ステータス</th>
          <th>現在地</th>
          <th>最終更新</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// 車輌1台分の行を描画
function renderTruckRow(truck, report, latestStop) {
  const st = truckStatus(report, latestStop);

  const badge = {
    '未出庫':   `<span class="status-badge" style="background:#f8fafc;color:#cbd5e1">—&nbsp;未出庫</span>`,
    '出庫前':   `<span class="status-badge predepart"><i class="bi bi-hourglass-split"></i> 出庫前</span>`,
    '移動中':   `<span class="status-badge moving"><i class="bi bi-truck"></i> 移動中</span>`,
    '到着済み': `<span class="status-badge arrived"><i class="bi bi-pin-map-fill"></i> 到着済み</span>`,
    '帰社済':   `<span class="status-badge returned"><i class="bi bi-house-check-fill"></i> 帰社済</span>`,
  }[st] || '';

  const dest = (st === '移動中' && latestStop?.destination_name)
    ? `<i class="bi bi-arrow-right me-1 text-muted"></i>${esc(latestStop.destination_name)}`
    : (st === '到着済み' && latestStop?.destination_name)
    ? esc(latestStop.destination_name)
    : '—';

  const lastAt = latestStop
    ? fmtTime(latestStop.arrived_at || latestStop.departed_at)
    : '—';

  const courseName = report?.courses?.name || '—';

  const branchName = truck.branches?.name || '—';

  return `
    <tr>
      <td class="vt-truck">${esc(truck.name)}</td>
      <td class="vt-course">${esc(branchName)}</td>
      <td class="vt-course">${esc(courseName)}</td>
      <td>${badge}</td>
      <td class="vt-dest">${dest}</td>
      <td class="vt-time">${lastAt}</td>
    </tr>`;
}

// 車輌ステータスを文字列で返す
function truckStatus(report, latestStop) {
  if (!report) return '未出庫';
  if (report.status === 'completed') return '帰社済';
  if (!latestStop) return '出庫前';
  if (latestStop.departed_at && !latestStop.arrived_at) return '移動中';
  if (latestStop.arrived_at) return '到着済み';
  return '出庫前';
}

function setCount(id, n) {
  document.getElementById(id).innerHTML = `${n}<span class="sc-unit">台</span>`;
}

// ════════════════════════════════════════════════════════
//  Realtime
// ════════════════════════════════════════════════════════
function subscribeRealtime() {
  db.channel('admin-dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stop_records' }, loadDashboard)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' },      loadDashboard)
    .subscribe();
}

// ════════════════════════════════════════════════════════
//  CSVダウンロード
// ════════════════════════════════════════════════════════

// CSV用 datetime フォーマット（YYYY/MM/DD HH:MM）
const fmtDatetime = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                 .replace(/\//g, '/');
  const time = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
};

// CSV フォーマット定義
const CSV_FORMATS = {
  journal: {
    label: 'journal',
    headers: ['日付', '支店', '車輌', 'コース', '出庫ODO', '帰社ODO', '走行距離(km)',
              '配達順', '配達先', '出発時刻', '到着時刻', '重量(kg)'],
    buildRows: (reports, stopRecords) => buildCsvRowsJournal(reports, stopRecords),
  },
  dest: {
    label: 'dest',
    headers: ['得意先名', '販売管理得意先コード', '配達件数', '総重量(kg)'],
    buildRows: (reports, stopRecords) => buildCsvRowsDest(reports, stopRecords),
  },
  truck: {
    label: 'truck',
    headers: ['日付', '支店', '車輌', 'コース', '出庫ODO', '帰社ODO', '走行距離(km)',
              '配達件数', '総重量(kg)'],
    buildRows: (reports, stopRecords) => buildCsvRowsTruck(reports, stopRecords),
  },
};

function getSelectedFormat() {
  const val = document.querySelector('input[name="csv-format"]:checked')?.value || 'journal';
  return CSV_FORMATS[val];
}

let csvAllTrucks = [];       // 全車輌キャッシュ
let csvCurrentRows = [];     // 最後にプレビューした行データ

// CSV セクション初期化（ページロード時 or 初回クリック時）
async function initCsvSection() {
  if (csvAllTrucks.length > 0) return;  // 初期化済み

  const now     = new Date();
  const y       = now.getFullYear();
  const m       = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
  document.getElementById('csv-date-from').value = `${y}-${m}-01`;
  document.getElementById('csv-date-to').value   = `${y}-${m}-${lastDay}`;

  const [{ data: branches }, { data: trucks }] = await Promise.all([
    db.from('branches').select('id, name').order('name'),
    db.from('trucks').select('id, name, branch_id').order('name'),
  ]);

  csvAllTrucks = trucks || [];

  const branchSel = document.getElementById('csv-branch');
  (branches || []).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id; opt.textContent = b.name;
    branchSel.appendChild(opt);
  });

  updateCsvTruckOptions('');

  branchSel.addEventListener('change', () => {
    updateCsvTruckOptions(branchSel.value);
  });
}

function updateCsvTruckOptions(branchId) {
  const sel = document.getElementById('csv-truck');
  sel.innerHTML = '<option value="">全車輌</option>';
  const filtered = branchId
    ? csvAllTrucks.filter(t => t.branch_id === branchId)
    : csvAllTrucks;
  filtered.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.name;
    sel.appendChild(opt);
  });
}

async function fetchCsvData() {
  const dateFrom = document.getElementById('csv-date-from').value;
  const dateTo   = document.getElementById('csv-date-to').value;
  const branchId = document.getElementById('csv-branch').value;
  const truckId  = document.getElementById('csv-truck').value;

  if (!dateFrom || !dateTo) {
    alert('日付範囲を入力してください');
    return null;
  }
  if (dateFrom > dateTo) {
    alert('開始日は終了日以前にしてください');
    return null;
  }

  // 支店フィルタ: 対象 truck_id を絞り込む
  let targetTruckIds = null;
  if (truckId) {
    targetTruckIds = [truckId];
  } else if (branchId) {
    targetTruckIds = csvAllTrucks
      .filter(t => t.branch_id === branchId)
      .map(t => t.id);
    if (targetTruckIds.length === 0) return { reports: [], stopRecords: [] };
  }

  let reportsQuery = db.from('reports')
    .select('id, date, truck_id, status, depart_odo, arrive_odo, trucks(name, branches(name)), courses(name)')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date')
    .order('truck_id');

  if (targetTruckIds) {
    reportsQuery = reportsQuery.in('truck_id', targetTruckIds);
  }

  const { data: reports, error: rErr } = await reportsQuery;
  if (rErr) { alert('取得エラー: ' + rErr.message); return null; }

  const reportIds = (reports || []).map(r => r.id);
  let stopRecords = [];
  if (reportIds.length) {
    const { data: stops, error: sErr } = await db
      .from('stop_records')
      .select('id, report_id, destination_name, stop_number, departed_at, arrived_at, weight_kg, course_stops(destinations(sales_customer_code))')
      .in('report_id', reportIds)
      .order('report_id')
      .order('stop_number');
    if (sErr) { alert('取得エラー: ' + sErr.message); return null; }
    stopRecords = stops || [];
  }

  return { reports: reports || [], stopRecords };
}

// ── ジャーナル形式: 1行 = 1 stop_record ──────────────
function buildCsvRowsJournal(reports, stopRecords) {
  const reportMap = {};
  reports.forEach(r => { reportMap[r.id] = r; });

  return stopRecords.map(s => {
    const r      = reportMap[s.report_id] || {};
    const truck  = r.trucks        || {};
    const branch = truck.branches  || {};
    const course = r.courses       || {};
    const dist   = (r.arrive_odo != null && r.depart_odo != null)
      ? (r.arrive_odo - r.depart_odo).toFixed(1) : '';

    return [
      r.date                         || '',
      branch.name                    || '',
      truck.name                     || '',
      course.name                    || '',
      r.depart_odo  != null ? r.depart_odo  : '',
      r.arrive_odo  != null ? r.arrive_odo  : '',
      dist,
      s.stop_number != null ? s.stop_number : '',
      s.destination_name             || '',
      fmtDatetime(s.departed_at),
      fmtDatetime(s.arrived_at),
      s.weight_kg   != null ? s.weight_kg   : '',
    ];
  });
}

// ── 得意先別集計: 1行 = 配達先ごとの合計（配達完了のみ） ──
function buildCsvRowsDest(reports, stopRecords) {
  const arrived = stopRecords.filter(s => s.arrived_at);
  const map = {};   // destination_name → { salesCode, count, weight }
  arrived.forEach(s => {
    const key = s.destination_name || '（不明）';
    if (!map[key]) map[key] = { salesCode: null, count: 0, weight: 0 };
    if (!map[key].salesCode)
      map[key].salesCode = s.course_stops?.destinations?.sales_customer_code || null;
    map[key].count++;
    map[key].weight += s.weight_kg || 0;
  });
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .map(([name, v]) => [name, v.salesCode || '', v.count, v.weight.toFixed(1)]);
}

// ── 車輌別集計: 1行 = 1日報（車輌×日付） ────────────────
function buildCsvRowsTruck(reports, stopRecords) {
  const byReport = {};  // report_id → { count, weight }
  stopRecords.filter(s => s.arrived_at).forEach(s => {
    if (!byReport[s.report_id]) byReport[s.report_id] = { count: 0, weight: 0 };
    byReport[s.report_id].count++;
    byReport[s.report_id].weight += s.weight_kg || 0;
  });

  return reports
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
    .map(r => {
      const truck  = r.trucks       || {};
      const branch = truck.branches || {};
      const course = r.courses      || {};
      const agg    = byReport[r.id] || { count: 0, weight: 0 };
      const dist   = (r.arrive_odo != null && r.depart_odo != null)
        ? (r.arrive_odo - r.depart_odo).toFixed(1) : '';

      return [
        r.date                        || '',
        branch.name                   || '',
        truck.name                    || '',
        course.name                   || '',
        r.depart_odo != null ? r.depart_odo : '',
        r.arrive_odo != null ? r.arrive_odo : '',
        dist,
        agg.count,
        agg.weight.toFixed(1),
      ];
    });
}

function toCsvString(headers, rows) {
  const escape = v => {
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map(row => row.map(escape).join(','));
  // BOM付きUTF-8（Excelで文字化けしないように）
  return '\uFEFF' + lines.join('\r\n');
}

function triggerCsvDownload(csvStr, filename) {
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderCsvPreview(headers, rows) {
  const wrap = document.getElementById('csv-preview-wrap');
  const total = rows.length;

  if (total === 0) {
    wrap.innerHTML = `
      <div class="csv-empty">
        <span class="ce-icon"><i class="bi bi-inbox"></i></span>
        該当データがありません
      </div>`;
    return;
  }

  const preview = rows.slice(0, 100);
  const metaText = total > 100
    ? `${total} 件中 最初の 100 件を表示`
    : `${total} 件`;

  const headerHtml = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const rowsHtml = preview.map(r =>
    `<tr>${r.map(c => `<td>${esc(String(c))}</td>`).join('')}</tr>`
  ).join('');

  wrap.innerHTML = `
    <div class="csv-preview-header">
      <span class="pv-title"><i class="bi bi-table"></i> プレビュー</span>
      <span class="pv-meta">${metaText}</span>
    </div>
    <div class="csv-preview-body">
      <table class="csv-pv">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

document.getElementById('btn-csv-preview').addEventListener('click', async () => {
  await initCsvSection();
  const btnPv = document.getElementById('btn-csv-preview');
  const btnDl = document.getElementById('btn-csv-download');
  btnPv.disabled = true;
  btnPv.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>';

  const data = await fetchCsvData();
  btnPv.disabled = false;
  btnPv.innerHTML = '<i class="bi bi-eye"></i> プレビュー';

  if (!data) return;

  const fmt = getSelectedFormat();
  csvCurrentRows = fmt.buildRows(data.reports, data.stopRecords);
  renderCsvPreview(fmt.headers, csvCurrentRows);
  btnDl.disabled = (csvCurrentRows.length === 0);
});

document.getElementById('btn-csv-download').addEventListener('click', () => {
  if (!csvCurrentRows.length) return;
  const fmt      = getSelectedFormat();
  const dateFrom = document.getElementById('csv-date-from').value;
  const dateTo   = document.getElementById('csv-date-to').value;
  const filename = `truck_tracker_${fmt.label}_${dateFrom}_${dateTo}.csv`;
  triggerCsvDownload(toCsvString(fmt.headers, csvCurrentRows), filename);
});

// CSVセクション選択時に初期化
document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
  if (btn.dataset.section === 'csv') {
    btn.addEventListener('click', () => initCsvSection(), { once: true });
  }
});

// 種類変更時にプレビューをリセット
document.querySelectorAll('input[name="csv-format"]').forEach(radio => {
  radio.addEventListener('change', () => {
    csvCurrentRows = [];
    document.getElementById('btn-csv-download').disabled = true;
    document.getElementById('csv-preview-wrap').innerHTML = `
      <div class="csv-empty">
        <span class="ce-icon"><i class="bi bi-table"></i></span>
        フィルタを設定して「プレビュー」を押してください
      </div>`;
  });
});

// ════════════════════════════════════════════════════════
//  レポート
// ════════════════════════════════════════════════════════
let analyticsReady = false;
let chartDistance = null, chartWeight = null, chartTrips = null;

async function initAnalytics() {
  if (!analyticsReady) {
    const { data: branches } = await db.from('branches').select('id, name').order('name');
    const sel = document.getElementById('analytics-branch');
    (branches || []).forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', loadAnalyticsData);
    analyticsReady = true;
  }
  loadAnalyticsData();
}

async function loadAnalyticsData() {
  const branchId = document.getElementById('analytics-branch').value;

  // 直近30日のラベル生成
  const labels = [], dateMap = {};
  const baseDate = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const s = d.toLocaleDateString('sv');
    labels.push(s.slice(5).replace('-', '/'));
    dateMap[s] = 29 - i;
  }
  const startStr = Object.keys(dateMap)[0];
  const endStr   = Object.keys(dateMap)[29];

  // reports + truck の branch_id を取得
  const { data: reports } = await db
    .from('reports')
    .select('id, date, depart_odo, arrive_odo, trucks(id, branch_id)')
    .gte('date', startStr)
    .lte('date', endStr);

  // 支店フィルタ
  const filtered = (reports || []).filter(r =>
    !branchId || r.trucks?.branch_id === branchId
  );

  // stop_records の weight_kg を取得
  const reportIds = filtered.map(r => r.id);
  let weightByReport = {};
  if (reportIds.length) {
    const { data: stops } = await db
      .from('stop_records')
      .select('report_id, weight_kg')
      .in('report_id', reportIds);
    (stops || []).forEach(s => {
      if (s.weight_kg != null)
        weightByReport[s.report_id] = (weightByReport[s.report_id] || 0) + s.weight_kg;
    });
  }

  // 日別集計
  const distData   = new Array(30).fill(0);
  const weightData = new Array(30).fill(0);
  const tripsData  = new Array(30).fill(0);

  filtered.forEach(r => {
    const idx = dateMap[r.date];
    if (idx == null) return;
    tripsData[idx]++;
    if (r.arrive_odo != null && r.depart_odo != null)
      distData[idx] = Math.round((distData[idx] + (r.arrive_odo - r.depart_odo)) * 10) / 10;
    weightData[idx] = Math.round((weightData[idx] + (weightByReport[r.id] || 0)) * 10) / 10;
  });

  renderAnalyticsCharts(labels, distData, weightData, tripsData);
}

function renderAnalyticsCharts(labels, distData, weightData, tripsData) {
  const scaleOpts = {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
    y: { beginAtZero: true, ticks: { font: { size: 11 } } }
  };

  if (chartDistance) chartDistance.destroy();
  chartDistance = new Chart(document.getElementById('chart-distance'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: distData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,.1)',
        fill: true, tension: .3, pointRadius: 2, pointHoverRadius: 5
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: scaleOpts }
  });

  if (chartWeight) chartWeight.destroy();
  chartWeight = new Chart(document.getElementById('chart-weight'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: weightData, backgroundColor: '#8b5cf6', borderRadius: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: scaleOpts }
  });

  if (chartTrips) chartTrips.destroy();
  chartTrips = new Chart(document.getElementById('chart-trips'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: tripsData, backgroundColor: '#10b981', borderRadius: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: scaleOpts }
  });
}

// ════════════════════════════════════════════════════════
//  マスタ管理 — 共通
// ════════════════════════════════════════════════════════
const SECTION_ON_ENTER = {
  'analytics':           initAnalytics,
  'master-branches':     loadMasterBranches,
  'master-trucks':       loadMasterTrucks,
  'master-destinations': loadMasterDestinations,
  'master-courses':      loadMasterCourses,
  'master-stops':        loadMasterStops,
};

const masterModal  = new bootstrap.Modal(document.getElementById('masterModal'), { backdrop: 'static' });
let mSaveHandler   = null;

document.getElementById('btn-master-save').addEventListener('click', async () => {
  if (!mSaveHandler) return;
  const btn = document.getElementById('btn-master-save');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>保存中...';
  await mSaveHandler();
  btn.disabled = false;
  btn.innerHTML = '保存';
});

function showModal(title, bodyHtml, onSave) {
  document.getElementById('masterModalTitle').textContent = title;
  document.getElementById('masterModalBody').innerHTML = bodyHtml;
  document.getElementById('master-modal-err').textContent = '';
  mSaveHandler = onSave;
  masterModal.show();
  setTimeout(() => document.querySelector('#masterModalBody input, #masterModalBody select')?.focus(), 300);
}

function modalErr(msg) {
  document.getElementById('master-modal-err').textContent = msg;
}

function branchOpts(branches, selectedId) {
  return branches.map(b =>
    `<option value="${b.id}" ${b.id === selectedId ? 'selected' : ''}>${esc(b.name)}</option>`
  ).join('');
}

function destOpts(destinations, selectedId) {
  return destinations.map(d =>
    `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${esc(d.name)}</option>`
  ).join('');
}

// ── 支店 ────────────────────────────────────────────────
let mBranches = [];

async function loadMasterBranches() {
  document.getElementById('branches-table-body').innerHTML =
    '<div class="master-loading"><span class="spinner-border spinner-border-sm"></span></div>';
  const { data } = await db.from('branches').select('id, name').order('name');
  mBranches = data || [];
  renderMasterBranches();
}

function renderMasterBranches() {
  const el = document.getElementById('branches-table-body');
  if (!mBranches.length) { el.innerHTML = '<div class="master-empty">データがありません</div>'; return; }
  el.innerHTML = `<table class="master-table">
    <thead><tr><th>支店名</th><th></th></tr></thead>
    <tbody>${mBranches.map(b => `<tr>
      <td>${esc(b.name)}</td>
      <td class="master-actions">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editBranch('${b.id}')">編集</button>
        <button class="btn btn-sm btn-outline-danger"         onclick="deleteBranch('${b.id}')">削除</button>
      </td></tr>`).join('')}
    </tbody></table>`;
}

document.getElementById('btn-add-branch').addEventListener('click', () => {
  showModal('支店を追加',
    `<div class="mb-3"><label class="form-label fw-semibold">支店名</label>
     <input type="text" id="m-name" class="form-control" placeholder="例: 東京支店"></div>`,
    async () => {
      const name = document.getElementById('m-name').value.trim();
      if (!name) { modalErr('支店名を入力してください'); return; }
      const { error } = await db.from('branches').insert({ name });
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterBranches();
    });
});

function editBranch(id) {
  const b = mBranches.find(x => x.id === id); if (!b) return;
  showModal('支店を編集',
    `<div class="mb-3"><label class="form-label fw-semibold">支店名</label>
     <input type="text" id="m-name" class="form-control" value="${esc(b.name)}"></div>`,
    async () => {
      const name = document.getElementById('m-name').value.trim();
      if (!name) { modalErr('支店名を入力してください'); return; }
      const { error } = await db.from('branches').update({ name }).eq('id', id);
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterBranches();
    });
}

async function deleteBranch(id) {
  if (!confirm('削除しますか？\n関連する車輌・コースの支店設定が解除されます。')) return;
  const { error } = await db.from('branches').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  mBranches = mBranches.filter(b => b.id !== id);
  renderMasterBranches();
}

// ── 車輌 ────────────────────────────────────────────────
let mTrucks = [];

async function loadMasterTrucks() {
  document.getElementById('trucks-table-body').innerHTML =
    '<div class="master-loading"><span class="spinner-border spinner-border-sm"></span></div>';
  const { data } = await db.from('trucks').select('id, name, branch_id, max_load, branches(name)').order('name');
  mTrucks = data || [];
  renderMasterTrucks();
}

function renderMasterTrucks() {
  const el = document.getElementById('trucks-table-body');
  if (!mTrucks.length) { el.innerHTML = '<div class="master-empty">データがありません</div>'; return; }
  el.innerHTML = `<table class="master-table">
    <thead><tr><th>車輌名</th><th>最大積載量</th><th>支店</th><th></th></tr></thead>
    <tbody>${mTrucks.map(t => `<tr>
      <td>${esc(t.name)}</td>
      <td style="color:#64748b;font-size:.82rem">${t.max_load != null ? esc(String(t.max_load)) + 't' : '—'}</td>
      <td style="color:#64748b;font-size:.82rem">${esc(t.branches?.name || '—')}</td>
      <td class="master-actions">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editTruck('${t.id}')">編集</button>
        <button class="btn btn-sm btn-outline-danger"         onclick="deleteTruck('${t.id}')">削除</button>
      </td></tr>`).join('')}
    </tbody></table>`;
}

document.getElementById('btn-add-truck').addEventListener('click', async () => {
  if (!mBranches.length) { const { data } = await db.from('branches').select('id,name').order('name'); mBranches = data || []; }
  showModal('車輌を追加',
    `<div class="mb-3"><label class="form-label fw-semibold">車輌名</label>
     <input type="text" id="m-name" class="form-control" placeholder="例: 1号車"></div>
     <div class="mb-3"><label class="form-label fw-semibold">最大積載量 (t)</label>
     <input type="number" id="m-maxload" class="form-control" placeholder="例: 2.0" step="0.01" min="0"></div>
     <div class="mb-3"><label class="form-label fw-semibold">支店</label>
     <select id="m-branch" class="form-select"><option value="">（なし）</option>${branchOpts(mBranches,'')}</select></div>`,
    async () => {
      const name      = document.getElementById('m-name').value.trim();
      const max_load  = document.getElementById('m-maxload').value !== '' ? parseFloat(document.getElementById('m-maxload').value) : null;
      const branch_id = document.getElementById('m-branch').value || null;
      if (!name) { modalErr('車輌名を入力してください'); return; }
      const { error } = await db.from('trucks').insert({ name, branch_id, max_load });
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterTrucks();
    });
});

function editTruck(id) {
  const t = mTrucks.find(x => x.id === id); if (!t) return;
  showModal('車輌を編集',
    `<div class="mb-3"><label class="form-label fw-semibold">車輌名</label>
     <input type="text" id="m-name" class="form-control" value="${esc(t.name)}"></div>
     <div class="mb-3"><label class="form-label fw-semibold">最大積載量 (t)</label>
     <input type="number" id="m-maxload" class="form-control" value="${t.max_load != null ? t.max_load : ''}" step="0.01" min="0"></div>
     <div class="mb-3"><label class="form-label fw-semibold">支店</label>
     <select id="m-branch" class="form-select"><option value="">（なし）</option>${branchOpts(mBranches, t.branch_id)}</select></div>`,
    async () => {
      const name      = document.getElementById('m-name').value.trim();
      const max_load  = document.getElementById('m-maxload').value !== '' ? parseFloat(document.getElementById('m-maxload').value) : null;
      const branch_id = document.getElementById('m-branch').value || null;
      if (!name) { modalErr('車輌名を入力してください'); return; }
      const { error } = await db.from('trucks').update({ name, branch_id, max_load }).eq('id', id);
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterTrucks();
    });
}

async function deleteTruck(id) {
  if (!confirm('削除しますか？')) return;
  const { error } = await db.from('trucks').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  mTrucks = mTrucks.filter(t => t.id !== id);
  renderMasterTrucks();
}

// ── 配達先 ────────────────────────────────────────────────
let mDestinations = [];

async function loadMasterDestinations() {
  document.getElementById('destinations-table-body').innerHTML =
    '<div class="master-loading"><span class="spinner-border spinner-border-sm"></span></div>';
  const { data } = await db.from('destinations').select('id, name, address, sales_customer_code').order('name');
  mDestinations = data || [];
  renderMasterDestinations();
}

function renderMasterDestinations() {
  const el = document.getElementById('destinations-table-body');
  if (!mDestinations.length) { el.innerHTML = '<div class="master-empty">データがありません</div>'; return; }
  el.innerHTML = `<table class="master-table">
    <thead><tr><th>配達先名</th><th>住所</th><th>販売管理 得意先コード</th><th></th></tr></thead>
    <tbody>${mDestinations.map(d => `<tr>
      <td>${esc(d.name)}</td>
      <td style="color:#64748b;font-size:.8rem">${esc(d.address || '—')}</td>
      <td style="color:#64748b;font-size:.8rem;font-family:monospace">${esc(d.sales_customer_code || '—')}</td>
      <td class="master-actions">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editDestination('${d.id}')">編集</button>
        <button class="btn btn-sm btn-outline-danger"         onclick="deleteDestination('${d.id}')">削除</button>
      </td></tr>`).join('')}
    </tbody></table>`;
}

document.getElementById('btn-add-destination').addEventListener('click', () => {
  showModal('配達先を追加',
    `<div class="mb-3"><label class="form-label fw-semibold">配達先名</label>
     <input type="text" id="m-name" class="form-control" placeholder="例: 株式会社〇〇"></div>
     <div class="mb-3"><label class="form-label fw-semibold">住所 <span class="text-muted fw-normal small">(任意)</span></label>
     <input type="text" id="m-address" class="form-control" placeholder="例: 東京都千代田区..."></div>
     <div class="mb-3"><label class="form-label fw-semibold">販売管理 得意先コード <span class="text-muted fw-normal small">(任意)</span></label>
     <input type="text" id="m-sales-code" class="form-control" placeholder="例: C00123"></div>`,
    async () => {
      const name               = document.getElementById('m-name').value.trim();
      const address            = document.getElementById('m-address').value.trim() || null;
      const sales_customer_code = document.getElementById('m-sales-code').value.trim() || null;
      if (!name) { modalErr('配達先名を入力してください'); return; }
      const { error } = await db.from('destinations').insert({ name, address, sales_customer_code });
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterDestinations();
    });
});

function editDestination(id) {
  const d = mDestinations.find(x => x.id === id); if (!d) return;
  showModal('配達先を編集',
    `<div class="mb-3"><label class="form-label fw-semibold">配達先名</label>
     <input type="text" id="m-name" class="form-control" value="${esc(d.name)}"></div>
     <div class="mb-3"><label class="form-label fw-semibold">住所 <span class="text-muted fw-normal small">(任意)</span></label>
     <input type="text" id="m-address" class="form-control" value="${esc(d.address || '')}"></div>
     <div class="mb-3"><label class="form-label fw-semibold">販売管理 得意先コード <span class="text-muted fw-normal small">(任意)</span></label>
     <input type="text" id="m-sales-code" class="form-control" value="${esc(d.sales_customer_code || '')}"></div>`,
    async () => {
      const name               = document.getElementById('m-name').value.trim();
      const address            = document.getElementById('m-address').value.trim() || null;
      const sales_customer_code = document.getElementById('m-sales-code').value.trim() || null;
      if (!name) { modalErr('配達先名を入力してください'); return; }
      const { error } = await db.from('destinations').update({ name, address, sales_customer_code }).eq('id', id);
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterDestinations();
    });
}

async function deleteDestination(id) {
  if (!confirm('削除しますか？\nコースに設定されている場合は削除できません。')) return;
  const { error } = await db.from('destinations').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  mDestinations = mDestinations.filter(d => d.id !== id);
  renderMasterDestinations();
}

// ── コース ────────────────────────────────────────────────
const DOW_NAMES = ['', '月', '火', '水', '木', '金', '土', '日']; // index 1-7

function dowLabel(arr) {
  if (!arr) return '毎日';              // NULL = 後方互換で毎日
  if (!arr.length) return '実施なし';   // 空配列 = 実施なし
  if (arr.length === 7) return '毎日';  // 全曜日 = 毎日
  return [...arr].sort((a, b) => a - b).map(d => DOW_NAMES[d]).join('・');
}

function dowCheckboxes(selected) {
  return [1, 2, 3, 4, 5, 6, 7].map(d =>
    `<div class="form-check form-check-inline">
       <input class="form-check-input" type="checkbox" id="m-day-${d}" value="${d}"${selected?.includes(d) ? ' checked' : ''}>
       <label class="form-check-label" for="m-day-${d}">${DOW_NAMES[d]}</label>
     </div>`
  ).join('');
}

function getCheckedDows() {
  // 空配列 = 実施なし、[1..7] = 毎日、部分選択 = 特定曜日
  return [1, 2, 3, 4, 5, 6, 7].filter(d => document.getElementById(`m-day-${d}`)?.checked);
}

let mCourses = [];

async function loadMasterCourses() {
  document.getElementById('courses-table-body').innerHTML =
    '<div class="master-loading"><span class="spinner-border spinner-border-sm"></span></div>';
  const { data } = await db.from('courses').select('id, name, branch_id, day_of_week, branches(name)').order('name');
  mCourses = data || [];
  renderMasterCourses();
}

function renderMasterCourses() {
  const el = document.getElementById('courses-table-body');
  if (!mCourses.length) { el.innerHTML = '<div class="master-empty">データがありません</div>'; return; }
  el.innerHTML = `<table class="master-table">
    <thead><tr><th>コース名</th><th>支店</th><th>運行曜日</th><th></th></tr></thead>
    <tbody>${mCourses.map(c => `<tr>
      <td>${esc(c.name)}</td>
      <td style="color:#64748b;font-size:.82rem">${esc(c.branches?.name || '—')}</td>
      <td style="color:#64748b;font-size:.82rem">${esc(dowLabel(c.day_of_week))}</td>
      <td class="master-actions">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editCourse('${c.id}')">編集</button>
        <button class="btn btn-sm btn-outline-danger"         onclick="deleteCourse('${c.id}')">削除</button>
      </td></tr>`).join('')}
    </tbody></table>`;
}

document.getElementById('btn-add-course').addEventListener('click', async () => {
  if (!mBranches.length) { const { data } = await db.from('branches').select('id,name').order('name'); mBranches = data || []; }
  showModal('コースを追加',
    `<div class="mb-3"><label class="form-label fw-semibold">コース名</label>
     <input type="text" id="m-name" class="form-control" placeholder="例: Aコース"></div>
     <div class="mb-3"><label class="form-label fw-semibold">支店</label>
     <select id="m-branch" class="form-select"><option value="">（なし）</option>${branchOpts(mBranches,'')}</select></div>
     <div class="mb-3"><label class="form-label fw-semibold d-block">運行曜日</label>
     ${dowCheckboxes(null)}
     <div class="form-text">チェックなし = 実施なし　全チェック = 毎日実施</div></div>`,
    async () => {
      const name        = document.getElementById('m-name').value.trim();
      const branch_id   = document.getElementById('m-branch').value || null;
      const day_of_week = getCheckedDows();
      if (!name) { modalErr('コース名を入力してください'); return; }
      const { error } = await db.from('courses').insert({ name, branch_id, day_of_week });
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterCourses();
    });
});

async function editCourse(id) {
  const c = mCourses.find(x => x.id === id); if (!c) return;
  if (!mBranches.length) { const { data } = await db.from('branches').select('id,name').order('name'); mBranches = data || []; }
  showModal('コースを編集',
    `<div class="mb-3"><label class="form-label fw-semibold">コース名</label>
     <input type="text" id="m-name" class="form-control" value="${esc(c.name)}"></div>
     <div class="mb-3"><label class="form-label fw-semibold">支店</label>
     <select id="m-branch" class="form-select"><option value="">（なし）</option>${branchOpts(mBranches, c.branch_id)}</select></div>
     <div class="mb-3"><label class="form-label fw-semibold d-block">運行曜日</label>
     ${dowCheckboxes(c.day_of_week)}
     <div class="form-text">チェックなし = 実施なし　全チェック = 毎日実施</div></div>`,
    async () => {
      const name        = document.getElementById('m-name').value.trim();
      const branch_id   = document.getElementById('m-branch').value || null;
      const day_of_week = getCheckedDows();
      if (!name) { modalErr('コース名を入力してください'); return; }
      const { error } = await db.from('courses').update({ name, branch_id, day_of_week }).eq('id', id);
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadMasterCourses();
    });
}

async function deleteCourse(id) {
  if (!confirm('削除しますか？\nこのコースの配達先リストもすべて削除されます。')) return;
  const { error } = await db.from('courses').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  mCourses = mCourses.filter(c => c.id !== id);
  renderMasterCourses();
}

// ── コース配達先 ────────────────────────────────────────────────
let mStops        = [];
let mStopsCourseId = '';

async function loadMasterStops() {
  // コースセレクトを初期化（未設定の場合のみ）
  const sel = document.getElementById('stops-course-sel');
  if (sel.options.length <= 1) {
    let courses = mCourses;
    if (!courses.length) {
      const { data } = await db.from('courses').select('id, name, day_of_week').order('name');
      courses = data || [];
    }
    sel.innerHTML = '<option value="">コースを選択...</option>';
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.day_of_week?.length ? `${c.name}（${dowLabel(c.day_of_week)}）` : c.name;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      mStopsCourseId = sel.value;
      document.getElementById('btn-add-stop').disabled = !mStopsCourseId;
      if (mStopsCourseId) loadStopsForCourse(mStopsCourseId);
      else document.getElementById('stops-table-body').innerHTML = '<div class="master-empty">コースを選択してください</div>';
    });
  }
  if (mStopsCourseId) await loadStopsForCourse(mStopsCourseId);
}

async function loadStopsForCourse(courseId) {
  document.getElementById('stops-table-body').innerHTML =
    '<div class="master-loading"><span class="spinner-border spinner-border-sm"></span></div>';
  const { data } = await db
    .from('course_stops')
    .select('id, stop_order, destination_id, destinations(name)')
    .eq('course_id', courseId)
    .order('stop_order');
  mStops = data || [];
  renderMasterStops();
}

function renderMasterStops() {
  const el = document.getElementById('stops-table-body');
  if (!mStops.length) { el.innerHTML = '<div class="master-empty">配達先が登録されていません</div>'; return; }
  el.innerHTML = `<table class="master-table">
    <thead><tr><th style="width:60px">順番</th><th>配達先</th><th></th></tr></thead>
    <tbody>${mStops.map((s, i) => `<tr>
      <td style="font-weight:700;color:#6b7280">${s.stop_order}</td>
      <td>${esc(s.destinations?.name || '—')}</td>
      <td class="master-actions">
        <button class="order-btn me-1" title="上へ" onclick="moveStop('${s.id}','up')"   ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="order-btn me-2" title="下へ" onclick="moveStop('${s.id}','down')" ${i === mStops.length - 1 ? 'disabled' : ''}>▼</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteStop('${s.id}')">削除</button>
      </td></tr>`).join('')}
    </tbody></table>`;
}

document.getElementById('btn-add-stop').addEventListener('click', async () => {
  if (!mDestinations.length) {
    const { data } = await db.from('destinations').select('id, name').order('name');
    mDestinations = data || [];
  }
  if (!mDestinations.length) { alert('先に配達先マスタを登録してください'); return; }
  // 既に登録済みの destination_id を除外
  const usedIds = new Set(mStops.map(s => s.destination_id));
  const available = mDestinations.filter(d => !usedIds.has(d.id));
  if (!available.length) { alert('このコースにすべての配達先が登録済みです'); return; }
  showModal('配達先を追加',
    `<div class="mb-3"><label class="form-label fw-semibold">配達先</label>
     <select id="m-dest" class="form-select"><option value="">選択...</option>${destOpts(available,'')}</select></div>`,
    async () => {
      const destination_id = document.getElementById('m-dest').value;
      if (!destination_id) { modalErr('配達先を選択してください'); return; }
      const nextOrder = mStops.length ? Math.max(...mStops.map(s => s.stop_order)) + 1 : 1;
      const { error } = await db.from('course_stops').insert({
        course_id: mStopsCourseId,
        destination_id,
        stop_order: nextOrder,
      });
      if (error) { modalErr(error.message); return; }
      masterModal.hide();
      await loadStopsForCourse(mStopsCourseId);
    });
});

async function moveStop(id, direction) {
  const idx     = mStops.findIndex(s => s.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= mStops.length) return;
  const s1 = mStops[idx], s2 = mStops[swapIdx];
  const [r1, r2] = await Promise.all([
    db.from('course_stops').update({ stop_order: s2.stop_order }).eq('id', s1.id),
    db.from('course_stops').update({ stop_order: s1.stop_order }).eq('id', s2.id),
  ]);
  if (r1.error || r2.error) { alert('並び替えに失敗しました'); return; }
  await loadStopsForCourse(mStopsCourseId);
}

async function deleteStop(id) {
  if (!confirm('削除しますか？')) return;
  const { error } = await db.from('course_stops').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      alert('この配達先には配送実績があるため削除できません。\n（stop_records に記録が残っています）');
    } else {
      alert(error.message);
    }
    return;
  }
  await loadStopsForCourse(mStopsCourseId);
}

// ════════════════════════════════════════════════════════
//  起動
// ════════════════════════════════════════════════════════
document.getElementById('btn-dash-refresh').addEventListener('click', loadDashboard);

loadDashboard();
subscribeRealtime();
