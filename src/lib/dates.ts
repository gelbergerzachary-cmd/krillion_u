/** Local calendar date as YYYY-MM-DD (everyone's "today" is their own local day). */
export const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const today = () => toISODate(new Date());

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

export const prettyDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

export type Period = 'today' | 'week' | 'month' | 'all';

export const periodStart = (p: Period): string | null =>
  p === 'today' ? today() : p === 'week' ? daysAgo(6) : p === 'month' ? daysAgo(29) : null;

export const PERIOD_LABEL: Record<Period, string> = {
  today: 'Today',
  week: '7 days',
  month: '30 days',
  all: 'All time',
};
