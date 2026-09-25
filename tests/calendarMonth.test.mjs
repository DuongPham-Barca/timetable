import assert from 'node:assert/strict'
import test from 'node:test'
import { calendarMonthAfterDateChange, monthKey } from '../src/lib/data.ts'

test('moves the viewed current month forward when the date crosses a month boundary', () => {
  const september = new Date(2026, 8, 1)
  assert.equal(monthKey(calendarMonthAfterDateChange(september, '2026-09-30', '2026-10-01')), '2026-10')
  assert.equal(monthKey(calendarMonthAfterDateChange(new Date(2026, 11, 1), '2026-12-31', '2027-01-01')), '2027-01')
})

test('keeps the selected month when only the day changes or another month is being viewed', () => {
  const september = new Date(2026, 8, 1)
  assert.equal(calendarMonthAfterDateChange(september, '2026-09-15', '2026-09-16'), september)
  assert.equal(calendarMonthAfterDateChange(september, '2026-10-31', '2026-11-01'), september)
})
