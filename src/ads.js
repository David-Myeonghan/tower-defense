// 리워드 광고 어댑터 (seam). 웹은 목업(카운트다운 후 성공), 모바일은 이 함수만 AdMob 등으로 교체.
// hooks: { onStart(seconds), onProgress(remaining), onDone(success), setTimeout } 주입 → 테스트/렌더 결합 최소화.
import { CONFIG } from './config.js';

// 목업 리워드 광고: seconds초 카운트다운 후 성공(true) resolve.
// setTimeout을 주입받아 테스트에서 결정론적으로 구동 가능.
export function createRewardedAd({ setTimeout: setT = globalThis.setTimeout, seconds = CONFIG.bomb.adSeconds } = {}) {
  let playing = false;

  function showRewardedAd(hooks = {}) {
    if (playing) return Promise.resolve(false); // 중복 방지
    playing = true;
    const onStart = hooks.onStart || (() => {});
    const onProgress = hooks.onProgress || (() => {});
    const onDone = hooks.onDone || (() => {});
    onStart(seconds);
    return new Promise((resolve) => {
      let remaining = seconds;
      const step = () => {
        remaining -= 1;
        if (remaining > 0) {
          onProgress(remaining);
          setT(step, 1000);
        } else {
          playing = false;
          onProgress(0);
          onDone(true);
          resolve(true); // 목업은 항상 완주 → 보상 지급
        }
      };
      onProgress(remaining);
      setT(step, 1000);
    });
  }

  return { showRewardedAd, isPlaying: () => playing };
}
