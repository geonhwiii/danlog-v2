/** Format a date as `YYYY-MM-DD`. */
export const toYmd = (d: Date) => d.toISOString().slice(0, 10);
