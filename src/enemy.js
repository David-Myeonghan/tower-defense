import { CONFIG, enemyHP } from './config.js';

// 적 생성. waypoints[0]에서 시작, waypoints[1]을 향함(wpIndex=1).
export function spawnEnemy(kind, wave, waypoints, id) {
  const start = waypoints[0];
  return {
    id,
    kind,
    x: start.x,
    y: start.y,
    wpIndex: 1,
    hp: enemyHP(kind, wave),
    maxHp: enemyHP(kind, wave),
    baseSpeed: CONFIG.enemies[kind].speed,
    slowFactor: 1,
    slowUntil: 0,
    alive: true,
    reachedExit: false,
  };
}

// 현재 유효 속도 (slow 활성 구간이면 감속)
export function effectiveSpeed(enemy, timeSec) {
  return timeSec < enemy.slowUntil ? enemy.baseSpeed * enemy.slowFactor : enemy.baseSpeed;
}

// slow 적용 — refresh(만료시각 갱신) + 최강 우선(더 낮은 factor 유지, 스택 없음)
export function applySlow(enemy, factor, duration, timeSec) {
  const active = timeSec < enemy.slowUntil;
  const nextFactor = active ? Math.min(enemy.slowFactor, factor) : factor;
  return { ...enemy, slowFactor: nextFactor, slowUntil: timeSec + duration };
}

// 웨이포인트 따라 이동. 큰 dt에서도 여러 웨이포인트 소비. 마지막 통과 시 reachedExit.
export function stepEnemy(enemy, dt, waypoints, timeSec) {
  let { x, y, wpIndex } = enemy;
  let travel = effectiveSpeed(enemy, timeSec) * dt;

  while (travel > 0 && wpIndex < waypoints.length) {
    const wp = waypoints[wpIndex];
    const dx = wp.x - x;
    const dy = wp.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) { wpIndex++; continue; }
    if (travel < dist) {
      x += (dx / dist) * travel;
      y += (dy / dist) * travel;
      travel = 0;
    } else {
      x = wp.x; y = wp.y;
      travel -= dist;
      wpIndex++;
    }
  }

  if (wpIndex >= waypoints.length) {
    return { enemy: { ...enemy, x, y, wpIndex, alive: false, reachedExit: true }, reachedExit: true };
  }
  return { enemy: { ...enemy, x, y, wpIndex }, reachedExit: false };
}
