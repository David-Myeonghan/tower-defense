import { towerStats } from './tower.js';

// 경로상 진행도 = wpIndex + 현재 세그먼트 진행분 (이동거리에 단조증가). 클수록 출구에 가까움.
export function progressAlong(enemy, waypoints) {
  const i = enemy.wpIndex;
  if (i >= waypoints.length) return waypoints.length; // 이미 통과
  const prev = waypoints[i - 1];
  const cur = waypoints[i];
  const segLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
  const distToTarget = Math.hypot(cur.x - enemy.x, cur.y - enemy.y);
  const frac = segLen === 0 ? 0 : Math.max(0, Math.min(1, 1 - distToTarget / segLen));
  return i + frac;
}

export function inRange(tower, enemy) {
  const range = towerStats(tower.kind, tower.level).range;
  const dx = tower.x - enemy.x;
  const dy = tower.y - enemy.y;
  return dx * dx + dy * dy <= range * range;
}

// First: 범위 내·생존 적 중 progressAlong 최대. 동점은 최소 id.
export function selectTarget(tower, enemies, waypoints, mode = 'first') {
  let best = null;
  let bestKey = -Infinity;
  for (const e of enemies) {
    if (!e.alive || !inRange(tower, e)) continue;
    const key = mode === 'closest'
      ? -((tower.x - e.x) ** 2 + (tower.y - e.y) ** 2)
      : progressAlong(e, waypoints);
    if (key > bestKey || (key === bestKey && best && e.id < best.id)) {
      best = e; bestKey = key;
    }
  }
  return best;
}
