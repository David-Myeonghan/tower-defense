import { CONFIG } from './config.js';

// 웨이브(1-based) 계획: 적 수·스폰 간격·클리어 보너스. RNG 없음(결정론).
export function wavePlan(wave) {
  const w = CONFIG.waves;
  return {
    count: Math.round(w.baseCount * Math.pow(w.countGrowth, wave - 1)),
    interval: Math.max(w.minInterval, w.baseInterval * Math.pow(w.intervalDecay, wave - 1)),
    bonus: Math.round(CONFIG.economy.waveBonusBase * Math.pow(CONFIG.economy.waveBonusGrowth, wave - 1)),
  };
}

// 웨이브 내 index번째 적 종류 (결정론). fastEveryFrom 이후 매 3번째가 fast.
export function enemyKindAt(wave, index) {
  if (wave >= CONFIG.waves.fastEveryFrom && index % 3 === 2) return 'fast';
  return 'normal';
}
