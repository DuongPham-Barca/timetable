import assert from 'node:assert/strict'
import test from 'node:test'
import { getMonthlyTeachingReport, monthlyReportCsv } from '../src/lib/monthlyReport.ts'

const child = (id, name) => ({ id, name, subject: '', avatar: 'flower', avatarTone: 'pink' })
const lesson = (id, child_id, lesson_date, completed = true) => ({ id, child_id, lesson_date, completed, starts_at: '', duration: 0, content: '' })

test('counts distinct completed dates per child in the selected month', () => {
  const kids = [child('a', 'Bé Mây'), child('b', 'Bé An'), child('c', 'Bé Na')]
  const lessons = [
    lesson('1', 'a', '2026-09-03'),
    lesson('2', 'a', '2026-09-03'),
    lesson('3', 'a', '2026-09-04', false),
    lesson('4', 'a', '2026-10-01'),
    lesson('5', 'b', '2026-09-03'),
    lesson('6', '', '2026-09-05'),
    lesson('7', 'missing', '2026-09-06'),
  ]

  assert.deepEqual(getMonthlyTeachingReport(kids, lessons, '2026-09').map(({ child: kid, dates, totalDays }) => ({ id: kid.id, dates, totalDays })), [
    { id: 'a', dates: ['2026-09-03'], totalDays: 1 },
    { id: 'b', dates: ['2026-09-03'], totalDays: 1 },
    { id: 'c', dates: [], totalDays: 0 },
  ])
  assert.equal(getMonthlyTeachingReport(kids, lessons.map((item) => item.id === '1' ? { ...item, completed: false } : item), '2026-09')[0].totalDays, 1)
  assert.equal(getMonthlyTeachingReport(kids, lessons.map((item) => item.child_id === 'a' && item.lesson_date === '2026-09-03' ? { ...item, completed: false } : item), '2026-09')[0].totalDays, 0)
  assert.equal(getMonthlyTeachingReport(kids, lessons.map((item) => item.id === '1' || item.id === '2' ? { ...item, lesson_date: '2026-10-03' } : item), '2026-09')[0].totalDays, 0)
  assert.equal(getMonthlyTeachingReport(kids, lessons, '2026-10')[0].totalDays, 1)
  assert.equal(getMonthlyTeachingReport(kids, lessons.map((item) => item.id === '5' ? { ...item, child_id: 'a' } : item), '2026-09')[1].totalDays, 0)
})

test('exports one row per day, a total row, and safe Vietnamese child headers', () => {
  const kids = [child('a', 'Bé Mây, "Nhỏ"'), child('b', '=SUM(1+1)'), child('c', 'Bé Mây, "Nhỏ"')]
  const report = getMonthlyTeachingReport(kids, [lesson('1', 'a', '2026-09-03'), lesson('2', 'a', '2026-09-03'), lesson('3', 'b', '2026-09-15')], '2026-09')
  const csv = monthlyReportCsv(report, '2026-09')
  const rows = csv.slice(1).trimEnd().split('\r\n')

  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.equal(rows.length, 32)
  assert.equal(rows[0], '"Ngày","Bé Mây, ""Nhỏ""","\'=SUM(1+1)","Bé Mây, ""Nhỏ"" (2)"')
  assert.equal(rows[3], '"2026-09-03","1","",""')
  assert.equal(rows[15], '"2026-09-15","","1",""')
  assert.equal(rows[31], '"Tổng số ngày","1","1","0"')
})

test('keeps each child column distinct when names already contain numeric suffixes', () => {
  const report = getMonthlyTeachingReport([child('a', 'Bé An'), child('b', 'Bé An'), child('c', 'Bé An (2)')], [], '2028-02')
  const rows = monthlyReportCsv(report, '2028-02').slice(1).trimEnd().split('\r\n')

  assert.equal(rows[0], '"Ngày","Bé An","Bé An (3)","Bé An (2)"')
  assert.equal(rows.length, 31)
  assert.equal(rows.at(-1), '"Tổng số ngày","0","0","0"')
})
