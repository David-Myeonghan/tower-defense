import { CONFIG, towerStat } from './config.js';
import { cellToPixel } from './grid.js';

export function createTower(kind, col, row, id) {
  const { x, y } = cellToPixel(col, row);
  return { id, kind, col, row, x, y, level: 1, cooldownLeft: 0 };
}

// 현재 레벨 스탯 묶음 (kind별로 splash/slow 필드 포함)
export function towerStats(kind, level) {
  const t = CONFIG.towers[kind];
  const stats = {
    range: towerStat(kind, level, 'range'),
    damage: towerStat(kind, level, 'damage'),
    fireRate: t.fireRate,
  };
  if (kind === 'cannon') stats.splash = t.splash;
  if (kind === 'frost') { stats.slowFactor = t.slowFactor; stats.slowDuration = t.slowDuration; }
  return stats;
}

export function towerBaseCost(kind) {
  return CONFIG.towers[kind].baseCost;
}

// level → level+1 업그레이드 비용
export function towerUpgradeCost(kind, level) {
  return Math.round(CONFIG.towers[kind].baseCost * Math.pow(CONFIG.towers[kind].costGrowth, level));
}
