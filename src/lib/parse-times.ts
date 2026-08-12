// Normalize a Medication `times` value to a string[] of "HH:MM" times.
//
// The column is stored as a JSON array string ('["08:00","20:00"]'), but
// legacy seed data wrote comma-separated strings ('08:00,20:00'). This parser
// accepts both plus an already-parsed array, so one legacy/corrupt row can
// never crash an API list with JSON.parse. Falls back to ['09:00'] when
// nothing valid remains.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseTimes(value: unknown): string[] {
  if (Array.isArray(value)) {
    const ok = value.filter((t): t is string => typeof t === 'string' && TIME_RE.test(t));
    return ok.length ? ok : ['09:00'];
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return ['09:00'];
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) return parseTimes(parsed);
    } catch {
      // Not JSON — legacy comma-separated list, handled below.
    }
    const ok = t
      .split(',')
      .map((s) => s.trim())
      .filter((s) => TIME_RE.test(s));
    return ok.length ? ok : ['09:00'];
  }
  return ['09:00'];
}
