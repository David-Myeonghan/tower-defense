import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toVirtual, pointerToCell, hitButton } from '../src/input.js';
import { paletteButtons } from '../src/render.js';
import { cellToPixel } from '../src/grid.js';

test('toVirtual maps under CSS scaling', () => {
  // 캔버스가 2배로 표시됨(800x1200), 클릭 (400,600) → 가상 (200,300)
  const rect = { left: 0, top: 0, width: 800, height: 1200 };
  assert.deepEqual(toVirtual(400, 600, rect, 400, 600), { x: 200, y: 300 });
});

test('pointerToCell returns grid cell for a scaled rect', () => {
  const rect = { left: 0, top: 0, width: 800, height: 1200 };
  const center = cellToPixel(3, 5); // 가상 좌표
  const client = { x: center.x * 2, y: center.y * 2 }; // 2배 표시
  const pos = toVirtual(client.x, client.y, rect, 400, 600);
  assert.deepEqual(pointerToCell(pos), { col: 3, row: 5 });
});

test('hitButton detects palette hit/miss', () => {
  const btns = paletteButtons();
  const first = btns[0];
  assert.equal(hitButton({ x: first.x + 2, y: first.y + 2 }, btns), first.kind);
  assert.equal(hitButton({ x: 5, y: 5 }, btns), null); // 상단 HUD 영역
});
