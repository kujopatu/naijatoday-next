// Handles dates like "30th June 2026" or "1st July 2026" that the native
// Date constructor can't parse (it returns Invalid Date for ordinals).
export function parseFlexibleDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const cleaned = String(str).replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');
  const dt = new Date(cleaned);
  return isNaN(dt.getTime()) ? null : dt;
}
