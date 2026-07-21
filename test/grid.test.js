import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inGrid, cellToPixel, pixelToCell, expandPathCells, buildWaypoints, isPathCell, canPlace } from '../src/grid.js';
import { CONFIG } from '../src/config.js';

test('cellToPixel returns cell center (originY=40, cell=40)', () => {
  assert.deepEqual(cellToPixel(0, 0), { x: 20, y: 60 });
  assert.deepEqual(cellToPixel(2, 3), { x: 100, y: 180 });
});

test('pixelToCell round-trips cell centers', () => {
  for (const [c, r] of [[0, 0], [3, 5], [9, 11]]) {
    const p = cellToPixel(c, r);
    assert.deepEqual(pixelToCell(p.x, p.y), { col: c, row: r });
  }
});

test('inGrid bounds', () => {
  assert.equal(inGrid(0, 0), true);
  assert.equal(inGrid(-1, 0), false);
  assert.equal(inGrid(CONFIG.grid.cols, 0), false);
  assert.equal(inGrid(0, CONFIG.grid.rows), false);
});

test('buildWaypoints: one center per corner', () => {
  const wp = buildWaypoints();
  assert.equal(wp.length, CONFIG.path.corners.length);
  assert.deepEqual(wp[0], cellToPixel(0, 0));
});

test('expandPathCells covers straight runs inclusive', () => {
  const set = expandPathCells();
  // 코너 [0,0]->[8,0]: (0..8, 0) 전부 포함
  for (let c = 0; c <= 8; c++) assert.equal(set.has(`${c},0`), true, `missing ${c},0`);
  // 끝점 포함
  assert.equal(set.has('0,11'), true);
});

test('isPathCell true on path, false off', () => {
  const set = expandPathCells();
  assert.equal(isPathCell(4, 0, set), true);   // 상단 가로 경로
  assert.equal(isPathCell(5, 6, set), false);  // 경로 아님
});

test('canPlace rules', () => {
  const state = { pathSet: expandPathCells(), towers: [{ col: 5, row: 6 }] };
  assert.equal(canPlace(5, 5, state), true);    // 빈 칸
  assert.equal(canPlace(4, 0, state), false);   // 경로
  assert.equal(canPlace(5, 6, state), false);   // 점유
  assert.equal(canPlace(-1, 0, state), false);  // 그리드 밖
});
