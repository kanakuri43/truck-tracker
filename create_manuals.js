// PowerPoint manual generator for Truck Tracker
// Run: node create_manuals.js
const PptxGenJS = require('pptxgenjs');
const path = require('path');

const C = {
  navy:      '1e3a5f',
  blue:      '2980b9',
  lightBlue: 'd6e8f5',
  skyBlue:   'e8f4fd',
  orange:    'e67e22',
  green:     '27ae60',
  red:       'e74c3c',
  white:     'FFFFFF',
  lightGrey: 'f8f9fa',
  grey:      'e0e0e0',
  midGrey:   'aaaaaa',
  darkGrey:  '555555',
  black:     '2c3e50',
  bg:        'f0f4f8',
  yellow:    'f39c12',
  phoneBody: '222222',
  phoneScreen: 'f5f5f5',
};

const FONT = 'メイリオ';

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
function addSlideTitle(s, title, subtitle) {
  // header bar
  s.addShape('rect', { x:0, y:0, w:13.33, h:0.75, fill:{color:C.navy}, line:{type:'none'} });
  s.addText(title, { x:0.3, y:0.08, w:12, h:0.6, fontSize:24, bold:true, color:C.white, fontFace:FONT });
  if (subtitle) {
    s.addText(subtitle, { x:0.3, y:0.75, w:12.7, h:0.4, fontSize:12, color:C.darkGrey, fontFace:FONT, italic:true });
  }
  s.addShape('rect', { x:0, y:0.75, w:13.33, h:0.04, fill:{color:C.orange}, line:{type:'none'} });
}

function addStep(s, x, y, num, title, desc) {
  // circle with number
  s.addShape('ellipse', { x, y, w:0.45, h:0.45, fill:{color:C.navy}, line:{type:'none'} });
  s.addText(String(num), { x, y:y+0.04, w:0.45, h:0.35, fontSize:14, bold:true, color:C.white, align:'center', fontFace:FONT });
  // title
  s.addText(title, { x:x+0.55, y:y+0.03, w:5.8, h:0.35, fontSize:14, bold:true, color:C.navy, fontFace:FONT });
  // desc
  if (desc) s.addText(desc, { x:x+0.55, y:y+0.42, w:5.8, h:0.45, fontSize:11, color:C.black, fontFace:FONT, wrap:true });
}

function addNote(s, x, y, w, text, type) {
  const bgColor = type === 'tip' ? 'e8f8e8' : type === 'warn' ? 'fff3cd' : 'e8f4fd';
  const bdColor = type === 'tip' ? '27ae60'   : type === 'warn' ? 'f39c12'  : '2980b9';
  const label   = type === 'tip' ? 'ポイント'  : type === 'warn' ? '注意'    : '説明';
  s.addShape('rect', { x, y, w, h:0.75, fill:{color:bgColor}, line:{color:bdColor, width:1.5} });
  s.addText(`【${label}】 ${text}`, { x:x+0.1, y:y+0.08, w:w-0.2, h:0.6, fontSize:11, color:C.black, fontFace:FONT, wrap:true });
}

// ─────────────────────────────────────────────
// Phone mockup builder
// ─────────────────────────────────────────────
// drawPhone: draws phone frame + screen + navbar
// elements: array of {type, ...options}
function drawPhone(s, px, py, elements) {
  const pw = 3.6, ph = 5.8;
  const sx = px + 0.12, sy = py + 0.22, sw = pw - 0.24, sh = ph - 0.44;

  // Phone body
  s.addShape('roundRect', { x:px, y:py, w:pw, h:ph, fill:{color:C.phoneBody}, line:{color:'111111',width:1.5}, rectRadius:0.25 });
  // Home button indicator
  s.addShape('ellipse', { x:px+(pw/2)-0.18, y:py+ph-0.25, w:0.36, h:0.2, fill:{color:'444444'}, line:{color:'666666',width:1} });
  // Screen background
  s.addShape('rect', { x:sx, y:sy, w:sw, h:sh, fill:{color:C.phoneScreen}, line:{type:'none'} });
  // NavBar
  s.addShape('rect', { x:sx, y:sy, w:sw, h:0.48, fill:{color:C.navy}, line:{type:'none'} });
  s.addText('🚚  Truck Tracker', { x:sx+0.05, y:sy+0.08, w:sw-0.1, h:0.32, fontSize:11, bold:true, color:C.white, fontFace:FONT });

  // Render elements
  const contentY = sy + 0.52;
  (elements || []).forEach(el => {
    const ex = sx + (el.x || 0.05);
    const ey = contentY + (el.y || 0);
    const ew = el.w || (sw - 0.1);
    const eh = el.h || 0.4;
    if (el.type === 'tabs') {
      // Tab bar
      const tabW = ew / 2;
      ['計画', 'フリー'].forEach((t, i) => {
        const active = i === (el.active || 0);
        s.addShape('rect', { x:ex+(tabW*i), y:ey, w:tabW, h:eh, fill:{color:active ? C.navy : C.grey}, line:{type:'none'} });
        s.addText(t, { x:ex+(tabW*i), y:ey+0.05, w:tabW, h:eh-0.1, fontSize:10, bold:active, color:active ? C.white : C.darkGrey, align:'center', fontFace:FONT });
      });
    } else if (el.type === 'listitem') {
      s.addShape('roundRect', { x:ex, y:ey, w:ew, h:eh, fill:{color:C.white}, line:{color:C.grey,width:0.75}, rectRadius:0.05 });
      s.addText(el.text || '', { x:ex+0.1, y:ey+0.05, w:ew-0.2, h:eh-0.1, fontSize:9.5, color:C.black, fontFace:FONT });
    } else if (el.type === 'btn') {
      const bc = el.color || C.blue;
      s.addShape('roundRect', { x:ex, y:ey, w:ew, h:eh, fill:{color:bc}, line:{type:'none'}, rectRadius:0.07 });
      s.addText(el.text || '', { x:ex, y:ey+0.06, w:ew, h:eh-0.12, fontSize:11, bold:true, color:C.white, align:'center', fontFace:FONT });
    } else if (el.type === 'label') {
      s.addText(el.text || '', { x:ex, y:ey, w:ew, h:eh, fontSize:el.size || 10, bold:el.bold||false, color:el.color || C.black, fontFace:FONT, wrap:true });
    } else if (el.type === 'input') {
      s.addShape('rect', { x:ex, y:ey, w:ew, h:eh, fill:{color:C.white}, line:{color:C.blue,width:1} });
      s.addText(el.label || '', { x:ex+0.08, y:ey+0.05, w:ew-0.1, h:eh-0.1, fontSize:9, color:C.midGrey, fontFace:FONT });
    } else if (el.type === 'divider') {
      s.addShape('rect', { x:ex, y:ey, w:ew, h:0.02, fill:{color:C.grey}, line:{type:'none'} });
    } else if (el.type === 'badge') {
      s.addShape('roundRect', { x:ex, y:ey, w:ew, h:eh, fill:{color:el.color||C.lightBlue}, line:{type:'none'}, rectRadius:0.05 });
      s.addText(el.text || '', { x:ex+0.05, y:ey+0.04, w:ew-0.1, h:eh-0.08, fontSize:9, color:el.textColor||C.navy, fontFace:FONT, align:'center', bold:el.bold||false });
    } else if (el.type === 'bigText') {
      s.addText(el.text || '', { x:ex, y:ey, w:ew, h:eh, fontSize:el.size||22, bold:true, color:el.color||C.navy, fontFace:FONT, align:el.align||'left' });
    }
  });
}

// ─────────────────────────────────────────────
// PC/Browser mockup builder
// ─────────────────────────────────────────────
function drawBrowser(s, bx, by, elements) {
  const bw = 8.5, bh = 5.8;
  const sideW = 1.6;
  const contentX = bx + sideW;
  const contentW = bw - sideW;
  const topH = 0.38;

  // Browser chrome
  s.addShape('rect', { x:bx, y:by, w:bw, h:bh, fill:{color:C.lightGrey}, line:{color:C.grey,width:1} });
  // Chrome top bar
  s.addShape('rect', { x:bx, y:by, w:bw, h:topH, fill:{color:'e0e0e0'}, line:{type:'none'} });
  s.addShape('ellipse', { x:bx+0.1, y:by+0.09, w:0.18, h:0.18, fill:{color:'ff5f56'}, line:{type:'none'} });
  s.addShape('ellipse', { x:bx+0.32, y:by+0.09, w:0.18, h:0.18, fill:{color:'ffbd2e'}, line:{type:'none'} });
  s.addShape('ellipse', { x:bx+0.54, y:by+0.09, w:0.18, h:0.18, fill:{color:'27c93f'}, line:{type:'none'} });
  // Sidebar
  s.addShape('rect', { x:bx, y:by+topH, w:sideW, h:bh-topH, fill:{color:C.navy}, line:{type:'none'} });
  // Sidebar brand
  s.addText('🚚 Truck Tracker', { x:bx+0.05, y:by+topH+0.1, w:sideW-0.1, h:0.32, fontSize:9, bold:true, color:C.white, fontFace:FONT });
  s.addText('Administrator', { x:bx+0.05, y:by+topH+0.4, w:sideW-0.1, h:0.2, fontSize:7, color:'99bbdd', fontFace:FONT });
  // Content area
  s.addShape('rect', { x:contentX, y:by+topH, w:contentW, h:bh-topH, fill:{color:C.white}, line:{type:'none'} });
  // Topbar
  s.addShape('rect', { x:contentX, y:by+topH, w:contentW, h:0.4, fill:{color:'f8f9fa'}, line:{color:C.grey,width:0.5} });

  // Sidebar nav items
  const navItems = [
    {label:'Dashboard', icon:'📊', active:false},
    {label:'配送計画', icon:'📅', active:false},
    {label:'日報編集', icon:'📝', active:false},
    {label:'レポート', icon:'📈', active:false},
    {label:'CSV', icon:'⬇️', active:false},
  ];
  const activeNav = elements.find(e => e.type === 'activeNav');
  if (activeNav) {
    navItems.forEach(n => { if (n.label === activeNav.label) n.active = true; });
  }
  navItems.forEach((item, i) => {
    const ny = by + topH + 0.7 + i * 0.52;
    if (item.active) {
      s.addShape('rect', { x:bx, y:ny-0.03, w:sideW, h:0.42, fill:{color:'16304e'}, line:{type:'none'} });
      s.addShape('rect', { x:bx+sideW-0.05, y:ny-0.03, w:0.05, h:0.42, fill:{color:C.orange}, line:{type:'none'} });
    }
    s.addText(`${item.icon} ${item.label}`, { x:bx+0.08, y:ny, w:sideW-0.1, h:0.35, fontSize:8.5, color:item.active ? C.white : 'aabbcc', fontFace:FONT });
  });

  // Render content elements
  (elements || []).filter(e => e.type !== 'activeNav').forEach(el => {
    const ex = contentX + (el.x || 0.2);
    const ey = by + topH + (el.y || 0.5);
    const ew = el.w || (contentW - 0.4);
    const eh = el.h || 0.4;
    if (el.type === 'heading') {
      s.addText(el.text, { x:ex, y:ey, w:ew, h:eh, fontSize:el.size||16, bold:true, color:C.navy, fontFace:FONT });
    } else if (el.type === 'subtext') {
      s.addText(el.text, { x:ex, y:ey, w:ew, h:eh, fontSize:el.size||10, color:C.darkGrey, fontFace:FONT });
    } else if (el.type === 'card') {
      s.addShape('roundRect', { x:ex, y:ey, w:ew, h:eh, fill:{color:C.white}, line:{color:C.grey,width:0.75}, rectRadius:0.07,
        shadow:{type:'outer',color:'cccccc',opacity:0.4,blur:4,offset:2,angle:45} });
      if (el.title) s.addText(el.title, { x:ex+0.15, y:ey+0.1, w:ew-0.3, h:0.35, fontSize:10, bold:true, color:C.navy, fontFace:FONT });
      if (el.body)  s.addText(el.body,  { x:ex+0.15, y:ey+0.45, w:ew-0.3, h:eh-0.55, fontSize:9, color:C.black, fontFace:FONT, wrap:true });
    } else if (el.type === 'btn') {
      const bc = el.color || C.blue;
      s.addShape('roundRect', { x:ex, y:ey, w:ew, h:eh, fill:{color:bc}, line:{type:'none'}, rectRadius:0.05 });
      s.addText(el.text||'', { x:ex, y:ey+0.05, w:ew, h:eh-0.1, fontSize:9, bold:true, color:C.white, align:'center', fontFace:FONT });
    } else if (el.type === 'input') {
      s.addShape('rect', { x:ex, y:ey, w:ew, h:eh, fill:{color:C.white}, line:{color:C.grey,width:1} });
      s.addText(el.label||'', { x:ex+0.1, y:ey+0.06, w:ew-0.2, h:eh-0.12, fontSize:8.5, color:C.midGrey, fontFace:FONT });
    } else if (el.type === 'row') {
      (el.cols||[]).forEach((col, ci) => {
        const totalW = ew;
        const colW = (col.w || (1/el.cols.length)) * totalW;
        const colX = ex + el.cols.slice(0,ci).reduce((a,c) => a + (c.w||1/el.cols.length)*totalW, 0);
        s.addShape('rect', { x:colX, y:ey, w:colW, h:eh, fill:{color:col.bg||C.white}, line:{color:C.grey,width:0.5} });
        s.addText(col.text||'', { x:colX+0.05, y:ey+0.05, w:colW-0.1, h:eh-0.1, fontSize:8.5, color:col.color||C.black, fontFace:FONT, bold:col.bold||false });
      });
    } else if (el.type === 'summaryCards') {
      const cards = el.cards || [];
      const cw = (ew - 0.1 * (cards.length-1)) / cards.length;
      cards.forEach((card, ci) => {
        const cx = ex + ci * (cw + 0.1);
        s.addShape('roundRect', { x:cx, y:ey, w:cw, h:eh, fill:{color:card.color||C.lightBlue}, line:{type:'none'}, rectRadius:0.07 });
        s.addText(card.label||'', { x:cx+0.05, y:ey+0.05, w:cw-0.1, h:0.25, fontSize:8, color:C.darkGrey, fontFace:FONT, align:'center' });
        s.addText(card.value||'', { x:cx+0.05, y:ey+0.28, w:cw-0.1, h:0.45, fontSize:20, bold:true, color:card.textColor||C.navy, fontFace:FONT, align:'center' });
      });
    }
  });
}

// ─────────────────────────────────────────────
// Callout with number
// ─────────────────────────────────────────────
function addCallout(s, num, x, y) {
  s.addShape('ellipse', { x, y, w:0.38, h:0.38, fill:{color:C.orange}, line:{type:'none'} });
  s.addText(String(num), { x, y:y+0.04, w:0.38, h:0.28, fontSize:13, bold:true, color:C.white, align:'center', fontFace:FONT });
}

// ─────────────────────────────────────────────
// USER MANUAL
// ─────────────────────────────────────────────
function createUserManual() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // ── Slide 1: Title ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    s.addShape('rect', { x:0, y:2.8, w:13.33, h:2.0, fill:{color:'162e4d'}, line:{type:'none'} });
    s.addShape('rect', { x:0, y:6.9, w:13.33, h:0.6, fill:{color:C.orange}, line:{type:'none'} });
    s.addText('🚚  Truck Tracker', { x:0, y:0.8, w:13.33, h:1.2, fontSize:52, bold:true, color:C.white, align:'center', fontFace:FONT });
    s.addText('ドライバー向け 操作マニュアル', { x:0, y:3.0, w:13.33, h:0.8, fontSize:26, color:C.lightBlue, align:'center', fontFace:FONT });
    s.addText('スマートフォン用 ― 操作の流れと画面説明', { x:0, y:3.8, w:13.33, h:0.6, fontSize:16, color:'aabbdd', align:'center', fontFace:FONT });
    s.addText('配送記録を「出発」「到着」ボタンだけで登録できます', { x:0, y:5.8, w:13.33, h:0.5, fontSize:14, color:'8899bb', align:'center', fontFace:FONT, italic:true });
  }

  // ── Slide 2: 概要 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'このアプリでできること', 'ドライバーが毎日使う配送記録ツールです');
    const items = [
      { emoji:'📍', t:'配送を記録する',      d:'出発・到着をボタン1つで記録。難しい操作は一切ありません。' },
      { emoji:'📦', t:'重量を入力する',       d:'各届け先での配送重量（kg）を入力します。' },
      { emoji:'🏢', t:'事務所とリアルタイム共有', d:'操作するとすぐに事務所の管理画面に反映されます。' },
      { emoji:'🔄', t:'ブラウザを閉じても安心', d:'途中でスマホを閉じても、開き直すと続きから再開できます。' },
    ];
    items.forEach((item, i) => {
      const x = (i % 2) === 0 ? 0.5 : 7.0;
      const y = Math.floor(i / 2) * 2.7 + 1.2;
      s.addShape('roundRect', { x, y, w:5.8, h:2.3, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.12,
        shadow:{type:'outer',color:'bbccdd',opacity:0.5,blur:6,offset:3,angle:45} });
      s.addText(item.emoji, { x:x+0.25, y:y+0.25, w:0.8, h:0.8, fontSize:30, fontFace:FONT });
      s.addText(item.t, { x:x+1.0, y:y+0.2, w:4.5, h:0.5, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
      s.addText(item.d, { x:x+1.0, y:y+0.72, w:4.5, h:1.2, fontSize:12, color:C.black, fontFace:FONT, wrap:true });
    });
  }

  // ── Slide 3: アプリの起動方法 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'アプリの開き方', 'スマートフォンのブラウザで開きます');
    // Left: phone mockup showing home screen
    drawPhone(s, 0.4, 0.95, [
      { type:'label', y:0.1, text:'ブラウザが開いたら\n自動的にアプリが表示されます', size:9, color:C.darkGrey },
      { type:'badge', y:0.5, h:0.35, text:'読み込み中...', color:C.lightBlue, textColor:C.blue },
    ]);
    // Right: steps
    s.addText('起動の手順', { x:4.6, y:1.0, w:8.3, h:0.5, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.55, 1, 'ブラウザを開く', 'スマートフォンのChromeやSafariを起動します');
    addStep(s, 4.6, 2.65, 2, 'URLを入力する', '担当者から教えてもらったアドレスを入力します\n（例: https://○○○.netlify.app）');
    addStep(s, 4.6, 3.85, 3, 'ホーム画面に追加すると便利', 'ブラウザの「ホーム画面に追加」を使うと、次回からアイコンをタップするだけで開けます');
    addNote(s, 4.6, 5.6, 8.3, 'URLは毎回同じです。ブックマークに保存しておきましょう。', 'tip');
  }

  // ── Slide 4: ホーム画面（タブ選択） ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'ホーム画面の見方', '「計画」タブと「フリー」タブがあります');
    drawPhone(s, 0.4, 0.95, [
      { type:'tabs', y:0.0, h:0.42, active:0 },
      { type:'label', y:0.55, text:'今日の配送計画', bold:true, size:10, color:C.navy },
      { type:'listitem', y:0.9, h:0.55, text:'🗓️ 2026/04/17 市内1コース\n重量: 350kg / 5件' },
      { type:'listitem', y:1.52, h:0.55, text:'🗓️ 2026/04/17 郊外2コース\n重量: 180kg / 3件' },
    ]);
    // Callouts
    addCallout(s, 1, 2.8, 1.45);
    addCallout(s, 2, 2.8, 2.05);
    addCallout(s, 3, 2.8, 3.1);

    // Right side explanations
    s.addText('タブの使い分け', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    const rows = [
      { num:'①', label:'「計画」タブ（通常はこちらを使用）', desc:'事務所が事前に登録した配送計画を選んで開始します。重量も自動で読み込まれます。' },
      { num:'②', label:'「フリー」タブ', desc:'計画がない場合や、臨時の配送に使います。車輌・日付・コースを自分で選びます。' },
      { num:'③', label:'計画の一覧', desc:'今日の配送計画が一覧表示されます。自分が担当する計画をタップして選びます。' },
    ];
    rows.forEach((r, i) => {
      const y = 1.55 + i * 1.65;
      s.addShape('roundRect', { x:4.6, y, w:8.3, h:1.45, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.08 });
      s.addShape('ellipse', { x:4.75, y:y+0.1, w:0.42, h:0.42, fill:{color:C.orange}, line:{type:'none'} });
      s.addText(r.num, { x:4.75, y:y+0.14, w:0.42, h:0.28, fontSize:13, bold:true, color:C.white, align:'center', fontFace:FONT });
      s.addText(r.label, { x:5.3, y:y+0.1, w:7.4, h:0.4, fontSize:13, bold:true, color:C.navy, fontFace:FONT });
      s.addText(r.desc, { x:5.3, y:y+0.55, w:7.4, h:0.75, fontSize:11.5, color:C.black, fontFace:FONT, wrap:true });
    });
  }

  // ── Slide 5: STEP1 配送計画を選ぶ ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'STEP 1 ｜ 配送計画を選ぶ', '「計画」タブで今日の計画を確認してタップします');
    drawPhone(s, 0.4, 0.95, [
      { type:'tabs', y:0.0, h:0.42, active:0 },
      { type:'label', y:0.55, text:'今日の配送計画', bold:true, size:10, color:C.navy },
      { type:'listitem', y:0.9, h:0.65, text:'▶ 市内1コース\n重量 350kg・5件・車輌 未割当' },
      { type:'listitem', y:1.62, h:0.65, text:'▶ 郊外2コース\n重量 180kg・3件・車輌 未割当' },
      { type:'label', y:2.4, text:'↑ 自分の担当をタップして選択', size:9, color:C.blue },
    ]);
    addCallout(s, 1, 2.8, 2.0);

    s.addText('操作の流れ', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.6, 1, '「計画」タブが開いているか確認', '画面上部の「計画」タブが白くなっていれば選択済みです');
    addStep(s, 4.6, 2.75, 2, '今日の計画を確認する', '自分が担当するコースの配送計画が一覧表示されます');
    addStep(s, 4.6, 3.85, 3, '担当する計画をタップする', '計画をタップすると、次の画面（車輌選択）に進みます');
    addNote(s, 4.6, 5.25, 8.3, '計画が表示されない場合は、事務所に配送計画の登録を依頼してください。', 'warn');
  }

  // ── Slide 6: STEP2 車輌選択・出発前 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'STEP 2 ｜ 車輌を確認して出発する', '担当車輌を選び「出発」ボタンを押します');
    drawPhone(s, 0.4, 0.95, [
      { type:'label', y:0.1, text:'出発前の確認', bold:true, size:11, color:C.navy },
      { type:'label', y:0.45, text:'コース: 市内1', size:10, color:C.darkGrey },
      { type:'label', y:0.7, text:'次の届け先', bold:true, size:10, color:C.navy },
      { type:'badge', y:1.0, h:0.45, text:'▲ 株式会社○○', color:C.lightBlue, textColor:C.navy, bold:true },
      { type:'label', y:1.6, text:'車輌を選ぶ', bold:true, size:10, color:C.navy },
      { type:'listitem', y:1.9, h:0.38, text:'🚚 1号車 (3.5t)' },
      { type:'listitem', y:2.35, h:0.38, text:'🚚 2号車 (4t)' },
      { type:'btn', y:3.0, h:0.5, text:'出発 ▶', color:C.green },
    ]);
    addCallout(s, 1, 2.75, 2.15);
    addCallout(s, 2, 2.75, 3.2);

    s.addText('操作の流れ', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.6, 1, 'コースと最初の届け先を確認する', '自動的に最初の届け先が表示されます。確認してください');
    addStep(s, 4.6, 2.75, 2, '担当する車輌をタップして選ぶ', '一覧から今日乗る車輌をタップして選択します');
    addStep(s, 4.6, 3.85, 3, '「出発」ボタンを押す', '緑の「出発」ボタンを押すと配送がスタートします');
    addNote(s, 4.6, 5.25, 8.3, '別の届け先を先に配達したい場合は「別の届け先を選ぶ」をタップして変更できます。', 'tip');
  }

  // ── Slide 7: STEP3 移動中 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'STEP 3 ｜ 移動中の画面', '目的地に向かいながら、到着したら「到着」を押します');
    drawPhone(s, 0.4, 0.95, [
      { type:'badge', y:0.05, h:0.35, text:'稼働中', color:'d4edda', textColor:'155724', bold:true },
      { type:'label', y:0.55, text:'配送先', size:9, color:C.darkGrey },
      { type:'bigText', y:0.82, text:'株式会社○○', size:14, color:C.navy },
      { type:'divider', y:1.3 },
      { type:'label', y:1.4, text:'出発時刻', size:9, color:C.darkGrey },
      { type:'label', y:1.65, text:'08:35', size:18, color:C.black, bold:true },
      { type:'label', y:2.05, text:'経過時間', size:9, color:C.darkGrey },
      { type:'label', y:2.3, text:'00:12:45', size:18, color:C.blue, bold:true },
      { type:'btn', y:3.0, h:0.55, text:'到着 📍', color:C.orange },
    ]);
    addCallout(s, 1, 2.75, 1.0);
    addCallout(s, 2, 2.75, 2.42);
    addCallout(s, 3, 2.75, 3.25);

    s.addText('移動中の画面の見方', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.6, 1, '配送先を確認する', '現在向かっている届け先の名前が表示されています');
    addStep(s, 4.6, 2.75, 2, '経過時間が自動カウントされる', '出発してからの時間が自動で表示されます（操作は不要）');
    addStep(s, 4.6, 3.85, 3, '到着したら「到着」ボタンを押す', '届け先に着いたらオレンジの「到着」ボタンを押します');
    addNote(s, 4.6, 5.25, 8.3, 'この画面ではスマホを閉じたままでOKです。到着してから画面を開いて「到着」を押してください。', 'tip');
  }

  // ── Slide 8: STEP4 到着・重量入力 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'STEP 4 ｜ 到着・重量を入力する', '届け先に着いたら重量を入力します');
    drawPhone(s, 0.4, 0.95, [
      { type:'label', y:0.05, text:'到着しました', bold:true, size:11, color:C.green },
      { type:'label', y:0.35, text:'配送先: 株式会社○○', size:10, color:C.black },
      { type:'label', y:0.65, text:'配送重量 (kg)', bold:true, size:10, color:C.navy },
      { type:'input', y:0.95, h:0.48, label:'例: 125.5' },
      { type:'divider', y:1.6 },
      { type:'label', y:1.7, text:'次の届け先', bold:true, size:10, color:C.navy },
      { type:'listitem', y:2.0, h:0.38, text:'▼ △△商店' },
      { type:'btn', y:2.55, h:0.48, text:'次の届け先へ出発 ▶', color:C.green },
      { type:'btn', y:3.1, h:0.42, text:'帰社へ', color:C.darkGrey },
    ]);
    addCallout(s, 1, 2.75, 1.2);
    addCallout(s, 2, 2.75, 2.75);
    addCallout(s, 3, 2.75, 3.35);

    s.addText('操作の流れ', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.6, 1, '重量（kg）を入力する', '数字キーで配送重量を入力します。小数点も入力できます');
    addStep(s, 4.6, 2.75, 2, '次の届け先を選んで「出発」を押す', '次に向かう届け先を選択して「次の届け先へ出発」を押します');
    addStep(s, 4.6, 3.85, 3, '全件終わったら「帰社へ」を押す', 'すべての配達が終わったら「帰社へ」ボタンで帰社フローに進みます');
    addNote(s, 4.6, 5.25, 8.3, '配達の途中でも「帰社へ」を押して帰社できます。全件終わらなくても大丈夫です。', 'tip');
  }

  // ── Slide 9: STEP5 帰社ODO入力 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'STEP 5 ｜ 帰社する（ODOメーター入力）', '帰社したらメーターを確認して入力します');
    drawPhone(s, 0.4, 0.95, [
      { type:'label', y:0.05, text:'帰社の記録', bold:true, size:11, color:C.navy },
      { type:'label', y:0.4, text:'お疲れ様でした！\n帰社時のODOメーターを入力してください', size:9.5, color:C.black },
      { type:'label', y:1.05, text:'帰社時ODO (km)', bold:true, size:10, color:C.navy },
      { type:'input', y:1.35, h:0.48, label:'例: 12580' },
      { type:'label', y:1.95, text:'前回帰社時: 12345 km', size:8.5, color:C.midGrey },
      { type:'btn', y:2.7, h:0.55, text:'帰社を記録する ✓', color:C.navy },
    ]);
    addCallout(s, 1, 2.75, 1.55);
    addCallout(s, 2, 2.75, 2.95);

    s.addText('操作の流れ', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.6, 1, '車に乗ったままODOメーターを確認する', 'ダッシュボードの走行距離計（ODOメーター）の数字を確認します');
    addStep(s, 4.6, 2.75, 2, 'km数を入力する', 'ODOメーターの数字をそのまま入力してください');
    addStep(s, 4.6, 3.85, 3, '「帰社を記録する」を押す', 'ボタンを押すと今日の配送記録が確定します');
    addNote(s, 4.6, 5.25, 8.3, 'ODOは走行距離の管理に使います。入力した値が次回出発時の参考値になります。', 'tip');
  }

  // ── Slide 10: STEP6 完了 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'STEP 6 ｜ 完了！', '今日の配送記録が確定しました');
    drawPhone(s, 0.4, 0.95, [
      { type:'badge', y:0.1, h:0.45, text:'✅ 配送完了！', color:'d4edda', textColor:'155724', bold:true },
      { type:'label', y:0.7, text:'本日の配送サマリー', bold:true, size:10, color:C.navy },
      { type:'listitem', y:1.05, h:0.38, text:'🚚 コース: 市内1' },
      { type:'listitem', y:1.5, h:0.38, text:'📦 総重量: 530 kg' },
      { type:'listitem', y:1.95, h:0.38, text:'📍 配達件数: 5件' },
      { type:'listitem', y:2.4, h:0.38, text:'🛣️ 走行距離: 235 km' },
      { type:'btn', y:3.1, h:0.48, text:'新しい日報を開始', color:C.blue },
    ]);

    s.addText('完了後の確認', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    s.addText('お疲れ様でした！今日の配送記録が自動的に事務所に送信されました。', {
      x:4.6, y:1.55, w:8.3, h:0.7, fontSize:13, color:C.black, fontFace:FONT, wrap:true,
    });
    const items = [
      { t:'総重量', d:'今日配達した荷物の合計重量（kg）' },
      { t:'配達件数', d:'今日訪問した届け先の数' },
      { t:'走行距離', d:'出発時〜帰社時のODO差分（km）' },
    ];
    items.forEach((item, i) => {
      s.addShape('roundRect', { x:4.6, y:2.55 + i*1.4, w:8.3, h:1.2, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.08 });
      s.addText('▶ '+item.t, { x:4.85, y:2.65+i*1.4, w:7.8, h:0.38, fontSize:13, bold:true, color:C.navy, fontFace:FONT });
      s.addText(item.d, { x:4.85, y:3.05+i*1.4, w:7.8, h:0.38, fontSize:11.5, color:C.black, fontFace:FONT });
    });
  }

  // ── Slide 11: フリーモード ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'フリーモードの使い方', '計画がない場合や臨時の配送に使います（フリータブ）');
    drawPhone(s, 0.4, 0.95, [
      { type:'tabs', y:0.0, h:0.42, active:1 },
      { type:'label', y:0.55, text:'支店', size:9, color:C.darkGrey },
      { type:'listitem', y:0.8, h:0.35, text:'本社' },
      { type:'label', y:1.25, text:'車輌', size:9, color:C.darkGrey },
      { type:'listitem', y:1.5, h:0.35, text:'1号車 (3.5t)' },
      { type:'label', y:1.95, text:'日付', size:9, color:C.darkGrey },
      { type:'listitem', y:2.2, h:0.35, text:'2026/04/17（木）' },
      { type:'label', y:2.65, text:'コース', size:9, color:C.darkGrey },
      { type:'listitem', y:2.9, h:0.35, text:'市内1（月・水・金）' },
      { type:'btn', y:3.45, h:0.48, text:'次へ ▶', color:C.blue },
    ]);
    addCallout(s, 1, 2.75, 0.98);
    addCallout(s, 2, 2.75, 1.68);
    addCallout(s, 3, 2.75, 3.0);
    addCallout(s, 4, 2.75, 3.65);

    s.addText('フリーモードの操作', { x:4.6, y:1.0, w:8.3, h:0.45, fontSize:17, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 4.6, 1.55, 1, '「フリー」タブをタップ', '画面上部の「フリー」タブをタップします');
    addStep(s, 4.6, 2.6, 2, '車輌と日付を選ぶ', '担当する車輌と日付を選択します（日付は自動で今日になります）');
    addStep(s, 4.6, 3.65, 3, 'コースを選ぶ', '担当するコースをリストから選びます（今日の曜日に対応したコースのみ表示）');
    addStep(s, 4.6, 4.7, 4, '「次へ」ボタンを押す', '以降はSTEP 2以降と同じ流れで配送を記録します');
    addNote(s, 4.6, 5.9, 8.3, '通常は「計画」タブを使ってください。フリーモードは緊急時や計画外の配送向けです。', 'warn');
  }

  // ── Slide 12: 困ったとき ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'こんなときは？', '困ったときの対処法');

    const qaItems = [
      { q:'スマホを閉じてしまった', a:'再度ブラウザで同じURLを開くと、続きの画面から再開できます。記録は消えていません。' },
      { q:'「出発」を押してしまった（間違い）', a:'画面に「取消」ボタンが表示されています。押すと1つ前の状態に戻ります。' },
      { q:'今日の計画が表示されない', a:'事務所に配送計画が登録されているか確認してもらってください。または「フリー」タブを使ってください。' },
      { q:'画面が動かない・エラーが出る', a:'ページを再読み込み（更新）してみてください。それでも解決しない場合は事務所に連絡してください。' },
    ];

    qaItems.forEach((qa, i) => {
      const x = 0.4, y = 1.2 + i * 1.5;
      s.addShape('roundRect', { x, y, w:12.5, h:1.35, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.1 });
      s.addShape('roundRect', { x:x+0.05, y:y+0.07, w:0.6, h:0.38, fill:{color:C.orange}, line:{type:'none'}, rectRadius:0.05 });
      s.addText('Q', { x:x+0.05, y:y+0.1, w:0.6, h:0.28, fontSize:14, bold:true, color:C.white, align:'center', fontFace:FONT });
      s.addText(qa.q, { x:x+0.75, y:y+0.1, w:11.5, h:0.35, fontSize:13, bold:true, color:C.navy, fontFace:FONT });
      s.addText('→ '+qa.a, { x:x+0.75, y:y+0.52, w:11.5, h:0.65, fontSize:11.5, color:C.black, fontFace:FONT, wrap:true });
    });
  }

  // ── Slide 13: 操作の全体フロー（まとめ） ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    s.addText('操作の流れ まとめ', { x:0, y:0.2, w:13.33, h:0.7, fontSize:26, bold:true, color:C.white, align:'center', fontFace:FONT });

    const steps = [
      { n:1, t:'計画を選ぶ', d:'計画タブ', c:'2980b9' },
      { n:2, t:'車輌を選んで\n出発を押す', d:'出発前画面', c:'16a085' },
      { n:3, t:'目的地へ移動', d:'移動中画面', c:'8e44ad' },
      { n:4, t:'「到着」を押す\n重量を入力', d:'到着後画面', c:'d35400' },
      { n:5, t:'全件配達後\n「帰社へ」', d:'帰社前画面', c:'c0392b' },
      { n:6, t:'ODOを入力して\n帰社記録', d:'帰社画面', c:'27ae60' },
    ];

    steps.forEach((step, i) => {
      const x = 0.4 + i * 2.1;
      // Card
      s.addShape('roundRect', { x, y:1.1, w:1.9, h:4.5, fill:{color:step.c}, line:{type:'none'}, rectRadius:0.12 });
      // Number circle
      s.addShape('ellipse', { x:x+0.72, y:1.2, w:0.5, h:0.5, fill:{color:'FFFFFF'}, line:{type:'none'} });
      s.addText(String(step.n), { x:x+0.72, y:1.24, w:0.5, h:0.38, fontSize:14, bold:true, color:step.c, align:'center', fontFace:FONT });
      // Title
      s.addText(step.t, { x:x+0.05, y:1.85, w:1.8, h:1.4, fontSize:12, bold:true, color:C.white, align:'center', fontFace:FONT, wrap:true });
      // Sub label
      s.addShape('rect', { x, y:4.8, w:1.9, h:0.55, fill:{color:'1a1a2e'}, line:{type:'none'} });
      s.addText(step.d, { x, y:4.85, w:1.9, h:0.45, fontSize:9, color:'dddddd', align:'center', fontFace:FONT });
      // Arrow
      if (i < steps.length - 1) {
        s.addText('→', { x:x+1.95, y:2.8, w:0.3, h:0.5, fontSize:18, color:'aabbdd', align:'center', fontFace:FONT });
      }
    });

    s.addText('この流れを毎回繰り返します', {
      x:0, y:5.8, w:13.33, h:0.5, fontSize:14, color:'aabbdd', align:'center', fontFace:FONT, italic:true,
    });
  }

  pptx.writeFile({ fileName: path.join('docs', "user's-manual.pptx") });
  console.log("✅ ドライバー用マニュアル作成完了: docs/user's-manual.pptx");
}

// ─────────────────────────────────────────────
// ADMIN MANUAL
// ─────────────────────────────────────────────
function createAdminManual() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // ── Slide 1: Title ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    s.addShape('rect', { x:0, y:2.8, w:13.33, h:2.0, fill:{color:'162e4d'}, line:{type:'none'} });
    s.addShape('rect', { x:0, y:6.9, w:13.33, h:0.6, fill:{color:C.orange}, line:{type:'none'} });
    s.addText('🚚  Truck Tracker', { x:0, y:0.8, w:13.33, h:1.2, fontSize:52, bold:true, color:C.white, align:'center', fontFace:FONT });
    s.addText('管理者向け 操作マニュアル', { x:0, y:3.0, w:13.33, h:0.8, fontSize:26, color:C.lightBlue, align:'center', fontFace:FONT });
    s.addText('管理画面（PC・タブレット）の使い方', { x:0, y:3.8, w:13.33, h:0.6, fontSize:16, color:'aabbdd', align:'center', fontFace:FONT });
    s.addText('配送計画の登録・車両監視・データ管理ができます', { x:0, y:5.8, w:13.33, h:0.5, fontSize:14, color:'8899bb', align:'center', fontFace:FONT, italic:true });
  }

  // ── Slide 2: 管理画面の構成 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, '管理画面の構成', 'PCまたはタブレットから操作します');
    drawBrowser(s, 0.3, 1.0, [{ type:'activeNav', label:'Dashboard' }]);

    s.addText('メニューの一覧', { x:9.0, y:1.0, w:4.0, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    const menus = [
      { icon:'📊', n:'Dashboard',  d:'今日の配送状況をリアルタイム確認' },
      { icon:'📅', n:'配送計画',   d:'ドライバー用の配送計画を登録' },
      { icon:'📝', n:'日報編集',   d:'記録の修正（準備中）' },
      { icon:'📈', n:'レポート',   d:'月次グラフ・走行距離' },
      { icon:'⬇️', n:'CSVダウンロード', d:'配送データをExcelで取り出す' },
      { icon:'🗂️', n:'マスタ管理', d:'支店・車輌・配達先・コースの設定' },
    ];
    menus.forEach((m, i) => {
      s.addShape('roundRect', { x:9.0, y:1.55+i*0.85, w:4.0, h:0.75, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.07 });
      s.addText(m.icon+' '+m.n, { x:9.15, y:1.62+i*0.85, w:3.7, h:0.3, fontSize:11, bold:true, color:C.navy, fontFace:FONT });
      s.addText(m.d, { x:9.15, y:1.94+i*0.85, w:3.7, h:0.28, fontSize:9.5, color:C.darkGrey, fontFace:FONT });
    });
  }

  // ── Slide 3: Dashboard ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'Dashboard ｜ 今日の配送状況を確認する', '車両の稼働状況がリアルタイムで更新されます');
    drawBrowser(s, 0.3, 1.0, [
      { type:'activeNav', label:'Dashboard' },
      { type:'heading', x:0.2, y:0.5, text:'Dashboard  ●ライブ', size:14 },
      { type:'subtext', x:0.2, y:0.95, text:'2026年4月17日（木）  本日の配送状況' },
      { type:'summaryCards', x:0.2, y:1.3, w:6.6, h:1.05,
        cards:[
          {label:'出庫前', value:'2台', color:'e8f0fe', textColor:'1a56db'},
          {label:'稼働中', value:'3台', color:'fef3c7', textColor:'d97706'},
          {label:'帰社済', value:'1台', color:'d1fae5', textColor:'059669'},
        ]
      },
      { type:'card', x:0.2, y:2.5, w:6.6, h:2.5, title:'車輌別ステータス',
        body:'1号車  市内1  稼働中  現在地: ○○商店\n2号車  郊外2  稼働中  現在地: △△工業\n3号車  市内2  出庫前\n4号車  —     帰社済  14:35帰社' },
    ]);

    addCallout(s, 1, 4.7, 2.3);
    addCallout(s, 2, 4.7, 3.75);

    s.addText('画面の見方', { x:9.1, y:1.0, w:3.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 9.1, 1.55, 1, 'サマリーカード', '「出庫前」「稼働中」「帰社済」の台数がひと目でわかります');
    addStep(s, 9.1, 2.7, 2, '車輌別ステータス表', '各車輌が今どこにいるか、何をしているかが確認できます');
    addStep(s, 9.1, 3.85, 3, '自動更新', 'ドライバーが操作するたびに自動で画面が更新されます');
    addNote(s, 9.1, 5.25, 3.9, '更新されない場合は「更新」ボタンを押してください。', 'tip');
  }

  // ── Slide 4: 配送計画 作成 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, '配送計画 ｜ 計画を作成する', 'ドライバーが出発する前日までに登録しておきます');
    drawBrowser(s, 0.3, 1.0, [
      { type:'activeNav', label:'配送計画' },
      { type:'heading', x:0.2, y:0.5, text:'配送計画', size:14 },
      { type:'subtext', x:0.2, y:0.9, text:'日付・コースを選択して計画を事前登録します' },
      { type:'card', x:0.2, y:1.25, w:6.6, h:1.4, title:'📅 計画を作成' },
      { type:'input', x:0.4, y:1.7, w:1.5, h:0.42, label:'日付' },
      { type:'input', x:2.1, y:1.7, w:2.5, h:0.42, label:'コース' },
      // delivery rows
      { type:'row', x:0.2, y:2.85, w:6.6, h:0.35,
        cols:[
          {text:'届け先', bg:'f0f4f8', bold:true, w:0.5},
          {text:'重量 (kg)', bg:'f0f4f8', bold:true, w:0.5},
        ]
      },
      { type:'row', x:0.2, y:3.2, w:6.6, h:0.33,
        cols:[{text:'株式会社○○', w:0.5},{text:'125.5', w:0.5}]
      },
      { type:'row', x:0.2, y:3.53, w:6.6, h:0.33,
        cols:[{text:'△△商店', w:0.5},{text:'88', w:0.5}]
      },
      { type:'btn', x:0.2, y:4.0, w:2.0, h:0.4, text:'計画を保存' },
    ]);
    addCallout(s, 1, 4.7, 1.8);
    addCallout(s, 2, 4.7, 2.85);
    addCallout(s, 3, 4.7, 4.2);

    s.addText('計画の作成手順', { x:9.1, y:1.0, w:3.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 9.1, 1.55, 1, '日付とコースを選ぶ', '配送日とコースを選ぶと、届け先の一覧が自動で表示されます');
    addStep(s, 9.1, 2.7, 2, '各届け先に重量を入力する', '配送予定の重量（kg）を入力します\n※重量を入力した届け先のみ計画に含まれます');
    addStep(s, 9.1, 3.9, 3, '「計画を保存」を押す', '保存するとドライバーのスマホに計画が表示されます');
    addNote(s, 9.1, 5.25, 3.9, '重量が1件も入力されていない場合は保存できません。', 'warn');
  }

  // ── Slide 5: 配送計画 一覧確認 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, '配送計画 ｜ 計画の一覧を確認する', '登録済みの計画の状況が確認できます');
    drawBrowser(s, 0.3, 1.0, [
      { type:'activeNav', label:'配送計画' },
      { type:'heading', x:0.2, y:0.5, text:'計画一覧（直近）', size:13 },
      { type:'row', x:0.2, y:0.95, w:6.6, h:0.35,
        cols:[
          {text:'日付', bg:'f0f4f8', bold:true, w:0.18},
          {text:'コース', bg:'f0f4f8', bold:true, w:0.22},
          {text:'件数', bg:'f0f4f8', bold:true, w:0.12},
          {text:'総重量', bg:'f0f4f8', bold:true, w:0.15},
          {text:'ステータス', bg:'f0f4f8', bold:true, w:0.2},
          {text:'車輌', bg:'f0f4f8', bold:true, w:0.13},
        ]
      },
      { type:'row', x:0.2, y:1.3, w:6.6, h:0.33,
        cols:[
          {text:'04/17', w:0.18},
          {text:'市内1', w:0.22},
          {text:'5件', w:0.12},
          {text:'530kg', w:0.15},
          {text:'✅ 完了', color:'27ae60', bold:true, w:0.2},
          {text:'1号車', w:0.13},
        ]
      },
      { type:'row', x:0.2, y:1.63, w:6.6, h:0.33,
        cols:[
          {text:'04/17', w:0.18},
          {text:'郊外2', w:0.22},
          {text:'3件', w:0.12},
          {text:'180kg', w:0.15},
          {text:'🚚 配送中', color:C.orange, bold:true, w:0.2},
          {text:'2号車', w:0.13},
        ]
      },
      { type:'row', x:0.2, y:1.96, w:6.6, h:0.33,
        cols:[
          {text:'04/18', w:0.18},
          {text:'市内2', w:0.22},
          {text:'4件', w:0.12},
          {text:'320kg', w:0.15},
          {text:'📋 計画済', color:C.blue, bold:true, w:0.2},
          {text:'未割当', color:C.midGrey, w:0.13},
        ]
      },
    ]);
    addCallout(s, 1, 4.7, 1.5);
    addCallout(s, 2, 4.7, 2.1);

    s.addText('ステータスの見方', { x:9.1, y:1.0, w:3.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    const statuses = [
      { badge:'📋 計画済', c:C.blue, d:'計画は登録済み。ドライバーがまだ出発していない状態' },
      { badge:'🚚 配送中', c:C.orange, d:'ドライバーが出発して配送中の状態' },
      { badge:'✅ 完了',   c:C.green, d:'帰社記録まで完了した状態' },
    ];
    statuses.forEach((st, i) => {
      s.addShape('roundRect', { x:9.1, y:1.6+i*1.55, w:3.9, h:1.35, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.08 });
      s.addShape('roundRect', { x:9.2, y:1.68+i*1.55, w:1.8, h:0.38, fill:{color:st.c}, line:{type:'none'}, rectRadius:0.05 });
      s.addText(st.badge, { x:9.2, y:1.68+i*1.55, w:1.8, h:0.38, fontSize:10, bold:true, color:C.white, align:'center', fontFace:FONT });
      s.addText(st.d, { x:9.15, y:2.1+i*1.55, w:3.7, h:0.6, fontSize:10.5, color:C.black, fontFace:FONT, wrap:true });
    });
    addNote(s, 9.1, 6.25, 3.9, '一覧は直近の計画が表示されます。「更新」で最新状態を確認できます。', 'tip');
  }

  // ── Slide 6: レポート ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'レポート ｜ 月次グラフで実績を確認する', '直近1か月の配送実績をグラフで確認できます');
    drawBrowser(s, 0.3, 1.0, [
      { type:'activeNav', label:'レポート' },
      { type:'heading', x:0.2, y:0.5, text:'レポート', size:14 },
      { type:'subtext', x:0.2, y:0.92, text:'直近1か月の走行距離・総重量・配送回数  支店: すべて ▼' },
      { type:'card', x:0.2, y:1.25, w:6.6, h:1.3, title:'📦 総重量（kg）',
        body:'棒グラフ表示 ━━━━━━━━━━━━━━━━━━━━━\n（日別の配送重量の棒グラフが表示されます）' },
      { type:'card', x:0.2, y:2.7, w:6.6, h:1.2, title:'🔄 配送回数',
        body:'棒グラフ表示 ━━━━━━━━━━━━━━━━━━━━━' },
      { type:'card', x:0.2, y:4.05, w:6.6, h:1.2, title:'🛣️ 走行距離（km）',
        body:'折れ線グラフ表示 ─────────────────────' },
    ]);
    addCallout(s, 1, 4.7, 1.5);
    addCallout(s, 2, 4.7, 2.0);
    addCallout(s, 3, 4.7, 2.9);

    s.addText('グラフの見方', { x:9.1, y:1.0, w:3.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 9.1, 1.55, 1, '支店フィルター', '「すべて」または特定の支店を選んでデータを絞り込めます');
    addStep(s, 9.1, 2.65, 2, '総重量グラフ', '日ごとの配送重量（kg）の合計を棒グラフで確認できます');
    addStep(s, 9.1, 3.7, 3, '走行距離グラフ', '各車輌の走行距離の合計を折れ線グラフで確認できます');
    addNote(s, 9.1, 5.2, 3.9, 'グラフは直近30日分が自動表示されます。', 'tip');
  }

  // ── Slide 7: CSVダウンロード ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'CSVダウンロード ｜ データをExcelで取り出す', '日付範囲・支店・車輌で絞り込んでダウンロードできます');
    drawBrowser(s, 0.3, 1.0, [
      { type:'activeNav', label:'CSV' },
      { type:'heading', x:0.2, y:0.5, text:'CSVダウンロード', size:14 },
      { type:'subtext', x:0.2, y:0.92, text:'日付範囲・支店・車輌でフィルタして配送記録をダウンロード' },
      { type:'subtext', x:0.2, y:1.2, text:'種類:  得意先別集計  |  車輌別集計  |  ジャーナル形式', size:9 },
      { type:'input', x:0.2, y:1.55, w:1.5, h:0.4, label:'開始日' },
      { type:'input', x:1.85, y:1.55, w:1.5, h:0.4, label:'終了日' },
      { type:'input', x:3.5, y:1.55, w:1.3, h:0.4, label:'支店' },
      { type:'input', x:5.0, y:1.55, w:1.5, h:0.4, label:'車輌' },
      { type:'btn', x:0.2, y:2.1, w:2.0, h:0.4, text:'プレビュー', color:C.darkGrey },
      { type:'btn', x:2.4, y:2.1, w:2.5, h:0.4, text:'CSVダウンロード ⬇️', color:C.blue },
      { type:'card', x:0.2, y:2.65, w:6.6, h:2.4, title:'プレビュー',
        body:'得意先コード | 配達先名 | 件数 | 総重量(kg)\n00001 | 株式会社○○ | 12 | 1,560\n00002 | △△商店 | 8 | 820\n...' },
    ]);
    addCallout(s, 1, 4.7, 1.2);
    addCallout(s, 2, 4.7, 1.7);
    addCallout(s, 3, 4.7, 2.3);

    s.addText('ダウンロードの手順', { x:9.1, y:1.0, w:3.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 9.1, 1.55, 1, '種類を選ぶ', '得意先別・車輌別・ジャーナルから目的に合った形式を選びます');
    addStep(s, 9.1, 2.65, 2, '日付・支店・車輌を指定する', '絞り込みたい条件を入力します（すべて省略すると全データ）');
    addStep(s, 9.1, 3.75, 3, '「プレビュー」で内容を確認する', 'ダウンロード前にデータの内容を画面で確認できます');
    addStep(s, 9.1, 4.8, 4, '「CSVダウンロード」を押す', 'CSVファイルが自動的にダウンロードされます。Excelで開けます。');
    addNote(s, 9.1, 6.1, 3.9, 'プレビューを押してからでないとダウンロードボタンが有効になりません。', 'warn');
  }

  // ── Slide 8: マスタ管理 概要 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'マスタ管理 ｜ 基本情報を登録・編集する', '支店・車輌・配達先・コースの設定を行います');
    s.addText('マスタ管理とは？', { x:0.4, y:1.1, w:12.5, h:0.45, fontSize:16, bold:true, color:C.navy, fontFace:FONT });
    s.addText('配送に必要な基本情報（支店・車輌・届け先・コース）を登録・管理する機能です。\n新しい車輌や届け先が増えたときにここで追加します。',
      { x:0.4, y:1.6, w:12.5, h:0.8, fontSize:13, color:C.black, fontFace:FONT, wrap:true });

    const masters = [
      { icon:'🏢', t:'支店', d:'支店名・会社の拠点を管理します\n例）本社、東支店' },
      { icon:'🚚', t:'車輌', d:'車輌名・最大積載量を管理します\n例）1号車 (3.5t)' },
      { icon:'📍', t:'配達先', d:'届け先の名前・コードを管理します\n例）株式会社○○' },
      { icon:'🗺️', t:'コース', d:'配送コース名・運行曜日を管理します\n例）市内1（月・水・金）' },
      { icon:'📋', t:'コース配達先', d:'コースに含まれる届け先と順番を設定します' },
    ];
    masters.forEach((m, i) => {
      const x = 0.4 + (i % 3) * 4.2;
      const y = 2.55 + Math.floor(i / 3) * 2.3;
      s.addShape('roundRect', { x, y, w:3.9, h:2.1, fill:{color:C.white}, line:{color:'ccddee',width:1}, rectRadius:0.12,
        shadow:{type:'outer',color:'bbccdd',opacity:0.4,blur:5,offset:3,angle:45} });
      s.addText(m.icon, { x:x+0.15, y:y+0.2, w:0.7, h:0.7, fontSize:28, fontFace:FONT });
      s.addText(m.t, { x:x+0.8, y:y+0.15, w:2.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
      s.addText(m.d, { x:x+0.15, y:y+0.75, w:3.6, h:1.1, fontSize:11, color:C.black, fontFace:FONT, wrap:true });
    });
  }

  // ── Slide 9: マスタ管理 操作方法 ──────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    addSlideTitle(s, 'マスタ管理 ｜ 追加・編集・削除の方法', 'どのマスタも同じ操作で管理できます');
    drawBrowser(s, 0.3, 1.0, [
      { type:'activeNav', label:'Dashboard' },
      { type:'heading', x:0.2, y:0.5, text:'車輌マスタ', size:14 },
      { type:'subtext', x:0.2, y:0.92, text:'車輌の追加・編集・削除を行います' },
      { type:'btn', x:5.8, y:0.5, w:0.8, h:0.4, text:'+ 追加', color:C.blue },
      { type:'row', x:0.2, y:1.3, w:6.6, h:0.35,
        cols:[
          {text:'車輌名', bg:'f0f4f8', bold:true, w:0.35},
          {text:'支店', bg:'f0f4f8', bold:true, w:0.25},
          {text:'最大積載量', bg:'f0f4f8', bold:true, w:0.25},
          {text:'操作', bg:'f0f4f8', bold:true, w:0.15},
        ]
      },
      { type:'row', x:0.2, y:1.65, w:6.6, h:0.33,
        cols:[{text:'1号車',w:0.35},{text:'本社',w:0.25},{text:'3.5t',w:0.25},{text:'編集 削除',w:0.15,color:C.blue}]
      },
      { type:'row', x:0.2, y:1.98, w:6.6, h:0.33,
        cols:[{text:'2号車',w:0.35},{text:'本社',w:0.25},{text:'4t',w:0.25},{text:'編集 削除',w:0.15,color:C.blue}]
      },
      // Modal
      { type:'card', x:1.0, y:2.5, w:5.0, h:2.6, title:'車輌を追加',
        body:'車輌名: ___________\n支店:  ___________\n最大積載量(t): ___\n\n      キャンセル  ／  保存' },
    ]);
    addCallout(s, 1, 4.7, 1.2);
    addCallout(s, 2, 4.7, 1.8);
    addCallout(s, 3, 4.7, 2.9);

    s.addText('マスタの操作方法', { x:9.1, y:1.0, w:3.9, h:0.45, fontSize:15, bold:true, color:C.navy, fontFace:FONT });
    addStep(s, 9.1, 1.55, 1, '「＋追加」ボタンで新規登録', '右上の「＋追加」ボタンを押すと入力画面が開きます');
    addStep(s, 9.1, 2.65, 2, '一覧の「編集」で修正', '各行の「編集」ボタンを押すと情報を変更できます');
    addStep(s, 9.1, 3.75, 3, 'モーダル画面で入力・保存', '必要な情報を入力して「保存」ボタンで確定します');
    addNote(s, 9.1, 5.0, 3.9, '「削除」は元に戻せません。削除する前によく確認してください。', 'warn');
    addNote(s, 9.1, 5.85, 3.9, 'コース配達先は、コースを選んでから届け先の追加・順番設定を行います。', 'tip');
  }

  pptx.writeFile({ fileName: path.join('docs', "admin's-manual.pptx") });
  console.log("✅ 管理者用マニュアル作成完了: docs/admin's-manual.pptx");
}

// ─────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────
createUserManual();
createAdminManual();
