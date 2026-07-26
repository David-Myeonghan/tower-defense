// 타워 디펜스 밸런스 상수 + 성장 공식.
// 좌표/거리는 모두 가상 px (virtualW=400, virtualH=600) 기준.
export const CONFIG = {
  display: { virtualW: 400, virtualH: 600, hudTop: 40, hudBottom: 80 },
  // 그리드: 10x12 칸, 셀 40px, y 40~520 (하단 80px는 팔레트)
  grid: { cell: 40, cols: 10, rows: 12, originX: 0, originY: 40 },
  // 경로 코너 (셀 좌표). 축정렬 세그먼트로 연결됨. 시작=[0,0], 끝=[9,11].
  path: { corners: [[0, 0], [8, 0], [8, 4], [2, 4], [2, 8], [9, 8], [9, 11], [0, 11]] },
  lives: { start: 20 },
  economy: { startGold: 120, killGrowth: 1.08, waveBonusBase: 15, waveBonusGrowth: 1.12 },
  towers: {
    arrow: { baseCost: 40, range: 90, damage: 6, fireRate: 0.6, costGrowth: 1.5, dmgGrowth: 1.35, rangeGrowth: 1.06 },
    cannon: { baseCost: 70, range: 70, damage: 10, fireRate: 1.2, splash: 45, costGrowth: 1.5, dmgGrowth: 1.35, rangeGrowth: 1.05 },
    frost: { baseCost: 55, range: 80, damage: 2, fireRate: 1.0, slowFactor: 0.5, slowDuration: 1.5, costGrowth: 1.5, dmgGrowth: 1.2, rangeGrowth: 1.05 },
  },
  enemies: {
    normal: { baseHP: 12, speed: 55, reward: 3 },
    fast: { baseHP: 8, speed: 100, reward: 5 },
    boss: { baseHP: 80, speed: 34, reward: 30 }, // 보라색 보스: 느리고 아주 단단
    hpGrowth: 1.22,
  },
  // bossEvery: 보스 등장 주기(웨이브). 트렌드상 마이너 보스는 5웨이브 관례.
  waves: { baseCount: 6, countGrowth: 1.17, baseInterval: 0.9, minInterval: 0.35, intervalDecay: 0.97, fastEveryFrom: 3, bossEvery: 5 },
  // 한방 폭탄(리워드 광고 게이트). bossDamageRatio: 보스가 잃는 최대체력 비율.
  // 연출: 낙하(dropSeconds) → 폭발/충격파(blastSeconds, blastMaxR까지 퍼지며 닿는 몹부터 죽임).
  bomb: { bossDamageRatio: 0.5, adSeconds: 3, dropSeconds: 0.5, flashSeconds: 0.6, blastSeconds: 0.6, blastMaxR: 420 },
};

// 적 HP: 웨이브(1-based)마다 지수 성장.
export function enemyHP(kind, wave) {
  return Math.round(CONFIG.enemies[kind].baseHP * Math.pow(CONFIG.enemies.hpGrowth, wave - 1));
}

// 타워 스탯: 레벨(1-based)마다 damage/range 성장. key는 'damage'|'range'|'fireRate'|'splash'|'slowFactor'|'slowDuration'.
export function towerStat(kind, level, key) {
  const t = CONFIG.towers[kind];
  if (key === 'damage') return Math.round(t.damage * Math.pow(t.dmgGrowth, level - 1));
  if (key === 'range') return Math.round(t.range * Math.pow(t.rangeGrowth, level - 1));
  return t[key]; // fireRate/splash/slowFactor/slowDuration은 레벨 불변
}
