export function currentLocalDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function localDateDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function defaultReviewDateRange() {
  return {
    startDate: localDateDaysAgo(30),
    endDate: currentLocalDate(),
  };
}

export function localMonthStartDate(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const localStart = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
  return localStart.toISOString().slice(0, 10);
}

export function isDateWithinRange(
  value: string,
  startDate: string,
  endDate: string,
): boolean {
  return value >= startDate && value <= endDate;
}
