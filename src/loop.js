const STEP = 1 / 60;
const MAX_FRAME = 0.1; // 백그라운드 복귀 시 물리 폭주 방지

export function createLoop({ update, render, now = () => performance.now(), raf = requestAnimationFrame }) {
  let running = false;
  let last = 0;
  let acc = 0;

  function frame() {
    if (!running) return;
    const t = now();
    let delta = (t - last) / 1000;
    last = t;
    if (delta > MAX_FRAME) delta = MAX_FRAME;
    acc += delta;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    raf(frame);
  }

  return {
    start() { if (running) return; running = true; last = now(); acc = 0; raf(frame); },
    stop() { running = false; },
  };
}
