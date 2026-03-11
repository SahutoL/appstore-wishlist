type LogCategory =
  | 'parser'
  | 'inject'
  | 'storage'
  | 'popup'
  | 'options'
  | 'migration'
  | 'background';

const DEBUG_ENABLED = false;

export function createLogger(category: LogCategory) {
  const prefix = `[asw:${category}]`;

  return {
    debug(...args: unknown[]) {
      if (DEBUG_ENABLED) {
        console.debug(prefix, ...args);
      }
    },
    warn(...args: unknown[]) {
      console.warn(prefix, ...args);
    },
    error(...args: unknown[]) {
      console.error(prefix, ...args);
    }
  };
}
