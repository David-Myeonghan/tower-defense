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

// 발사체 그리기. p: 0(발사)~1(착탄). fx: {kind,fromX,fromY,toX,toY,splash}
function drawProjectile(ctx, fx, p) {
  const angle = Math.atan2(fx.toY - fx.fromY, fx.toX - fx.fromX);
  const x = fx.fromX + (fx.toX - fx.fromX) * p;
  const y = fx.fromY + (fx.toY - fx.fromY) * p;

  if (fx.kind === 'cannon') {
    if (p < 0.98) {
      // 날아가는 포탄 (검은 원 + 하이라이트)
      ctx.fillStyle = '#2a2f3e';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555b6e';
      ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // 착탄 폭발 링 (splash 반경)
      const r = fx.splash;
      ctx.fillStyle = 'rgba(255,138,91,0.28)';
      ctx.beginPath(); ctx.arc(fx.toX, fx.toY, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,180,120,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.toX, fx.toY, r, 0, Math.PI * 2); ctx.stroke();
    }
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (fx.kind === 'frost') {
    // 얼음 파편 (하늘색 다이아몬드)
    ctx.fillStyle = '#8fe6ff';
    ctx.strokeStyle = '#5bd6ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(0, 4); ctx.lineTo(-7, 0); ctx.lineTo(0, -4); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    // 화살 (화살대 + 삼각 화살촉)
    ctx.strokeStyle = '#e8ecff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(11, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath();
    ctx.fill();
    // 깃(뒤쪽)
    ctx.strokeStyle = '#9fb0ff';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-11, -3); ctx.moveTo(-8, 0); ctx.lineTo(-11, 3); ctx.stroke();
  }
  ctx.restore();
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

  // 발사체 (렌더 전용, 적 위에 그림): 타워→적으로 날아가는 모양 있는 발사체
  for (const fx of state.effects || []) {
    const p = 1 - Math.max(0, Math.min(1, fx.ttl / (fx.maxTtl || 0.18))); // 0=발사, 1=착탄
    drawProjectile(ctx, fx, p);
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
