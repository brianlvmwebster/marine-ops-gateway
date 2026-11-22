import { addServiceDays } from './dashboardWidgets';
export function compactCalendarWeek(today: string, offset = 0) {
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay();
  const tuesday = addServiceDays(today, 1 - ((weekday + 6) % 7) + offset * 7);
  return Array.from({length:5}, (_, index) => addServiceDays(tuesday, index));
}
