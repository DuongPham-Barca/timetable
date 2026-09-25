import assert from 'node:assert/strict'
import test from 'node:test'
import { dailyLessonId, datesInMonth, expandDailyLessons } from '../src/lib/dailySchedule.ts'
import { getMonthlyTeachingReport } from '../src/lib/monthlyReport.ts'

const child = (id, start) => ({ id, name: id, subject: '', avatar: 'flower', avatarTone: 'pink', daily_start_date: start })
const lesson = (id, child_id, lesson_date, completed = false) => ({ id, child_id, lesson_date, starts_at: '', duration: 0, content: '', completed })

test('shows every child each day from its start date, including weekends', () => {
  const kids = [child('old', '2026-09-25'), child('new', '2026-09-27')]
  const dates = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']
  const result = expandDailyLessons(kids, [], dates)

  assert.deepEqual(result.map(({ child_id, lesson_date }) => [child_id, lesson_date]), [
    ['old', '2026-09-25'], ['old', '2026-09-26'], ['new', '2026-09-27'], ['old', '2026-09-27'],
  ])
  assert.ok(result.every(({ virtual, completed }) => virtual && !completed))
  assert.equal(result[0].id, dailyLessonId('old', '2026-09-25'))
})

test('uses saved lessons instead of a daily placeholder for the same child and date', () => {
  const kids = [child('a', '2026-09-25'), child('b', '2026-09-25')]
  const saved = [lesson('manual1', 'a', '2026-09-25', true), lesson('manual2', 'a', '2026-09-25')]
  const result = expandDailyLessons(kids, saved, ['2026-09-25'])

  assert.deepEqual(result.map(({ id }) => id), ['manual1', 'manual2', dailyLessonId('b', '2026-09-25')])
  assert.equal(getMonthlyTeachingReport(kids, saved, '2026-09')[0].totalDays, 1)

  const moved = saved.map((item) => ({ ...item, lesson_date: '2026-09-26' }))
  assert.deepEqual(expandDailyLessons(kids, moved, ['2026-09-25']).map(({ id }) => id), [dailyLessonId('a', '2026-09-25'), dailyLessonId('b', '2026-09-25')])
})

test('unmarked saved sessions stay pending without creating a second daily row', () => {
  const kid = child('a', '2026-09-25')
  const saved = lesson(dailyLessonId('a', '2026-09-25'), 'a', '2026-09-25', false)

  assert.deepEqual(expandDailyLessons([kid], [saved], ['2026-09-25']), [saved])
  assert.equal(getMonthlyTeachingReport([kid], [saved], '2026-09')[0].totalDays, 0)
})

test('returns every calendar date for the selected month', () => {
  assert.equal(datesInMonth('2028-02').length, 29)
  assert.equal(datesInMonth('2026-02').length, 28)
  assert.equal(datesInMonth('2026-09').at(-1), '2026-09-30')
})
