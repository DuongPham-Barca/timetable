export type Child = {
  id: string
  name: string
  subject: string
  avatar: string
  avatarTone: 'pink' | 'peach' | 'lilac'
  daily_start_date: string
}

export type Lesson = {
  id: string
  child_id: string
  lesson_date: string
  starts_at: string
  duration: number
  content: string
  completed: boolean
}

export type DisplayLesson = Lesson & { virtual?: true }

export const asLocalDate = (value = new Date()) => {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export function calendarMonthAfterDateChange(viewedMonth: Date, previousDate: string, nextDate: string) {
  const previousMonth = previousDate.slice(0, 7)
  const nextMonth = nextDate.slice(0, 7)
  if (previousMonth === nextMonth || monthKey(viewedMonth) !== previousMonth) return viewedMonth
  const [year, month] = nextMonth.split('-').map(Number)
  return new Date(year, month - 1, 1)
}
