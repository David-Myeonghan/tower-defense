export const SAVE_VERSION = 2;
const KEY = 'tower-defense-save';

// game: 저장할 게임 스냅샷(game.serialize 결과). 불투명하게 보관.
export function toSaveData(game, now) {
  return {
    version: SAVE_VERSION,
    game,
    updatedAt: now,
  };
}

export function parseSave(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

// storage: {getItem, setItem} 호환 객체. 접근 실패 시 메모리 폴백.
export function createPersistence(storage) {
  const memory = { value: null };

  async function save(saveData) {
    const raw = JSON.stringify(saveData);
    memory.value = raw;
    try {
      storage.setItem(KEY, raw);
    } catch {
      /* iframe 샌드박스/시크릿 모드 → 메모리에만 유지 */
    }
  }

  async function load() {
    let raw = null;
    try {
      raw = storage.getItem(KEY);
    } catch {
      raw = memory.value;
    }
    if (raw == null) raw = memory.value;
    if (raw == null) return null;
    return parseSave(raw);
  }

  return { load, save };
}
