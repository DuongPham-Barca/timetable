import type { Child, Lesson } from './data'

export type MonthlyTeachingRecord = {
  child: Child
  dates: string[]
  totalDays: number
}

export function getMonthlyTeachingReport(kids: Child[], lessons: Lesson[], month: string): MonthlyTeachingRecord[] {
  const datesByChild = new Map(kids.map((child) => [child.id, new Set<string>()]))

  for (const lesson of lessons) {
    if (lesson.completed && lesson.lesson_date.startsWith(`${month}-`)) {
      datesByChild.get(lesson.child_id)?.add(lesson.lesson_date)
    }
  }

  return kids.map((child) => {
    const dates = [...(datesByChild.get(child.id) ?? [])].sort()
    return { child, dates, totalDays: dates.length }
  })
}

function csvCell(value: string) {
  // Keep names entered by users from being interpreted as spreadsheet formulas.
  const safe = /^\s*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function monthlyReportCsv(report: MonthlyTeachingRecord[], month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const names = report.map(({ child }) => child.name.trim() || 'Bé yêu')
  const reservedNames = new Set(names)
  const usedNames = new Set<string>()
  const headers = names.map((name) => {
    if (!usedNames.has(name)) { usedNames.add(name); return name }
    let suffix = 2
    while (usedNames.has(`${name} (${suffix})`) || reservedNames.has(`${name} (${suffix})`)) suffix += 1
    const uniqueName = `${name} (${suffix})`
    usedNames.add(uniqueName)
    return uniqueName
  })

  const lines = [
    ['Ngày', ...headers],
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`
      return [date, ...report.map(({ dates }) => dates.includes(date) ? '1' : '')]
    }),
    ['Tổng số ngày', ...report.map(({ totalDays }) => String(totalDays))],
  ]

  return `\uFEFF${lines.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}
