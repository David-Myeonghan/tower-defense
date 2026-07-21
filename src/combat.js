import { towerStats } from './tower.js';
import { selectTarget } from './targeting.js';
import { applySlow } from './enemy.js';

export function applyDamage(enemy, dmg) {
  const hp = enemy.hp - dmg;
  return { ...enemy, hp, alive: hp > 0 };
}

export function tickCooldowns(towers, dt) {
  return towers.map((t) => ({ ...t, cooldownLeft: Math.max(0, t.cooldownLeft - dt) }));
}

// 타워 1기 발사 (hitscan). 쿨다운 중이거나 대상 없으면 미발사.
// 반환: { tower, enemies, killedIds, fired }
export function fireTower(tower, enemies, waypoints, timeSec) {
  if (tower.cooldownLeft > 0) return { tower, enemies, killedIds: [], fired: false };
  const target = selectTarget(tower, enemies, waypoints);
  if (!target) return { tower, enemies, killedIds: [], fired: false };

  const stats = towerStats(tower.kind, tower.level);
  const killedIds = [];
  let next = enemies;

  if (tower.kind === 'cannon') {
    // splash: 대상 중심 반경 내 전원
    next = enemies.map((e) => {
      if (!e.alive) return e;
      const d2 = (e.x - target.x) ** 2 + (e.y - target.y) ** 2;
      if (d2 <= stats.splash * stats.splash) {
        const hit = applyDamage(e, stats.damage);
        if (!hit.alive && e.alive) killedIds.push(e.id);
        return hit;
      }
      return e;
    });
  } else {
    next = enemies.map((e) => {
      if (e.id !== target.id) return e;
      let hit = applyDamage(e, stats.damage);
      if (tower.kind === 'frost' && hit.alive) hit = applySlow(hit, stats.slowFactor, stats.slowDuration, timeSec);
      if (!hit.alive && e.alive) killedIds.push(e.id);
      return hit;
    });
  }

  return { tower: { ...tower, cooldownLeft: stats.fireRate }, enemies: next, killedIds, fired: true };
}

// 모든 타워 발사 순차 적용. 반환: { towers, enemies, killedIds }
export function stepCombat(state) {
  let enemies = state.enemies;
  const towers = [];
  const killedIds = [];
  for (const tower of state.towers) {
    const r = fireTower(tower, enemies, state.waypoints, state.timeSec);
    towers.push(r.tower);
    enemies = r.enemies;
    killedIds.push(...r.killedIds);
  }
  return { towers, enemies, killedIds };
}
