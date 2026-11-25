export type DockBookingWindow = { days: number[]; start: string; end: string };
export const defaultDockBookingWindow: DockBookingWindow = { days: [0,1,2,3,4,5,6], start: '07:00', end: '17:00' };
export const dockWeekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function dockBookingWindow(value: unknown = defaultDockBookingWindow): DockBookingWindow {
  const input = value as DockBookingWindow;
  const validTime = (time: unknown) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time);
  if (!input || !Array.isArray(input.days) || !input.days.length || input.days.length > 7 ||
      input.days.some(day => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(input.days).size !== input.days.length || !validTime(input.start) || !validTime(input.end) || input.end <= input.start) {
    throw Object.assign(new Error('Choose at least one weekday and a start time before the end time, in half-hour increments.'), {status:400});
  }
  return {days:[...input.days].sort((a,b)=>a-b),start:input.start,end:input.end};
}
export function dockBookingDayAllowed(date: string | Date, window: DockBookingWindow) {
  const day = typeof date === 'string' ? new Date(date.slice(0,10)+'T12:00:00Z').getUTCDay() : date.getDay();
  return window.days.includes(day);
}
export function dockBookingWindowLabel(window: DockBookingWindow) {
  const time = (value: string) => { const [h,m] = value.split(':').map(Number); return (h % 12 || 12) + (m ? ':30' : '') + (h < 12 ? ' AM' : ' PM'); };
  return (window.days.length === 7 ? 'Every day' : window.days.map(day=>dockWeekdays[day].slice(0,3)).join(', ')) + ' · ' + time(window.start) + '–' + time(window.end) + ' Eastern';
}
