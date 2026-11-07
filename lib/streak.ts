// Reading streak, kept in the browser (same keys as the original site, so
// existing streaks carry over): naija_streak_dates = list of YYYY-MM-DD days.
export type StreakInfo = { current: number; longest: number; total: number };

const todayStr = () => new Date().toLocaleDateString('en-CA');

export function recordReadToday() {
  try {
    const today = todayStr();
    if (localStorage.getItem('naija_streak_last') === today) return;
    const dates: string[] = JSON.parse(localStorage.getItem('naija_streak_dates') || '[]');
    if (!dates.includes(today)) dates.push(today);
    localStorage.setItem('naija_streak_dates', JSON.stringify(dates));
    localStorage.setItem('naija_streak_last', today);
  } catch {}
}

export function getStreakInfo(): StreakInfo {
  try {
    const dates: string[] = JSON.parse(localStorage.getItem('naija_streak_dates') || '[]').sort();
    if (dates.length === 0) return { current: 0, longest: 0, total: 0 };
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    let current = 0;
    const desc = [...dates].reverse();
    if (desc[0] === today || desc[0] === yesterday) {
      let check = desc[0];
      for (const d of desc) {
        if (d === check) {
          current++;
          const dt = new Date(check);
          dt.setDate(dt.getDate() - 1);
          check = dt.toLocaleDateString('en-CA');
        } else if (d < check) break;
      }
    }
    let longest = 1, run = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (prev.toLocaleDateString('en-CA') === dates[i]) { run++; longest = Math.max(longest, run); } else run = 1;
    }
    return { current, longest: Math.max(longest, current), total: dates.length };
  } catch {
    return { current: 0, longest: 0, total: 0 };
  }
}

export function streakMessage(n: number) {
  return n >= 30 ? `🔥🔥🔥 ${n}-day streak! You're on fire!`
    : n >= 14 ? `🔥🔥 ${n}-day reading streak! Keep going!`
    : n >= 7 ? `🔥 ${n} days in a row! Great habit!`
    : `🔥 ${n}-day streak! Keep it up!`;
}
