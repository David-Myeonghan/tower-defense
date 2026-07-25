import { CONFIG } from './config.js';
import { pixelToCell } from './grid.js';
import { paletteButtons, restartButton } from './render.js';

function inRect(pos, b) {
  return pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h;
}

// 클라이언트 좌표 → 가상 좌표 (CSS 스케일 보정). idle-brick-breaker와 동일.
export function toVirtual(clientX, clientY, rect, virtualW, virtualH) {
  const x = ((clientX - rect.left) / rect.width) * virtualW;
  const y = ((clientY - rect.top) / rect.height) * virtualH;
  return { x, y };
}

export function pointerToCell(pos) {
  return pixelToCell(pos.x, pos.y);
}

export function hitButton(pos, buttons) {
  for (const b of buttons) {
    if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) return b.kind;
  }
  return null;
}

// pointerdown → 팔레트 선택 or 그리드 탭. handlers = { onPalette(kind), onCell({col,row}), onOverlay() }
export function attachInput(canvas, handlers) {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const pos = toVirtual(e.clientX, e.clientY, rect, CONFIG.display.virtualW, CONFIG.display.virtualH);
    // 재시작 버튼은 어떤 상태에서든 최우선
    if (inRect(pos, restartButton())) { handlers.onRestart(); return; }
    if (handlers.isOverlay && handlers.isOverlay()) { handlers.onOverlay(); return; }
    const kind = hitButton(pos, paletteButtons());
    if (kind) { handlers.onPalette(kind); return; }
    handlers.onCell(pointerToCell(pos));
  });
}
