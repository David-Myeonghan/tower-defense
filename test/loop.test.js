import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoop } from '../src/loop.js';

// 프레임을 수동 구동하는 가짜 raf/now. now는 호출할 때마다 지정 스텝만큼 진행.
function harness(times) {
  let i = 0;
  const queue = [];
  const now = () => times[Math.min(i, times.length - 1)];
  const raf = (cb) => { queue.push(cb); };
  function pump(frames) {
    for (let f = 0; f < frames; f++) {
      i++;
      const cb = queue.shift();
      if (cb) cb();
    }
  }
  return { now, raf, pump };
}

test('createLoop runs ~60 update steps per simulated second', () => {
  // 0ms에서 start, 다음 프레임에서 1000ms 경과 → dt 1s → 60 스텝... 이지만 clamp(0.1s)로 6 스텝
  const times = [0, 1000, 1000];
  const h = harness(times);
  let updates = 0;
  const loop = createLoop({ update: () => { updates++; }, render: () => {}, now: h.now, raf: h.raf });
  loop.start();       // last=0, 첫 frame 예약
  h.pump(1);          // now=1000, delta=1s → clamp 0.1s → 6 스텝
  assert.equal(updates, 6);
});

test('createLoop accumulates fractional steps across frames', () => {
  // 각 프레임 20ms 경과(0.02s). 3프레임 누적 0.06s < STEP(0.0167)*4 → 스텝이 프레임마다 발생
  const times = [0, 20, 40, 60];
  const h = harness(times);
  let updates = 0;
  const loop = createLoop({ update: () => { updates++; }, render: () => {}, now: h.now, raf: h.raf });
  loop.start();
  h.pump(3);
  // 총 60ms = 0.06s, STEP=1/60≈0.0167 → floor(0.06/0.0167)=3 스텝
  assert.equal(updates, 3);
});

test('stop halts the loop', () => {
  const times = [0, 20, 40];
  const h = harness(times);
  let renders = 0;
  const loop = createLoop({ update: () => {}, render: () => { renders++; }, now: h.now, raf: h.raf });
  loop.start();
  loop.stop();
  h.pump(2);
  assert.equal(renders, 0);
});
