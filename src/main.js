import { CONFIG } from './config.js';
import { canPlace } from './grid.js';
import { placeTower, upgradeTower } from './economy.js';
import { freshState, tick } from './game.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { createLoop } from './loop.js';
import { createPersistence, toSaveData } from './persistence.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// 표시 크기만 뷰포트에 맞게 스케일. 내부 해상도 고정(가상 400x600).
function fit() {
  const margin = 8;
  const availW = window.innerWidth - margin * 2;
  const availH = window.innerHeight - margin * 2;
  const scale = Math.min(availW / CONFIG.display.virtualW, availH / CONFIG.display.virtualH);
  canvas.style.width = `${CONFIG.display.virtualW * scale}px`;
  canvas.style.height = `${CONFIG.display.virtualH * scale}px`;
}
window.addEventListener('resize', fit);
fit();

const storage = (() => {
  try { return window.localStorage; } catch { return { getItem: () => null, setItem: () => {} }; }
})();
const persistence = createPersistence(storage);

let state = freshState();
let selectedKind = 'arrow';

function onPalette(kind) { selectedKind = kind; }

function onCell({ col, row }) {
  // 기존 타워 있으면 업그레이드, 빈 칸이면 설치
  const existing = state.towers.find((t) => t.col === col && t.row === row);
  if (existing) {
    const r = upgradeTower(state, existing.id);
    if (r.ok) state = r.state;
    return;
  }
  if (canPlace(col, row, state)) {
    const r = placeTower(state, selectedKind, col, row);
    if (r.ok) state = r.state;
  }
}

function restart() {
  const best = state.best;
  state = { ...freshState(), best }; // 최고 기록 유지
}

attachInput(canvas, {
  isOverlay: () => state.status === 'over',
  onOverlay: restart,
  onPalette,
  onCell,
});

const loop = createLoop({
  update: (dt) => { state = tick(state, dt); },
  render: () => render(ctx, state, selectedKind),
});

(async () => {
  const saved = await persistence.load();
  if (saved && saved.best) state = { ...state, best: saved.best };
  loop.start();
})();

// 읽기전용 디버그 스냅샷 (E2E 검증용)
window.__td = () => ({
  status: state.status, lives: state.lives, gold: state.gold,
  wave: state.wave, kills: state.kills, score: state.score,
  towers: state.towers.length, enemies: state.enemies.length, best: state.best,
  effects: (state.effects || []).length,
});

function saveBest() { persistence.save(toSaveData(state, Date.now())); }
setInterval(saveBest, 5000);
window.addEventListener('beforeunload', saveBest);
