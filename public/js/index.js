// ════════════════════════════════════════════════════════
//  初期化
// ════════════════════════════════════════════════════════
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const LS_KEY = 'tt_report_id';

const S = {
  screen: 'init',
  mode: 'free',             // 'free' | 'planned'
  _selectTab: 'plan',       // 選択画面のアクティブタブ
  branches: [],
  trucks: [],
  courses: [],
  courseStops: [],          // フリーモード: course_stops
  plannedStopRecords: [],   // 計画モード: stop_records（事前作成済み）
  todayPlans: [],           // 本日の planned reports（選択画面用）
  completedStopIds: new Set(), // フリー: course_stop_id / 計画: stop_record_id
  report: null,
  currentRec: null,
  completedRecs: [],
  truckName: '',
  courseName: '',
};

let elapsedTimer = null;

// ════════════════════════════════════════════════════════
//  ルーティング
// ════════════════════════════════════════════════════════
function setScreen(name) {
  S.screen = name;
  if (elapsedTimer && name !== 'in_transit') {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
  render();
}

function render() {
  const main = document.getElementById('main');
  switch (S.screen) {
    case 'init':       main.innerHTML = renderLoading();   break;
    case 'select':     main.innerHTML = renderSelect();    bindSelect();    break;
    case 'pre_depart': main.innerHTML = renderPreDepart(); bindPreDepart(); break;
    case 'in_transit': main.innerHTML = renderInTransit(); bindInTransit(); break;
    case 'arrived':    main.innerHTML = renderArrived();   bindArrived();   break;
    case 'return':     main.innerHTML = renderReturn();    bindReturn();    break;
    case 'completed':  main.innerHTML = renderCompleted(); bindCompleted(); break;
  }
}

// ════════════════════════════════════════════════════════
//  SCREEN: ローディング
// ════════════════════════════════════════════════════════
function renderLoading() {
  return `
    <div class="loading-screen">
      <div class="spinner-border text-primary" style="width:2.5rem;height:2.5rem;" role="status"></div>
      <span>読み込み中...</span>
    </div>`;
}

// ════════════════════════════════════════════════════════
//  SCREEN: 選択（タブ: 計画 / フリー）
// ════════════════════════════════════════════════════════

const DOW_NAMES = ['', '月', '火', '水', '木', '金', '土', '日'];
function dowLabel(arr) {
  if (!arr || !arr.length) return null;
  if (arr.length === 7) return '毎日';
  return [...arr].sort((a, b) => a - b).map(d => DOW_NAMES[d]).join('・');
}

function filterByDow(courses, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const iso = dow === 0 ? 7 : dow;
  return courses.filter(c => {
    if (!c.day_of_week) return true;
    if (!c.day_of_week.length) return false;
    return c.day_of_week.includes(iso);
  });
}

function renderSelect() {
  const isplan = S._selectTab !== 'free';

  // ── フリータブ用オプション ──
  const firstBranchId = S.branches[0]?.id || '';
  const tOpts = S.trucks
    .filter(t => !firstBranchId || t.branch_id === firstBranchId)
    .map(t => `<option value="${t.id}">${esc(t.name)}${t.max_load != null ? ` (${t.max_load}t)` : ''}</option>`).join('');
  const cOpts = filterByDow(S.courses, today())
    .filter(c => !firstBranchId || c.branch_id === firstBranchId)
    .map(c => { const lbl = dowLabel(c.day_of_week); return `<option value="${c.id}">${esc(c.name)}${lbl ? `（${lbl}）` : ''}</option>`; }).join('');
  const bOpts = S.branches.map(b =>
    `<option value="${b.id}">${esc(b.name)}</option>`).join('');

  // ── 計画タブ: 今日の計画リスト ──
  const tOptsPlan = S.trucks
    .map(t => `<option value="${t.id}">${esc(t.name)}${t.max_load != null ? ` (${t.max_load}t)` : ''}</option>`).join('');

  const planRows = S.todayPlans.length
    ? S.todayPlans.map(p => `
        <label class="plan-card" for="plan-radio-${p.id}">
          <div class="plan-card-info">
            <div class="plan-card-name"><i class="bi bi-signpost-2 me-1 text-primary"></i>${esc(p.courses?.name || '—')}</div>
            ${p._stopCount != null ? `<div class="plan-card-meta">${p._stopCount}件の配達先</div>` : ''}
          </div>
          <input type="radio" id="plan-radio-${p.id}" name="sel-plan" value="${p.id}" class="plan-radio">
        </label>`).join('')
    : `<div class="plan-empty"><i class="bi bi-inbox me-2"></i>本日の計画がありません<br><small class="text-muted">管理者に計画の作成を依頼してください</small></div>`;

  return `
    <div class="screen">
      <div class="page-title">
        <i class="bi bi-clipboard-plus text-primary"></i>
        日報を開始
      </div>

      <div class="mode-tabs">
        <button class="mode-tab ${isplan ? 'active' : ''}" data-tab="plan">
          <i class="bi bi-calendar-check"></i> 計画から選択
        </button>
        <button class="mode-tab ${!isplan ? 'active' : ''}" data-tab="free">
          <i class="bi bi-pencil-square"></i> フリー入力
        </button>
      </div>

      <!-- 計画タブ -->
      <div id="tab-plan" ${isplan ? '' : 'style="display:none"'}>
        <div class="section-label"><i class="bi bi-calendar3 me-1"></i>${today()} の配送計画</div>
        <div class="plan-list">${planRows}</div>

        ${S.todayPlans.length ? `
        <div>
          <div class="section-label"><i class="bi bi-truck me-1"></i>車輌</div>
          <select id="sel-plan-truck" class="form-select">${tOptsPlan}</select>
        </div>` : ''}
      </div>

      <!-- フリータブ -->
      <div id="tab-free" ${!isplan ? '' : 'style="display:none"'}>
        ${S.branches.length ? `
        <div>
          <div class="section-label"><i class="bi bi-building me-1"></i>支店</div>
          <select id="sel-branch" class="form-select">${bOpts}</select>
        </div>` : ''}

        <div>
          <div class="section-label"><i class="bi bi-truck me-1"></i>車輌</div>
          <select id="sel-truck" class="form-select">${tOpts}</select>
        </div>

        <div>
          <div class="section-label"><i class="bi bi-calendar3 me-1"></i>日付</div>
          <input type="date" id="sel-date" class="form-control" value="${today()}">
        </div>

        <div>
          <div class="section-label"><i class="bi bi-signpost-2 me-1"></i>配送コース</div>
          <select id="sel-course" class="form-select">${cOpts}</select>
        </div>
      </div>

      <div id="err"></div>
      <div class="mt-auto pt-2">
        <button class="btn-action btn-primary" id="btn-next">
          次へ <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>`;
}

function bindSelect() {
  // タブ切り替え
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      S._selectTab = btn.dataset.tab;
      render();
    });
  });

  // フリータブ: 支店変更で車輌・コース連動
  function refreshFreeCourses() {
    const branchId = $('sel-branch')?.value || '';
    const date     = $('sel-date')?.value || today();
    if (!$('sel-course')) return;
    $('sel-course').innerHTML = filterByDow(S.courses, date)
      .filter(c => !branchId || c.branch_id === branchId)
      .map(c => { const lbl = dowLabel(c.day_of_week); return `<option value="${c.id}">${esc(c.name)}${lbl ? `（${lbl}）` : ''}</option>`; })
      .join('');
  }

  if ($('sel-branch')) {
    $('sel-branch').addEventListener('change', () => {
      const branchId = $('sel-branch').value;
      if ($('sel-truck')) {
        $('sel-truck').innerHTML = S.trucks
          .filter(t => t.branch_id === branchId)
          .map(t => `<option value="${t.id}">${esc(t.name)}${t.max_load != null ? ` (${t.max_load}t)` : ''}</option>`)
          .join('');
      }
      refreshFreeCourses();
    });
  }
  if ($('sel-date')) $('sel-date').addEventListener('change', refreshFreeCourses);

  $('btn-next').addEventListener('click', async () => {
    setBusy('btn-next', true);

    if (S._selectTab === 'plan') {
      // ── 計画モード ──
      const selectedRadio = document.querySelector('input[name="sel-plan"]:checked');
      if (!selectedRadio) { showErr('計画を選択してください'); setBusy('btn-next', false); return; }
      const planId  = selectedRadio.value;
      const truckId = $('sel-plan-truck')?.value;
      if (!truckId) { showErr('車輌を選択してください'); setBusy('btn-next', false); return; }

      const { error: uErr } = await db
        .from('reports')
        .update({ truck_id: truckId, status: 'active' })
        .eq('id', planId);

      if (uErr) { showErr(uErr.message); setBusy('btn-next', false); return; }

      const { data: report } = await db
        .from('reports')
        .select('*, trucks(name), courses(name)')
        .eq('id', planId)
        .single();

      localStorage.setItem(LS_KEY, planId);
      S.report     = report;
      S.mode       = 'planned';
      S.truckName  = report.trucks?.name  || '';
      S.courseName = report.courses?.name || '';
      S.completedStopIds.clear();
      S.currentRec   = null;
      S.completedRecs = [];

      await loadPlannedStopRecords(planId);
      setScreen('pre_depart');

    } else {
      // ── フリーモード ──
      const truckId  = $('sel-truck').value;
      const courseId = $('sel-course').value;
      const date     = $('sel-date').value;

      const { data: report, error } = await db
        .from('reports')
        .insert({ truck_id: truckId, course_id: courseId, date, status: 'active' })
        .select()
        .single();

      if (error) { showErr(error.message); setBusy('btn-next', false); return; }

      localStorage.setItem(LS_KEY, report.id);
      S.report     = report;
      S.mode       = 'free';
      S.truckName  = S.trucks.find(t => t.id === truckId)?.name  || '';
      S.courseName = S.courses.find(c => c.id === courseId)?.name || '';
      S.completedStopIds.clear();
      S.currentRec   = null;
      S.completedRecs = [];

      await loadCourseStops(courseId);
      setScreen('pre_depart');
    }
  });
}

// ════════════════════════════════════════════════════════
//  SCREEN: 出発前（行先選択 → 出発）
// ════════════════════════════════════════════════════════

// 計画モード: 次の届け先を自動選択（重量登録済み優先 → 計画順）
function getAutoNextPlannedStop() {
  const remaining = getRemainingStops();
  if (!remaining.length) return null;
  const withWeight = remaining.filter(s => s.weight_kg != null);
  return withWeight.length > 0 ? withWeight[0] : remaining[0];
}

// 計画モード用: 届け先カードのHTML
function renderPlanDestCard(stop, cardId) {
  return `
    <div class="plan-dest-card" id="${cardId}">
      <div class="plan-dest-name">${esc(stop.destination_name)}</div>
      ${stop.weight_kg != null
        ? `<div class="plan-dest-weight"><i class="bi bi-box-seam me-1"></i>${stop.weight_kg} kg</div>`
        : ''}
    </div>`;
}

function renderPreDepart() {
  const remaining = getRemainingStops();

  if (S.mode === 'planned') {
    const autoNext = getAutoNextPlannedStop();
    const opts = remaining.map(s =>
      `<option value="${s.id}"${s.id === autoNext?.id ? ' selected' : ''}>${esc(s.destination_name)}</option>`
    ).join('');

    return `
      ${renderStatusBar()}
      <div class="screen">
        <div class="page-title">
          <i class="bi bi-geo-alt text-primary"></i>
          次の届け先
        </div>

        <div>
          <div class="section-label">届け先</div>
          ${autoNext ? renderPlanDestCard(autoNext, 'dest-card') : ''}
          <button class="btn-change-dest" id="btn-change-dest" type="button">
            <i class="bi bi-chevron-down me-1" id="icon-change-dest"></i>別の届け先を選ぶ
          </button>
          <div id="dest-dropdown" style="display:none" class="mt-2">
            <select id="sel-dest" class="form-select">${opts}</select>
          </div>
        </div>

        <div id="err"></div>
        <div class="mt-auto pt-2 d-flex flex-column gap-2">
          <button class="btn-action btn-primary" id="btn-depart">出発</button>
          <button class="btn-undo" id="btn-undo">
            <i class="bi bi-arrow-counterclockwise"></i> 計画選択に戻る
          </button>
        </div>
      </div>`;
  }

  // ── フリーモード ──
  const opts = remaining.map(s =>
    `<option value="${s.id}">${esc(s.destinations.name)}</option>`).join('');

  return `
    ${renderStatusBar()}
    <div class="screen">
      <div class="page-title">
        <i class="bi bi-geo-alt text-primary"></i>
        行先を選択
      </div>

      <div>
        <div class="section-label">届け先</div>
        <select id="sel-dest" class="form-select">${opts}</select>
        <div class="form-text mt-1">配送コースに設定されている届け先から選択してください</div>
      </div>

      <div id="err"></div>
      <div class="mt-auto pt-2 d-flex flex-column gap-2">
        <button class="btn-action btn-primary" id="btn-depart">出発</button>
        <button class="btn-undo" id="btn-undo">
          <i class="bi bi-arrow-counterclockwise"></i> 車輌・コース選択に戻る
        </button>
      </div>
    </div>`;
}

function bindPreDepart() {
  // 計画モード: 届け先変更トグル
  if (S.mode === 'planned' && $('btn-change-dest')) {
    $('btn-change-dest').addEventListener('click', () => {
      const dd   = $('dest-dropdown');
      const open = dd.style.display !== 'none';
      dd.style.display = open ? 'none' : '';
      $('icon-change-dest').className = open ? 'bi bi-chevron-down me-1' : 'bi bi-chevron-up me-1';
    });

    // ドロップダウン変更時にカード表示を更新
    $('sel-dest').addEventListener('change', () => {
      const stop = S.plannedStopRecords.find(s => s.id === $('sel-dest').value);
      if (stop && $('dest-card')) {
        $('dest-card').innerHTML = `
          <div class="plan-dest-name">${esc(stop.destination_name)}</div>
          ${stop.weight_kg != null ? `<div class="plan-dest-weight"><i class="bi bi-box-seam me-1"></i>${stop.weight_kg} kg</div>` : ''}`;
      }
    });
  }

  $('btn-depart').addEventListener('click', async () => {
    const stopId = $('sel-dest')?.value || getAutoNextPlannedStop()?.id;
    if (!stopId) return;
    setBusy('btn-depart', true);

    if (S.mode === 'planned') {
      const { data: rec, error } = await db
        .from('stop_records')
        .update({ departed_at: new Date().toISOString() })
        .eq('id', stopId)
        .select()
        .single();

      if (error) { showErr(error.message); setBusy('btn-depart', false); return; }
      S.currentRec = rec;
      S.plannedStopRecords = S.plannedStopRecords.map(s => s.id === stopId ? rec : s);
      setScreen('in_transit');

    } else {
      const stop = S.courseStops.find(s => s.id === stopId);
      if (!stop) return;

      const { data: rec, error } = await db
        .from('stop_records')
        .insert({
          report_id:        S.report.id,
          course_stop_id:   stop.id,
          destination_name: stop.destinations.name,
          stop_number:      S.completedStopIds.size + 1,
          departed_at:      new Date().toISOString(),
        })
        .select()
        .single();

      if (error) { showErr(error.message); setBusy('btn-depart', false); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
      S.currentRec = rec;
      setScreen('in_transit');
    }
  });

  $('btn-undo').addEventListener('click', async () => {
    $('btn-undo').disabled = true;
    setBusy('btn-depart', true);
    await undoCreateReport();
  });
}

// ════════════════════════════════════════════════════════
//  SCREEN: 移動中
// ════════════════════════════════════════════════════════
function renderInTransit() {
  const rec = S.currentRec;
  return `
    ${renderStatusBar()}
    <div class="screen">
      <div>
        <div class="section-label">目的地</div>
        <div class="info-card">
          <div class="value">${esc(rec.destination_name)}</div>
          <div class="sub"><i class="bi bi-clock me-1"></i>出発 ${fmtTime(rec.departed_at)}</div>
        </div>
      </div>

      <div id="err"></div>
      <div class="mt-auto pt-2 d-flex flex-column gap-2">
        <button class="btn-action btn-warning" id="btn-arrive">
          <i class="bi bi-pin-map-fill"></i> 到着
        </button>
        <button class="btn-undo" id="btn-undo">
          <i class="bi bi-arrow-counterclockwise"></i> 出発を取り消す
        </button>
      </div>
    </div>`;
}

function bindInTransit() {
  $('btn-arrive').addEventListener('click', async () => {
    setBusy('btn-arrive', true);
    if ($('btn-undo')) $('btn-undo').disabled = true;
    const arrivedAt = new Date().toISOString();

    if (S.mode === 'planned') {
      const { error } = await db
        .from('stop_records')
        .update({ arrived_at: arrivedAt, status: 'completed' })
        .eq('id', S.currentRec.id);

      if (error) { showErr(error.message); setBusy('btn-arrive', false); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
      S.currentRec = { ...S.currentRec, arrived_at: arrivedAt, status: 'completed' };
      S.completedStopIds.add(S.currentRec.id);
      S.plannedStopRecords = S.plannedStopRecords.map(s => s.id === S.currentRec.id ? S.currentRec : s);

    } else {
      const { error } = await db
        .from('stop_records')
        .update({ arrived_at: arrivedAt })
        .eq('id', S.currentRec.id);

      if (error) { showErr(error.message); setBusy('btn-arrive', false); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
      S.currentRec = { ...S.currentRec, arrived_at: arrivedAt };
      S.completedStopIds.add(S.currentRec.course_stop_id);
    }
    setScreen('arrived');
  });

  $('btn-undo').addEventListener('click', async () => {
    $('btn-undo').disabled = true;
    setBusy('btn-arrive', true);
    await undoDepart();
  });
}

// ════════════════════════════════════════════════════════
//  SCREEN: 到着後
// ════════════════════════════════════════════════════════
function renderArrived() {
  const rec       = S.currentRec;
  const remaining = getRemainingStops();
  const isLast    = remaining.length === 0;

  if (S.mode === 'planned') {
    const autoNext = getAutoNextPlannedStop();
    const nextOpts = remaining.map(s =>
      `<option value="${s.id}"${s.id === autoNext?.id ? ' selected' : ''}>${esc(s.destination_name)}</option>`
    ).join('');

    return `
      ${renderStatusBar()}
      <div class="screen">
        <div class="info-card" style="background:#fff7ed;border-color:#fed7aa">
          <div class="section-label" style="color:#9a3412">到着済み</div>
          <div class="value">${esc(rec.destination_name)}</div>
          <div class="sub"><i class="bi bi-clock me-1"></i>到着 ${fmtTime(rec.arrived_at)}</div>
        </div>

        ${!isLast && autoNext ? `
        <div>
          <div class="section-label">次の届け先</div>
          ${renderPlanDestCard(autoNext, 'next-card')}
          <button class="btn-change-dest" id="btn-change-next" type="button">
            <i class="bi bi-chevron-down me-1" id="icon-change-next"></i>別の届け先を選ぶ
          </button>
          <div id="next-dropdown" style="display:none" class="mt-2">
            <select id="sel-next" class="form-select">${nextOpts}</select>
          </div>
        </div>` : isLast ? `
        <div class="alert alert-success d-flex align-items-center gap-2 rounded-3" role="alert">
          <i class="bi bi-check-circle-fill fs-5"></i>
          すべての配送先を完了しました
        </div>` : ''}

        <div id="err"></div>
        <div class="mt-auto pt-2 d-flex flex-column gap-2">
          ${!isLast ? `
            <button class="btn-action btn-primary" id="btn-next-depart">出発</button>
            <button class="btn-action btn-outline-success" id="btn-to-return">
              <i class="bi bi-house-fill"></i> 帰社
            </button>
          ` : `
            <button class="btn-action btn-success" id="btn-to-return">
              帰社 <i class="bi bi-house-fill"></i>
            </button>
          `}
          <button class="btn-undo" id="btn-undo">
            <i class="bi bi-arrow-counterclockwise"></i> 到着を取り消す
          </button>
        </div>
      </div>`;
  }

  // ── フリーモード ──
  const nextOpts = remaining.map(s =>
    `<option value="${s.id}">${esc(s.destinations.name)}</option>`).join('');

  return `
    ${renderStatusBar()}
    <div class="screen">
      <div class="info-card" style="background:#fff7ed;border-color:#fed7aa">
        <div class="section-label" style="color:#9a3412">到着済み</div>
        <div class="value">${esc(rec.destination_name)}</div>
        <div class="sub"><i class="bi bi-clock me-1"></i>到着 ${fmtTime(rec.arrived_at)}</div>
      </div>

      <div>
        <div class="section-label">配達重量</div>
        <div class="input-group">
          <input type="number" id="input-weight" class="form-control text-end"
                 placeholder="0.0" step="0.1" min="0"
                 value="${rec.weight_kg != null ? rec.weight_kg : ''}">
          <span class="input-group-text">kg</span>
        </div>
      </div>

      ${!isLast ? `
      <div>
        <div class="section-label">次の届け先</div>
        <select id="sel-next" class="form-select">${nextOpts}</select>
      </div>` : `
      <div class="alert alert-success d-flex align-items-center gap-2 rounded-3" role="alert">
        <i class="bi bi-check-circle-fill fs-5"></i>
        すべての配送先を完了しました
      </div>`}

      <div id="err"></div>
      <div class="mt-auto pt-2 d-flex flex-column gap-2">
        ${!isLast ? `
          <button class="btn-action btn-primary" id="btn-next-depart">出発</button>
          <button class="btn-action btn-outline-success" id="btn-to-return">
            <i class="bi bi-house-fill"></i> 帰社
          </button>
        ` : `
          <button class="btn-action btn-success" id="btn-to-return">
            帰社 <i class="bi bi-house-fill"></i>
          </button>
        `}
        <button class="btn-undo" id="btn-undo">
          <i class="bi bi-arrow-counterclockwise"></i> 到着を取り消す
        </button>
      </div>
    </div>`;
}

function bindArrived() {
  const isLast = getRemainingStops().length === 0;

  if (S.mode === 'planned') {
    // 「別の届け先」ドロップダウントグル
    if ($('btn-change-next')) {
      $('btn-change-next').addEventListener('click', () => {
        const dd   = $('next-dropdown');
        const open = dd.style.display !== 'none';
        dd.style.display = open ? 'none' : '';
        $('icon-change-next').className = open ? 'bi bi-chevron-down me-1' : 'bi bi-chevron-up me-1';
      });

      // ドロップダウン変更時にカード表示を更新
      $('sel-next').addEventListener('change', () => {
        const stop = S.plannedStopRecords.find(s => s.id === $('sel-next').value);
        if (stop && $('next-card')) {
          $('next-card').innerHTML = `
            <div class="plan-dest-name">${esc(stop.destination_name)}</div>
            ${stop.weight_kg != null ? `<div class="plan-dest-weight"><i class="bi bi-box-seam me-1"></i>${stop.weight_kg} kg</div>` : ''}`;
        }
      });
    }

    // 選択中の次の届け先IDを取得（ドロップダウンが表示中ならそちら優先）
    function getSelectedNextId() {
      const dd = $('next-dropdown');
      if (dd && dd.style.display !== 'none' && $('sel-next')) return $('sel-next').value;
      return getAutoNextPlannedStop()?.id;
    }

    if (!isLast) {
      $('btn-next-depart').addEventListener('click', async () => {
        const nextId = getSelectedNextId();
        if (!nextId) return;
        setBusy('btn-next-depart', true);

        const { data: rec, error } = await db
          .from('stop_records')
          .update({ departed_at: new Date().toISOString() })
          .eq('id', nextId)
          .select()
          .single();

        if (error) { showErr(error.message); setBusy('btn-next-depart', false); return; }
        S.currentRec = rec;
        S.plannedStopRecords = S.plannedStopRecords.map(s => s.id === nextId ? rec : s);
        setScreen('in_transit');
      });

    }

    $('btn-to-return').addEventListener('click', async () => {
      setBusy('btn-to-return', true);
      if ($('btn-undo')) $('btn-undo').disabled = true;
      if ($('btn-next-depart')) $('btn-next-depart').disabled = true;
      setScreen('return');
    });

    $('btn-undo').addEventListener('click', async () => {
      $('btn-undo').disabled = true;
      setBusy('btn-to-return', true);
      if ($('btn-next-depart')) $('btn-next-depart').disabled = true;
      await undoArrive();
    });
    return;
  }

  // ── フリーモード ──
  async function saveWeight() {
    const w    = parseFloat($('input-weight')?.value);
    const wVal = !isNaN(w) && w >= 0 ? w : null;
    await db.from('stop_records').update({ weight_kg: wVal }).eq('id', S.currentRec.id);
    S.currentRec = { ...S.currentRec, weight_kg: wVal };
  }

  if (!isLast) {
    $('btn-next-depart').addEventListener('click', async () => {
      const nextId   = $('sel-next').value;
      const nextStop = S.courseStops.find(s => s.id === nextId);
      if (!nextStop) return;
      setBusy('btn-next-depart', true);
      await saveWeight();

      const { data: rec, error } = await db
        .from('stop_records')
        .insert({
          report_id:        S.report.id,
          course_stop_id:   nextStop.id,
          destination_name: nextStop.destinations.name,
          stop_number:      S.completedStopIds.size + 1,
          departed_at:      new Date().toISOString(),
        })
        .select()
        .single();

      if (error) { showErr(error.message); setBusy('btn-next-depart', false); return; }
      S.currentRec = rec;
      setScreen('in_transit');
    });
  }

  $('btn-to-return').addEventListener('click', async () => {
    setBusy('btn-to-return', true);
    if ($('btn-undo')) $('btn-undo').disabled = true;
    if ($('btn-next-depart')) $('btn-next-depart').disabled = true;
    await saveWeight();
    setScreen('return');
  });

  $('btn-undo').addEventListener('click', async () => {
    $('btn-undo').disabled = true;
    setBusy('btn-to-return', true);
    if ($('btn-next-depart')) $('btn-next-depart').disabled = true;
    await undoArrive();
  });
}

// ════════════════════════════════════════════════════════
//  SCREEN: 帰社（ODOメーター入力）
// ════════════════════════════════════════════════════════
function renderReturn() {
  return `
    ${renderStatusBar()}
    <div class="screen">
      <div class="page-title">
        <i class="bi bi-house-fill text-success"></i>
        帰社
      </div>

      <div class="alert alert-success d-flex align-items-center gap-2 rounded-3" role="alert">
        <i class="bi bi-check2-all fs-5"></i>
        本日の配送が完了しました。お疲れ様でした！
      </div>

      <div>
        <div class="section-label">帰社時 ODOメーター</div>
        <div class="input-group">
          <input type="number" id="input-odd" class="form-control text-end"
                 placeholder="例: 12345" step="1" min="0">
          <span class="input-group-text">km</span>
        </div>
        <div class="form-text mt-1">帰社後、車輌のODOメーターを確認して入力してください</div>
      </div>

      <div id="err"></div>
      <div class="mt-auto pt-2">
        <button class="btn-action btn-success" id="btn-return">
          <i class="bi bi-house-check-fill"></i> 帰社を記録
        </button>
      </div>
    </div>`;
}

function bindReturn() {
  $('btn-return').addEventListener('click', async () => {
    const oddVal = parseFloat($('input-odd').value);
    if (isNaN(oddVal) || oddVal <= 0) {
      showErr('ODOメーターを入力してください'); return;
    }
    setBusy('btn-return', true);

    const { error } = await db
      .from('reports')
      .update({ status: 'completed', arrive_odo: oddVal })
      .eq('id', S.report.id);

    if (error) { showErr(error.message); setBusy('btn-return', false); return; }

    localStorage.removeItem(LS_KEY);

    const { data: recs } = await db
      .from('stop_records')
      .select('*')
      .eq('report_id', S.report.id)
      .order('stop_number');

    // 計画モードはスキップを除く完了のみ、フリーモードは全件
    S.completedRecs = S.mode === 'planned'
      ? (recs || []).filter(r => r.status === 'completed')
      : (recs || []);
    S.report = { ...S.report, arrive_odo: oddVal };
    setScreen('completed');
  });
}

// ════════════════════════════════════════════════════════
//  SCREEN: 完了
// ════════════════════════════════════════════════════════
function renderCompleted() {
  const rows = S.completedRecs.map((r, i) => `
    <div class="summary-row">
      <div class="summary-num">${i + 1}</div>
      <div class="summary-info">
        <div class="summary-name">${esc(r.destination_name)}</div>
        <div class="summary-time">
          出発 ${fmtTime(r.departed_at)} → 到着 ${r.arrived_at ? fmtTime(r.arrived_at) : '--:--'}
        </div>
      </div>
      <div class="summary-weight">${r.weight_kg != null ? r.weight_kg + ' kg' : '—'}</div>
    </div>`).join('');

  return `
    <div class="screen">
      <div class="complete-hero">
        <div class="icon">✅</div>
        <div class="title">お疲れ様でした！</div>
        <div class="sub">帰社ODOメーター: ${S.report?.arrive_odo ?? '—'} km</div>
      </div>

      ${rows ? `
      <div class="summary-list">
        <div class="summary-header">配送記録 — ${S.report?.date || today()}</div>
        ${rows}
      </div>` : ''}

      <div class="mt-auto pt-2">
        <button class="btn-action btn-primary" id="btn-new">
          <i class="bi bi-plus-circle"></i> 新しい日報を開始
        </button>
      </div>
    </div>`;
}

function bindCompleted() {
  $('btn-new').addEventListener('click', async () => {
    S.report = null;
    S.currentRec = null;
    S.mode = 'free';
    S.completedStopIds.clear();
    S.completedRecs = [];
    S.plannedStopRecords = [];
    S.courseStops = [];
    setScreen('init');
    await Promise.all([loadAvailableTrucks(), loadTodayPlans()]);
    setScreen('select');
  });
}

// ════════════════════════════════════════════════════════
//  Undo
// ════════════════════════════════════════════════════════
async function undoCreateReport() {
  if (S.mode === 'planned') {
    // 計画モード: truck_id をクリアして planned に戻す（削除しない）
    const { error } = await db
      .from('reports')
      .update({ status: 'planned', truck_id: null })
      .eq('id', S.report.id);
    if (error) { showErr(error.message); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
    localStorage.removeItem(LS_KEY);
    S.report = null;
    S.currentRec = null;
    S.completedStopIds.clear();
    S.completedRecs = [];
    S.plannedStopRecords = [];
    await loadTodayPlans();
    setScreen('select');
    return;
  }

  // フリーモード: report を削除
  const { error } = await db
    .from('reports')
    .delete()
    .eq('id', S.report.id);
  if (error) { showErr(error.message); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
  localStorage.removeItem(LS_KEY);
  S.report = null;
  S.currentRec = null;
  S.completedStopIds.clear();
  S.completedRecs = [];
  S.courseStops = [];
  setScreen('select');
}

async function undoDepart() {
  if (S.mode === 'planned') {
    const { error } = await db
      .from('stop_records')
      .update({ departed_at: null })
      .eq('id', S.currentRec.id);
    if (error) { showErr(error.message); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
    S.plannedStopRecords = S.plannedStopRecords.map(s =>
      s.id === S.currentRec.id ? { ...s, departed_at: null } : s);
    S.currentRec = null;
    setScreen('pre_depart');
    return;
  }

  const { error } = await db
    .from('stop_records')
    .delete()
    .eq('id', S.currentRec.id);
  if (error) { showErr(error.message); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
  S.currentRec = null;
  setScreen('pre_depart');
}

async function undoArrive() {
  if (S.mode === 'planned') {
    const { error } = await db
      .from('stop_records')
      .update({ arrived_at: null, status: 'planned' })
      .eq('id', S.currentRec.id);
    if (error) { showErr(error.message); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
    const updated = { ...S.currentRec, arrived_at: null, status: 'planned' };
    S.completedStopIds.delete(S.currentRec.id);
    S.currentRec = updated;
    S.plannedStopRecords = S.plannedStopRecords.map(s => s.id === updated.id ? updated : s);
    setScreen('in_transit');
    return;
  }

  const { error } = await db
    .from('stop_records')
    .update({ arrived_at: null, weight_kg: null })
    .eq('id', S.currentRec.id);
  if (error) { showErr(error.message); if ($('btn-undo')) $('btn-undo').disabled = false; return; }
  S.completedStopIds.delete(S.currentRec.course_stop_id);
  S.currentRec = { ...S.currentRec, arrived_at: null, weight_kg: null };
  setScreen('in_transit');
}

// ════════════════════════════════════════════════════════
//  共通UI
// ════════════════════════════════════════════════════════
function renderStatusBar() {
  const done  = S.completedStopIds.size;
  const total = S.mode === 'planned' ? S.plannedStopRecords.length : S.courseStops.length;
  return `
    <div class="status-bar">
      <div class="info">
        <span class="status-chip"><i class="bi bi-truck"></i> ${esc(S.truckName)}</span>
        <span class="status-chip"><i class="bi bi-map"></i> ${esc(S.courseName)}</span>
      </div>
      <span class="progress-badge">${done} / ${total} 件</span>
    </div>`;
}

function setBusy(id, busy) {
  const btn = $(id);
  if (!btn) return;
  btn.disabled = busy;
  if (busy) btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>処理中...`;
}

function showErr(msg) {
  const el = $('err');
  if (el) el.innerHTML = `<div class="alert-error"><i class="bi bi-exclamation-triangle me-2"></i>${esc(msg)}</div>`;
}

// ════════════════════════════════════════════════════════
//  データ操作
// ════════════════════════════════════════════════════════
function getRemainingStops() {
  if (S.mode === 'planned') {
    return S.plannedStopRecords.filter(sr =>
      !S.completedStopIds.has(sr.id) && sr.id !== S.currentRec?.id
    );
  }
  return S.courseStops.filter(s => !S.completedStopIds.has(s.id));
}

async function loadCourseStops(courseId) {
  const { data } = await db
    .from('course_stops')
    .select('id, stop_order, destinations(name)')
    .eq('course_id', courseId)
    .order('stop_order');
  S.courseStops = data || [];
}

async function loadPlannedStopRecords(reportId) {
  const { data } = await db
    .from('stop_records')
    .select('*')
    .eq('report_id', reportId)
    .order('stop_number');
  S.plannedStopRecords = data || [];

  S.completedStopIds.clear();
  S.plannedStopRecords.forEach(r => {
    if (r.status === 'completed' || r.status === 'skipped') {
      S.completedStopIds.add(r.id);
    }
  });
}

async function loadTodayPlans() {
  const { data: plans } = await db
    .from('reports')
    .select('id, date, course_id, courses(name)')
    .eq('date', today())
    .eq('status', 'planned')
    .order('created_at');

  if (!plans || !plans.length) { S.todayPlans = []; return; }

  // 重量が入力されている計画済み stop_records の件数を取得
  const planIds = plans.map(p => p.id);
  const { data: counts } = await db
    .from('stop_records')
    .select('report_id')
    .in('report_id', planIds)
    .eq('status', 'planned')
    .not('weight_kg', 'is', null);

  const countMap = {};
  (counts || []).forEach(r => {
    countMap[r.report_id] = (countMap[r.report_id] || 0) + 1;
  });

  S.todayPlans = plans.map(p => ({ ...p, _stopCount: countMap[p.id] ?? 0 }));
}

// ════════════════════════════════════════════════════════
//  localStorage からの復元
// ════════════════════════════════════════════════════════
async function resumeFromStorage() {
  const reportId = localStorage.getItem(LS_KEY);
  if (!reportId) return false;

  const { data: report } = await db
    .from('reports')
    .select('*, trucks(name), courses(name)')
    .eq('id', reportId)
    .eq('status', 'active')
    .maybeSingle();

  if (!report) { localStorage.removeItem(LS_KEY); return false; }

  S.report     = report;
  S.truckName  = report.trucks?.name  || '';
  S.courseName = report.courses?.name || '';

  const { data: records } = await db
    .from('stop_records')
    .select('*')
    .eq('report_id', reportId)
    .order('stop_number');

  const allRecs = records || [];

  // 計画モード検出: status が NULL でないレコードが存在するか
  const isPlanned = allRecs.some(r => r.status !== null && r.status !== undefined);

  if (isPlanned) {
    S.mode = 'planned';
    S.plannedStopRecords = allRecs;
    allRecs.forEach(r => {
      if (r.status === 'completed' || r.status === 'skipped') S.completedStopIds.add(r.id);
    });

    const inProgress = allRecs.find(r => r.departed_at && !r.arrived_at);
    if (inProgress) {
      S.currentRec = inProgress;
      setScreen('in_transit');
    } else {
      const lastCompleted = [...allRecs].reverse().find(r => r.status === 'completed');
      if (lastCompleted) {
        S.currentRec = lastCompleted;
        setScreen('arrived');
      } else {
        setScreen('pre_depart');
      }
    }

  } else {
    S.mode = 'free';
    await loadCourseStops(report.course_id);
    allRecs.forEach(r => {
      if (r.arrived_at) S.completedStopIds.add(r.course_stop_id);
    });

    const inProgress = allRecs.find(r => r.departed_at && !r.arrived_at);
    if (inProgress) {
      S.currentRec = inProgress;
      setScreen('in_transit');
    } else {
      const lastArrived = [...allRecs].reverse().find(r => r.arrived_at);
      if (lastArrived) {
        S.currentRec = lastArrived;
        setScreen('arrived');
      } else {
        setScreen('pre_depart');
      }
    }
  }
  return true;
}

// ════════════════════════════════════════════════════════
//  起動
// ════════════════════════════════════════════════════════
async function loadAvailableTrucks() {
  const { data: activeReports } = await db
    .from('reports')
    .select('id, truck_id')
    .eq('date', today())
    .eq('status', 'active');

  const activeReportIds = (activeReports || []).map(r => r.id);
  const inUseTruckIds = new Set();
  if (activeReportIds.length) {
    const { data: stops } = await db
      .from('stop_records')
      .select('report_id')
      .in('report_id', activeReportIds);
    const reportsWithStops = new Set((stops || []).map(s => s.report_id));
    (activeReports || []).forEach(r => {
      if (reportsWithStops.has(r.id)) inUseTruckIds.add(r.truck_id);
    });
  }

  const { data: trucks } = await db.from('trucks').select('id, name, branch_id, max_load').order('name');
  S.trucks = (trucks || []).filter(t => !inUseTruckIds.has(t.id));
}

async function init() {
  setScreen('init');

  const [{ data: courses }, { data: branches }] = await Promise.all([
    db.from('courses').select('id, name, branch_id, day_of_week').order('name'),
    db.from('branches').select('id, name').order('name'),
  ]);
  S.courses  = courses  || [];
  S.branches = branches || [];

  await Promise.all([loadAvailableTrucks(), loadTodayPlans()]);

  const resumed = await resumeFromStorage();
  if (!resumed) setScreen('select');
}

// ════════════════════════════════════════════════════════
//  ユーティリティ
// ════════════════════════════════════════════════════════
const $    = id => document.getElementById(id);
const esc  = s  => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pad     = n   => String(n).padStart(2, '0');
const today   = ()  => new Date().toLocaleDateString('sv');
const fmtTime = iso => {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

init();
