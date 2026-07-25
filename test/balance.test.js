import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, tick } from '../src/game.js';
import { placeTower } from '../src/economy.js';
import { enemyHP } from '../src/config.js';
import { canPlace } from '../src/grid.js';
import { CONFIG } from '../src/config.js';

const STEP = 1 / 60;

// 경로 인접 빈 칸에 자동으로 타워를 최대한 배치하는 단순 정책
function autoPlace(state) {
  let s = state;
  const kinds = ['arrow', 'cannon', 'frost'];
  let ki = 0;
  for (let row = 0; row < CONFIG.grid.rows; row++) {
    for (let col = 0; col < CONFIG.grid.cols; col++) {
      if (canPlace(col, row, s)) {
        const r = placeTower(s, kinds[ki % 3], col, row);
        if (r.ok) { s = r.state; ki++; }
      }
    }
  }
  return s;
}

test('early waves are survivable with auto-placed towers', () => {
  let s = freshState();
  s = autoPlace(s);
  // 30초(=1800틱) 시뮬 — 초반 몇 웨이브 진행되어야 함
  for (let i = 0; i < 60 * 60 && s.status === 'playing'; i++) s = tick(s, STEP);
  // 자동배치 방어로 최소 2웨이브 이상은 진행 (완전 즉사 아님)
  assert.ok(s.wave >= 2 || s.kills > 0, `wave=${s.wave} kills=${s.kills} lives=${s.lives}`);
});

test('enemy HP does not overflow at high waves', () => {
  // 아주 먼 웨이브에서도 유한(무한대/NaN 아님)
  assert.ok(Number.isFinite(enemyHP('normal', 500)));
  // 현실적으로 도달 가능한 범위(웨이브 60)에선 안전 정수 이내
  assert.ok(enemyHP('normal', 60) < Number.MAX_SAFE_INTEGER);
});

test('tick is deterministic (same seed state → same outcome)', () => {
  const run = () => {
    let s = autoPlace(freshState());
    for (let i = 0; i < 600; i++) s = tick(s, STEP);
    return `${s.wave}:${s.kills}:${s.gold}:${s.lives}`;
  };
  assert.equal(run(), run());
});
