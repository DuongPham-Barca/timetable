import type { Child, DisplayLesson, Lesson } from './data'

export const dailyLessonId = (childId: string, date: string) => `daily:${childId}:${date}`

export function datesInMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return Array.from({ length: new Date(year, monthNumber, 0).getDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`)
}

export function expandDailyLessons(kids: Child[], lessons: Lesson[], dates: string[]): DisplayLesson[] {
  const wantedDates = new Set(dates)
  const saved = lessons.filter((lesson) => wantedDates.has(lesson.lesson_date))
  const savedChildDays = new Set(saved.map((lesson) => `${lesson.child_id}\u0000${lesson.lesson_date}`))
  const daily = dates.flatMap((date) => kids
    .filter((child) => child.daily_start_date <= date && !savedChildDays.has(`${child.id}\u0000${date}`))
    .map((child): DisplayLesson => ({
      id: dailyLessonId(child.id, date),
      child_id: child.id,
      lesson_date: date,
      starts_at: '',
      duration: 0,
      content: '',
      completed: false,
      virtual: true,
    })))

  return [...saved, ...daily].sort((a, b) => `${a.lesson_date}${a.starts_at}${a.child_id}`.localeCompare(`${b.lesson_date}${b.starts_at}${b.child_id}`))
}
