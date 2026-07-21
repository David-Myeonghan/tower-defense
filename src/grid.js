import { CONFIG } from './config.js';

const { cell, cols, rows, originX, originY } = CONFIG.grid;

export function inGrid(col, row) {
  return col >= 0 && col < cols && row >= 0 && row < rows;
}

// 셀 → 픽셀(셀 중심, 가상 px)
export function cellToPixel(col, row) {
  return { x: originX + col * cell + cell / 2, y: originY + row * cell + cell / 2 };
}

// 픽셀 → 셀 (그리드 밖일 수 있음 — 호출측이 inGrid로 검사)
export function pixelToCell(x, y) {
  return { col: Math.floor((x - originX) / cell), row: Math.floor((y - originY) / cell) };
}

// 경로 코너 폴리라인을 지나는 모든 셀을 "col,row" 문자열 Set으로 (축정렬 세그먼트 인클루시브)
export function expandPathCells(corners = CONFIG.path.corners) {
  const set = new Set();
  for (let i = 0; i < corners.length - 1; i++) {
    let [c0, r0] = corners[i];
    const [c1, r1] = corners[i + 1];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    set.add(`${c0},${r0}`);
    while (c0 !== c1 || r0 !== r1) {
      c0 += dc; r0 += dr;
      set.add(`${c0},${r0}`);
    }
  }
  return set;
}

// 이동용 웨이포인트 = 각 코너의 셀 중심점
export function buildWaypoints(corners = CONFIG.path.corners) {
  return corners.map(([c, r]) => cellToPixel(c, r));
}

export function isPathCell(col, row, pathSet) {
  return pathSet.has(`${col},${row}`);
}

// 설치 가능? 그리드 안 && 경로 아님 && 이미 타워 없음
export function canPlace(col, row, state) {
  if (!inGrid(col, row)) return false;
  if (isPathCell(col, row, state.pathSet)) return false;
  if (state.towers.some((t) => t.col === col && t.row === row)) return false;
  return true;
}
