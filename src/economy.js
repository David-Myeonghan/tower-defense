import { CONFIG } from './config.js';
import { canPlace } from './grid.js';
import { createTower, towerBaseCost, towerUpgradeCost } from './tower.js';
import { wavePlan } from './wave.js';

export function killReward(kind, wave) {
  return Math.round(CONFIG.enemies[kind].reward * Math.pow(CONFIG.economy.killGrowth, wave - 1));
}

export function waveBonus(wave) {
  return wavePlan(wave).bonus;
}

export function canAfford(gold, cost) {
  return gold >= cost;
}

// 표시용 비용 헬퍼 (설치=base, 업그레이드=현재레벨 기준)
export function towerCost(kind, level) {
  return level <= 1 ? towerBaseCost(kind) : towerUpgradeCost(kind, level - 1);
}

// 타워 설치 → {ok, state}. 불변.
export function placeTower(state, kind, col, row) {
  const cost = towerBaseCost(kind);
  if (!canPlace(col, row, state) || !canAfford(state.gold, cost)) return { ok: false, state };
  const tower = createTower(kind, col, row, state.nextId);
  return {
    ok: true,
    state: { ...state, gold: state.gold - cost, nextId: state.nextId + 1, towers: [...state.towers, tower] },
  };
}

// 타워 업그레이드 → {ok, state}. 불변.
export function upgradeTower(state, towerId) {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return { ok: false, state };
  const cost = towerUpgradeCost(tower.kind, tower.level);
  if (!canAfford(state.gold, cost)) return { ok: false, state };
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold - cost,
      towers: state.towers.map((t) => (t.id === towerId ? { ...t, level: t.level + 1 } : t)),
    },
  };
}
