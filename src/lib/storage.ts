const STORAGE_KEY = 'coloane-traces:progress:v1';

interface StoredTraceState {
  version: 1;
  explored: string[];
  reduceMotion: boolean;
}

const emptyState = (): StoredTraceState => ({
  version: 1,
  explored: [],
  reduceMotion: false,
});

export function readTraceState(): StoredTraceState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('explored' in parsed) ||
      !Array.isArray(parsed.explored)
    ) {
      return emptyState();
    }

    return {
      version: 1,
      explored: parsed.explored.filter((id): id is string => typeof id === 'string'),
      reduceMotion: 'reduceMotion' in parsed && parsed.reduceMotion === true,
    };
  } catch {
    return emptyState();
  }
}

export function writeTraceState(explored: Iterable<string>, reduceMotion: boolean) {
  try {
    const state: StoredTraceState = {
      version: 1,
      explored: Array.from(new Set(explored)),
      reduceMotion,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browsing still works when storage is blocked or unavailable.
  }
}

export function clearTraceState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Browsing still works when storage is blocked or unavailable.
  }
}
