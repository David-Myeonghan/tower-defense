import { CONFIG } from './config.js';
import { cellToPixel } from './grid.js';
import { towerStats } from './tower.js';

const TOWER_COLOR = { arrow: '#5b7cff', cannon: '#ff8a5b', frost: '#5bd6ff' };

// 하단 팔레트 버튼 (가상 좌표). input과 공유하기 위해 export.
export function paletteButtons() {
  const { virtualW, virtualH, hudBottom } = CONFIG.display;
  const kinds = [
    { kind: 'arrow', label: '화살' },
    { kind: 'cannon', label: '대포' },
    { kind: 'frost', label: '서리' },
  ];
  const gap = 8;
  const w = (virtualW - gap * (kinds.length + 1)) / kinds.length;
  const h = hudBottom - gap * 2;
  const y = virtualH - hudBottom + gap;
  return kinds.map((k, i) => ({ ...k, x: gap + i * (w + gap), y, w, h }));
}

export function render(ctx, state, selectedKind) {
  const { virtualW, virtualH, hudTop } = CONFIG.display;
  const { cell, cols, rows, originX, originY } = CONFIG.grid;

  ctx.fillStyle = '#10141f';
  ctx.fillRect(0, 0, virtualW, virtualH);

  // 경로 셀
  ctx.fillStyle = '#1c2740';
  for (const key of state.pathSet) {
    const [c, r] = key.split(',').map(Number);
    ctx.fillRect(originX + c * cell, originY + r * cell, cell, cell);
  }

  // 그리드 라인
  ctx.strokeStyle = '#1a1f2e';
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(originX + c * cell, originY); ctx.lineTo(originX + c * cell, originY + rows * cell); ctx.stroke(); }
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(originX, originY + r * cell); ctx.lineTo(originX + cols * cell, originY + r * cell); ctx.stroke(); }

  // 타워
  for (const t of state.towers) {
    ctx.fillStyle = TOWER_COLOR[t.kind];
    ctx.beginPath();
    ctx.arc(t.x, t.y, cell * 0.32, 0, Math.PI * 2);
    ctx.fill();
    if (t.level > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.level}`, t.x, t.y + 4);
    }
  }

  // 적 (+ HP바, slow 틴트)
  for (const e of state.enemies) {
    const slowed = state.timeSec < e.slowUntil;
    ctx.fillStyle = e.kind === 'fast' ? (slowed ? '#8ad' : '#ffd95b') : (slowed ? '#7ac' : '#e05b7c');
    ctx.beginPath();
    ctx.arc(e.x, e.y, cell * 0.24, 0, Math.PI * 2);
    ctx.fill();
    // HP 바
    const bw = cell * 0.5;
    const ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x - bw / 2, e.y - cell * 0.4, bw, 3);
    ctx.fillStyle = '#6aaa64';
    ctx.fillRect(e.x - bw / 2, e.y - cell * 0.4, bw * ratio, 3);
  }

  // 상단 HUD
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, virtualW, hudTop);
  ctx.fillStyle = '#e6ebff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Wave ${state.wave}`, 8, 26);
  ctx.textAlign = 'center';
  ctx.fillText(`❤ ${state.lives}`, virtualW / 2, 26);
  ctx.textAlign = 'right';
  ctx.fillText(`💰 ${state.gold}`, virtualW - 8, 26);

  // 하단 팔레트
  ctx.textAlign = 'center';
  for (const btn of paletteButtons()) {
    const cost = CONFIG.towers[btn.kind].baseCost;
    const affordable = state.gold >= cost;
    const selected = btn.kind === selectedKind;
    ctx.fillStyle = selected ? '#2a3560' : (affordable ? '#1e2740' : '#151a28');
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    if (selected) { ctx.strokeStyle = TOWER_COLOR[btn.kind]; ctx.lineWidth = 2; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h); }
    ctx.fillStyle = affordable ? TOWER_COLOR[btn.kind] : '#5a6488';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 22);
    ctx.fillStyle = affordable ? '#cdd6ff' : '#5a6488';
    ctx.font = '11px sans-serif';
    ctx.fillText(`💰${cost}`, btn.x + btn.w / 2, btn.y + 40);
  }
  ctx.textAlign = 'left';

  // 게임오버 오버레이
  if (state.status === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, virtualW, virtualH);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('게임 오버', virtualW / 2, virtualH / 2 - 40);
    ctx.font = '16px sans-serif';
    ctx.fillText(`도달 웨이브 ${state.wave} · 처치 ${state.kills}`, virtualW / 2, virtualH / 2);
    ctx.fillText(`최고: 웨이브 ${state.best.wave} · 처치 ${state.best.score}`, virtualW / 2, virtualH / 2 + 28);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#5b7cff';
    ctx.fillText('탭하여 다시 시작', virtualW / 2, virtualH / 2 + 66);
    ctx.textAlign = 'left';
  }
}
