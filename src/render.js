import { CONFIG } from './config.js';
import { cellToPixel } from './grid.js';
import { towerStats } from './tower.js';
import { selectTarget } from './targeting.js';

const TOWER_COLOR = { arrow: '#5b7cff', cannon: '#ff8a5b', frost: '#5bd6ff' };

// 타워를 종류별 실제 모양으로 그림. aim: 조준 각도(rad), 대상 없으면 위쪽.
function drawTower(ctx, t, cell, aim) {
  const R = cell * 0.34;
  ctx.save();
  ctx.translate(t.x, t.y);

  // 공통 받침대 (돌 플랫폼)
  ctx.fillStyle = '#2b3040';
  ctx.strokeStyle = '#171b26'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a4152';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, Math.PI * 2); ctx.fill();

  if (t.kind === 'cannon') {
    // 포신: 회전하는 굵은 총열 + 포구
    ctx.rotate(aim);
    ctx.fillStyle = '#3a3f52'; ctx.strokeStyle = '#12151f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(0, -R * 0.32, R * 1.15, R * 0.64); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#12151f';
    ctx.beginPath(); ctx.arc(R * 1.1, 0, R * 0.28, 0, Math.PI * 2); ctx.fill();
    // 포탑 몸통
    ctx.fillStyle = '#ff8a5b'; ctx.strokeStyle = '#7a3510';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (t.kind === 'frost') {
    // 서리: 파란 마법 크리스탈(다이아 첨탑) + 빛나는 코어
    ctx.fillStyle = '#5bd6ff'; ctx.strokeStyle = '#1a3a4a'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.05); ctx.lineTo(R * 0.5, -R * 0.1); ctx.lineTo(0, R * 0.55); ctx.lineTo(-R * 0.5, -R * 0.1); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eafaff';
    ctx.beginPath(); ctx.arc(0, -R * 0.25, R * 0.18, 0, Math.PI * 2); ctx.fill();
  } else {
    // 화살탑: 궁수 포탑 + 조준하는 활 & 화살
    ctx.fillStyle = '#5b7cff'; ctx.strokeStyle = '#233';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(aim);
    // 활(호)
    ctx.strokeStyle = '#c8b45a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.85, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
    // 시위
    ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 1;
    const bx = Math.cos(Math.PI * 0.55) * R * 0.85, by = Math.sin(Math.PI * 0.55) * R * 0.85;
    ctx.beginPath(); ctx.moveTo(bx, -by); ctx.lineTo(bx, by); ctx.stroke();
    // 화살
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-R * 0.3, 0); ctx.lineTo(R * 0.95, 0); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(R * 1.05, 0); ctx.lineTo(R * 0.8, -R * 0.18); ctx.lineTo(R * 0.8, R * 0.18); ctx.closePath(); ctx.fill();
  }

  ctx.restore();

  // 레벨 배지
  if (t.level > 1) {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(t.x + R * 0.7, t.y + R * 0.7, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${t.level}`, t.x + R * 0.7, t.y + R * 0.7 + 3);
    ctx.textAlign = 'left';
  }
}

// 하단 팔레트 버튼 (가상 좌표). input과 공유하기 위해 export.
// 하단 줄 레이아웃: 타워 3칸 + 폭탄 1칸(오른쪽 끝). 팔레트/폭탄이 공유.
function bottomRow() {
  const { virtualW, virtualH, hudBottom } = CONFIG.display;
  const gap = 8;
  const bombW = 56;
  const towerW = (virtualW - gap * 5 - bombW) / 3;
  const h = hudBottom - gap * 2;
  const y = virtualH - hudBottom + gap;
  return { gap, bombW, towerW, h, y };
}

export function paletteButtons() {
  const kinds = [
    { kind: 'arrow', label: '화살' },
    { kind: 'cannon', label: '대포' },
    { kind: 'frost', label: '서리' },
  ];
  const { gap, towerW, h, y } = bottomRow();
  return kinds.map((k, i) => ({ ...k, x: gap + i * (towerW + gap), y, w: towerW, h }));
}

// 발사체 그리기. p: 0(발사)~1(착탄). fx: {kind,fromX,fromY,toX,toY,splash}
function drawProjectile(ctx, fx, p) {
  const angle = Math.atan2(fx.toY - fx.fromY, fx.toX - fx.fromX);
  const x = fx.fromX + (fx.toX - fx.fromX) * p;
  const y = fx.fromY + (fx.toY - fx.fromY) * p;

  if (fx.kind === 'cannon') {
    const TRAVEL = 0.55; // 앞 55%는 이동, 뒤는 폭발(피해 범위) 표시
    if (p < TRAVEL) {
      // 날아가는 포탄 (큰 검은 원 + 외곽선 + 하이라이트)
      const tp = p / TRAVEL;
      const bx = fx.fromX + (fx.toX - fx.fromX) * tp;
      const by = fx.fromY + (fx.toY - fx.fromY) * tp;
      ctx.fillStyle = '#1a1d27';
      ctx.strokeStyle = '#3a3f52';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a91a8';
      ctx.beginPath(); ctx.arc(bx - 3, by - 3, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // 착탄: splash 반경만큼 "피해 범위" 원 (채움 + 링), 시간에 따라 페이드
      const bp = (p - TRAVEL) / (1 - TRAVEL); // 0→1
      const r = fx.splash;
      const fade = 1 - bp;
      ctx.fillStyle = `rgba(255,138,91,${0.35 * fade})`;
      ctx.beginPath(); ctx.arc(fx.toX, fx.toY, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,190,130,${0.95 * fade})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.toX, fx.toY, r, 0, Math.PI * 2); ctx.stroke();
      // 중심 섬광
      ctx.fillStyle = `rgba(255,240,200,${0.9 * fade})`;
      ctx.beginPath(); ctx.arc(fx.toX, fx.toY, r * 0.25 * (0.5 + bp), 0, Math.PI * 2); ctx.fill();
    }
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = 'round';
  if (fx.kind === 'frost') {
    // 얼음 파편 (하늘색 다이아몬드, 외곽선)
    ctx.fillStyle = '#bff0ff';
    ctx.strokeStyle = '#1a3a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, 0); ctx.lineTo(0, 6); ctx.lineTo(-11, 0); ctx.lineTo(0, -6); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    // 화살: 굵은 화살대 + 큰 삼각 화살촉 + V자 깃. 배경 대비용 어두운 외곽선.
    // 화살대
    ctx.strokeStyle = '#12151f';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(8, 0); ctx.stroke(); // 외곽(어두움)
    ctx.strokeStyle = '#c8b45a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(8, 0); ctx.stroke(); // 나무색 심
    // 화살촉 (큰 삼각형)
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(6, -7); ctx.lineTo(6, 7); ctx.closePath();
    ctx.fillStyle = '#eef1ff';
    ctx.strokeStyle = '#12151f';
    ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();
    // 깃 (뒤쪽 V 두 쌍)
    ctx.strokeStyle = '#e05b7c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(-19, -5);
    ctx.moveTo(-14, 0); ctx.lineTo(-19, 5);
    ctx.moveTo(-10, 0); ctx.lineTo(-15, -5);
    ctx.moveTo(-10, 0); ctx.lineTo(-15, 5);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 상단 재시작 버튼 (가상 좌표). input과 공유.
export function restartButton() {
  const { virtualW } = CONFIG.display;
  return { x: virtualW - 40, y: 8, w: 32, h: 24 };
}

// 한방 폭탄 버튼 (하단 팔레트 줄 오른쪽 끝, 화살/대포/서리 옆). input과 공유.
export function bombButton() {
  const { gap, bombW, towerW, h, y } = bottomRow();
  return { x: gap + 3 * (towerW + gap), y, w: bombW, h };
}

// 적 캐릭터 그리기. normal=둥근 슬라임, fast=뾰족귀 돌진형, boss=보라색 큰 왕관 몹.
function drawEnemy(ctx, e, cell, slowed) {
  if (e.kind === 'boss') { drawBoss(ctx, e, cell, slowed); return; }
  const r = cell * 0.26;
  const body = e.kind === 'fast'
    ? (slowed ? '#7fb0d8' : '#ff9d3c')
    : (slowed ? '#7fb8d0' : '#e0556f');
  const dark = e.kind === 'fast' ? '#7a4410' : '#7a2333';

  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.kind === 'fast') {
    // 뾰족한 귀 두 개
    ctx.fillStyle = body;
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.5); ctx.lineTo(-r * 0.3, -r * 1.4); ctx.lineTo(0, -r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.5); ctx.lineTo(r * 0.3, -r * 1.4); ctx.lineTo(0, -r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // 몸통
  ctx.fillStyle = body;
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 눈 (흰자 + 검은자)
  const ex = r * 0.38, ey = -r * 0.1, er = r * 0.22;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-ex, ey, er, 0, Math.PI * 2); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#12151f';
  ctx.beginPath(); ctx.arc(-ex, ey, er * 0.5, 0, Math.PI * 2); ctx.arc(ex, ey, er * 0.5, 0, Math.PI * 2); ctx.fill();

  // slow면 얼음 결정 표시
  if (slowed) {
    ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
  }

  ctx.restore();
}

// 보스: 보라색 큰 몹 + 왕관 + 사나운 눈.
function drawBoss(ctx, e, cell, slowed) {
  const r = cell * 0.42; // 일반보다 큼
  const body = slowed ? '#9a8fd8' : '#8b3fd0';
  const dark = '#3a1a5a';
  ctx.save();
  ctx.translate(e.x, e.y);

  // 아우라
  ctx.fillStyle = 'rgba(139,63,208,0.22)';
  ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.fill();

  // 몸통
  ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 왕관
  ctx.fillStyle = '#ffd95b'; ctx.strokeStyle = '#8a6d1a'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.75);
  ctx.lineTo(-r * 0.7, -r * 1.15); ctx.lineTo(-r * 0.35, -r * 0.85);
  ctx.lineTo(0, -r * 1.3); ctx.lineTo(r * 0.35, -r * 0.85);
  ctx.lineTo(r * 0.7, -r * 1.15); ctx.lineTo(r * 0.7, -r * 0.75);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // 사나운 눈 (붉은 눈 + 찡그린 눈썹)
  const ex = r * 0.36, ey = -r * 0.05, er = r * 0.2;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-ex, ey, er, 0, Math.PI * 2); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0304a';
  ctx.beginPath(); ctx.arc(-ex, ey, er * 0.55, 0, Math.PI * 2); ctx.arc(ex, ey, er * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-ex - er, ey - er * 1.2); ctx.lineTo(-ex + er, ey - er * 0.4);
  ctx.moveTo(ex + er, ey - er * 1.2); ctx.lineTo(ex - er, ey - er * 0.4);
  ctx.stroke();

  if (slowed) {
    ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
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

  // 타워 (종류별 모양 + 현재 대상으로 조준 회전)
  for (const t of state.towers) {
    const target = selectTarget(t, state.enemies, state.waypoints);
    const aim = target ? Math.atan2(target.y - t.y, target.x - t.x) : -Math.PI / 2;
    drawTower(ctx, t, cell, aim);
  }

  // 적 (캐릭터 + HP바). normal=둥근 슬라임, fast=뾰족한 돌진형. slow면 얼음 틴트.
  for (const e of state.enemies) {
    const slowed = state.timeSec < e.slowUntil;
    drawEnemy(ctx, e, cell, slowed);
    // HP 바 (보스는 더 넓고 위쪽)
    const boss = e.kind === 'boss';
    const bw = cell * (boss ? 0.9 : 0.5);
    const by = e.y - cell * (boss ? 0.62 : 0.44);
    const ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x - bw / 2, by, bw, boss ? 4 : 3);
    ctx.fillStyle = boss ? '#c94b8f' : '#6aaa64';
    ctx.fillRect(e.x - bw / 2, by, bw * ratio, boss ? 4 : 3);
  }

  // 발사체 + 폭탄 섬광 + 죽는 파티클 (렌더 전용, 적 위에 그림)
  for (const fx of state.effects || []) {
    const p = 1 - Math.max(0, Math.min(1, fx.ttl / (fx.maxTtl || 0.18))); // 0=시작, 1=끝
    if (fx.kind === 'bomb') {
      // 전체 화면 섬광 (흰→투명 페이드)
      ctx.fillStyle = `rgba(255,240,200,${0.7 * (1 - p)})`;
      ctx.fillRect(0, 0, virtualW, virtualH);
      // 퍼지는 충격파 링 (kill 반경과 일치)
      const R = CONFIG.bomb.blastMaxR * p;
      ctx.strokeStyle = `rgba(255,180,90,${0.9 * (1 - p)})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    if (fx.kind === 'death') {
      // 몹이 터지는 파티클: 확장+페이드 링 + 사방으로 튀는 조각
      const col = fx.ekind === 'fast' ? '255,157,60' : '224,85,111';
      const r = 8 + 16 * p;
      ctx.strokeStyle = `rgba(${col},${1 - p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${1 - p})`;
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI * 2 * k) / 6;
        const d = 4 + 18 * p;
        ctx.beginPath(); ctx.arc(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d, 2.5 * (1 - p), 0, Math.PI * 2); ctx.fill();
      }
      continue;
    }
    drawProjectile(ctx, fx, p);
  }

  // 낙하하는 폭탄 (drop 단계): 상단에서 중앙으로
  if (state.bomb && state.bomb.phase === 'drop') {
    const prog = Math.min(1, state.bomb.t / CONFIG.bomb.dropSeconds);
    const by = -30 + (state.bomb.y + 30) * prog; // 화면 위 밖 → 중앙
    ctx.save();
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💣', state.bomb.x, by);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  // 상단 HUD
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, virtualW, hudTop);
  ctx.fillStyle = '#e6ebff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Wave ${state.wave}`, 8, 26);
  ctx.textAlign = 'center';
  ctx.fillText(`❤ ${state.lives}`, virtualW / 2 - 16, 26);

  // 재시작 버튼
  const rb = restartButton();
  ctx.fillStyle = '#26314f';
  ctx.strokeStyle = '#3a4670'; ctx.lineWidth = 1;
  roundRect(ctx, rb.x, rb.y, rb.w, rb.h, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#cdd6ff';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('↻', rb.x + rb.w / 2, rb.y + 17);
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`💰 ${state.gold}`, rb.x - 8, 26);

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

  // 한방 폭탄 버튼 (하단 우측 플로팅). 위기(라이프 낮음·적 많음)면 강조 펄스.
  if (state.status === 'playing') {
    const bb = bombButton();
    const danger = state.lives <= 8 || state.enemies.length >= 8;
    const pulse = danger ? 0.5 + 0.5 * Math.sin(state.timeSec * 6) : 0;
    ctx.save();
    ctx.fillStyle = danger ? `rgba(240,90,70,${0.85 + 0.15 * pulse})` : '#3a2540';
    ctx.strokeStyle = danger ? '#ffd08a' : '#5a3f6a';
    ctx.lineWidth = danger ? 2 + 2 * pulse : 1.5;
    roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💣', bb.x + bb.w / 2, bb.y + 28);
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#ffe6a0';
    ctx.fillText('AD', bb.x + bb.w / 2, bb.y + bb.h - 6);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  // 광고(목업) 오버레이
  if (state.status === 'ad') {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, virtualW, virtualH);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('광고 시청 중…', virtualW / 2, virtualH / 2 - 24);
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#ffd08a';
    ctx.fillText(`${Math.max(0, Math.ceil(state.adRemaining || 0))}`, virtualW / 2, virtualH / 2 + 24);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#9aa3c0';
    ctx.fillText('(목업 광고 · 실제 앱에선 리워드 광고)', virtualW / 2, virtualH / 2 + 60);
    ctx.textAlign = 'left';
  }

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
