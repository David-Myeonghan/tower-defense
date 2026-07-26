import { CONFIG } from './config.js';
import { buildWaypoints, expandPathCells } from './grid.js';
import { spawnEnemy, stepEnemy } from './enemy.js';
import { tickCooldowns, stepCombat } from './combat.js';
import { wavePlan, enemyKindAt } from './wave.js';
import { killReward } from './economy.js';

// 한방 폭탄: 즉시 제거가 아니라 "연출 시퀀스"를 시작한다.
// 낙하(drop) → 폭발/충격파(blast)가 퍼지며 닿는 몹부터 죽음. 연출 진행은 tick(tickBomb)이 담당.
// 광고(리워드) 시청 성공 후 main에서 호출. tick 밖의 플레이어 액션(placeTower와 동일 패턴).
export function applyBomb(state) {
  if (state.enemies.length === 0) return { ok: false, state }; // 없으면 낭비 방지
  const bomb = { phase: 'drop', t: 0, x: CONFIG.display.virtualW / 2, y: CONFIG.display.virtualH / 2 };
  return { ok: true, state: { ...state, bomb } };
}

// 폭탄 연출 진행 (보드 정지: spawn/move/combat 스킵, 폭탄과 이펙트만 갱신). 순수.
function tickBomb(state, dt, cfg = CONFIG) {
  let s = state;
  // 이펙트 수명 감소
  let effects = s.effects.map((fx) => ({ ...fx, ttl: fx.ttl - dt })).filter((fx) => fx.ttl > 0);
  const b = { ...s.bomb, t: s.bomb.t + dt };

  if (b.phase === 'drop') {
    if (b.t >= cfg.bomb.dropSeconds) {
      // 착탄 → 폭발: 섬광 + 보스 즉시 반피, blast 단계로.
      effects = [...effects, { kind: 'bomb', x: b.x, y: b.y, ttl: cfg.bomb.flashSeconds, maxTtl: cfg.bomb.flashSeconds }];
      const enemies = s.enemies.map((e) => {
        if (e.kind !== 'boss') return e;
        const hp = Math.max(1, Math.round(e.maxHp * (1 - cfg.bomb.bossDamageRatio)));
        return { ...e, hp: Math.min(e.hp, hp) };
      });
      return { ...s, enemies, effects, bomb: { ...b, phase: 'blast', t: 0 } };
    }
    return { ...s, effects, bomb: b };
  }

  // blast: 충격파 반경 R까지 닿은 일반몹을 죽임(순차적으로 바깥으로).
  const R = cfg.bomb.blastMaxR * Math.min(1, b.t / cfg.bomb.blastSeconds);
  const remaining = [];
  let gold = s.gold, kills = s.kills;
  for (const e of s.enemies) {
    if (e.kind !== 'boss') {
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d <= R) {
        gold += killReward(e.kind, s.wave);
        kills += 1;
        effects = [...effects, { kind: 'death', ekind: e.kind, x: e.x, y: e.y, ttl: 0.35, maxTtl: 0.35 }];
        continue; // 죽음(제거)
      }
    }
    remaining.push(e);
  }
  const done = b.t >= cfg.bomb.blastSeconds;
  return { ...s, enemies: remaining, gold, kills, score: kills, effects, bomb: done ? null : b };
}

export function freshState() {
  const state = {
    status: 'playing',
    timeSec: 0,
    lives: CONFIG.lives.start,
    gold: CONFIG.economy.startGold,
    wave: 1,
    score: 0,
    kills: 0,
    waypoints: buildWaypoints(),
    pathSet: expandPathCells(),
    enemies: [],
    towers: [],
    spawn: { remaining: 0, timer: 0, index: 0 },
    betweenTimer: 0,
    nextId: 1,
    best: { wave: 1, score: 0 },
    bomb: null, // 폭탄 연출 시퀀스 {phase,t,x,y} (저장 제외, 일시적)
    effects: [], // 렌더 전용 발사 이펙트 {kind,fromX,fromY,toX,toY,splash,ttl}
  };
  return startWave(state, 1);
}

export function startWave(state, wave) {
  const plan = wavePlan(wave);
  return { ...state, wave, spawn: { remaining: plan.count, timer: 0, index: 0 } };
}

// 저장용 스냅샷: 재개에 필요한 필드만 (waypoints/pathSet는 재빌드, effects는 일시적이라 제외).
export function serialize(state) {
  return {
    status: state.status,
    timeSec: state.timeSec,
    lives: state.lives,
    gold: state.gold,
    wave: state.wave,
    score: state.score,
    kills: state.kills,
    enemies: state.enemies,
    towers: state.towers,
    spawn: state.spawn,
    nextId: state.nextId,
    best: state.best,
  };
}

// 스냅샷 복원. 진행 중이 아니면(게임오버/없음) 새 게임을 시작하되 best는 유지.
export function deserialize(data) {
  const base = freshState();
  if (!data || data.status !== 'playing') {
    return { ...base, best: (data && data.best) || base.best };
  }
  return {
    ...base,
    ...data,
    waypoints: base.waypoints,
    pathSet: base.pathSet,
    bomb: null,
    effects: [],
  };
}

// 한 틱 진행 (고정 dt). 불변 지향이나 성능 위해 새 배열 재할당.
export function tick(state, dt) {
  if (state.status !== 'playing') return state;

  let s = { ...state, timeSec: state.timeSec + dt };

  // 폭탄 연출 중이면 보드 정지 — 폭탄/이펙트만 진행
  if (s.bomb) return tickBomb(s, dt);

  // 1) 스폰
  const plan = wavePlan(s.wave);
  let { remaining, timer, index } = s.spawn;
  const enemies = [...s.enemies];
  timer -= dt;
  while (remaining > 0 && timer <= 0) {
    enemies.push(spawnEnemy(enemyKindAt(s.wave, index), s.wave, s.waypoints, s.nextId));
    s = { ...s, nextId: s.nextId + 1 };
    remaining--; index++;
    timer += plan.interval;
  }
  s = { ...s, spawn: { remaining, timer, index }, enemies };

  // 2) 이동 + 출구 도달
  let lives = s.lives;
  const moved = [];
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const r = stepEnemy(e, dt, s.waypoints, s.timeSec);
    if (r.reachedExit) lives--;
    else moved.push(r.enemy);
  }
  s = { ...s, enemies: moved, lives };

  // 3) 전투 (쿨다운 → 발사)
  const cooled = tickCooldowns(s.towers, dt);
  const combat = stepCombat({ ...s, towers: cooled });
  let gold = s.gold;
  let kills = s.kills;
  const killedSet = new Set(combat.killedIds);
  for (const e of combat.enemies) {
    if (killedSet.has(e.id)) { gold += killReward(e.kind, s.wave); kills++; }
  }
  s = { ...s, towers: combat.towers, enemies: combat.enemies.filter((e) => e.alive), gold, kills, score: kills };

  // 발사 이펙트 갱신: 기존 이펙트 수명 감소 + 이번 틱 새 발사 추가 (렌더 전용, sim 무영향)
  // 대포는 이동+폭발(피해 범위) 표시를 위해 더 길게.
  const aged = s.effects.map((fx) => ({ ...fx, ttl: fx.ttl - dt })).filter((fx) => fx.ttl > 0);
  for (const shot of combat.shots) {
    const ttl = shot.kind === 'cannon' ? 0.45 : 0.28;
    aged.push({ ...shot, ttl, maxTtl: ttl });
  }
  s = { ...s, effects: aged };

  // 4) 웨이브 클리어 → 보너스 + 다음 웨이브
  if (s.spawn.remaining === 0 && s.enemies.length === 0) {
    s = { ...s, gold: s.gold + plan.bonus };
    s = startWave(s, s.wave + 1);
  }

  // 5) 게임오버
  if (s.lives <= 0) {
    s = {
      ...s,
      status: 'over',
      best: {
        wave: Math.max(s.best.wave, s.wave),
        score: Math.max(s.best.score, s.score),
      },
    };
  }

  return s;
}
