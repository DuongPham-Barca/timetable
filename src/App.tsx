import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Baby } from '@phosphor-icons/react/Baby'
import { CalendarDots } from '@phosphor-icons/react/CalendarDots'
import { CalendarPlus } from '@phosphor-icons/react/CalendarPlus'
import { CaretLeft } from '@phosphor-icons/react/CaretLeft'
import { CaretRight } from '@phosphor-icons/react/CaretRight'
import { ChartBar } from '@phosphor-icons/react/ChartBar'
import { Check } from '@phosphor-icons/react/Check'
import { Clock } from '@phosphor-icons/react/Clock'
import { DownloadSimple } from '@phosphor-icons/react/DownloadSimple'
import { Flower } from '@phosphor-icons/react/Flower'
import { FlowerTulip } from '@phosphor-icons/react/FlowerTulip'
import { Heart } from '@phosphor-icons/react/Heart'
import { House } from '@phosphor-icons/react/House'
import { Moon } from '@phosphor-icons/react/Moon'
import { Pencil } from '@phosphor-icons/react/Pencil'
import { PencilSimple } from '@phosphor-icons/react/PencilSimple'
import { Plus } from '@phosphor-icons/react/Plus'
import { Rabbit } from '@phosphor-icons/react/Rabbit'
import { Sparkle } from '@phosphor-icons/react/Sparkle'
import { Star } from '@phosphor-icons/react/Star'
import { Sun } from '@phosphor-icons/react/Sun'
import { Trophy } from '@phosphor-icons/react/Trophy'
import { UsersThree } from '@phosphor-icons/react/UsersThree'
import { X } from '@phosphor-icons/react/X'
import { Trash } from '@phosphor-icons/react/Trash'
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { asLocalDate, type Child, type DisplayLesson, type Lesson } from './lib/data'
import { dailyLessonId, datesInMonth, expandDailyLessons } from './lib/dailySchedule'
import { getMonthlyTeachingReport, monthlyReportCsv, type MonthlyTeachingRecord } from './lib/monthlyReport'
import { firestore } from './lib/firebase'

type Tab = 'today' | 'calendar' | 'children' | 'summary'
type DataState = 'loading' | 'ready' | 'unconfigured' | 'error'
type LessonInput = Omit<Lesson, 'id' | 'completed'>
type ChildInput = Omit<Child, 'id' | 'daily_start_date'>

const navItems = [
  { id: 'today' as const, label: 'Hôm nay', Icon: House },
  { id: 'calendar' as const, label: 'Lịch', Icon: CalendarDots },
  { id: 'children' as const, label: 'Các bé', Icon: UsersThree },
  { id: 'summary' as const, label: 'Tổng kết', Icon: ChartBar },
]
const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const formatDateKey = (date: Date) => asLocalDate(date)
const startOfWeek = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function Header({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return <header className="page-heading"><div className="brand">Sổ Dạy Nhỏ</div><div className="heading-title"><span className="heading-emoji">{icon}</span><div><h1>{title}</h1><p>{subtitle}</p></div></div></header>
}

function ChildAvatar({ child }: { child?: Child }) {
  if (child?.avatar === 'bear') return <Baby weight="duotone" />
  if (child?.avatar === 'tulip') return <FlowerTulip weight="fill" />
  if (child?.avatar === 'star') return <Star weight="fill" />
  return <Flower weight="fill" />
}

const isDateKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

function toChild(id: string, row: Record<string, unknown>, fallbackStart: string): Child {
  const tone = row.avatarTone
  return {
    id, name: String(row.name ?? ''), subject: String(row.subject ?? ''), avatar: String(row.avatar ?? 'flower'),
    avatarTone: tone === 'peach' || tone === 'lilac' ? tone : 'pink',
    daily_start_date: isDateKey(row.daily_start_date) ? row.daily_start_date : fallbackStart,
  }
}
function toLesson(id: string, row: Record<string, unknown>): Lesson {
  return {
    id, child_id: String(row.child_id ?? ''), lesson_date: String(row.lesson_date ?? ''), starts_at: String(row.starts_at ?? '').slice(0, 5),
    duration: Number(row.duration ?? 0), content: String(row.content ?? ''), completed: Boolean(row.completed),
  }
}

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [dark, setDark] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [showChildModal, setShowChildModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonDefaults, setLessonDefaults] = useState<{ childId: string; date: string } | null>(null)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [kids, setKids] = useState<Child[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [dataState, setDataState] = useState<DataState>(firestore ? 'loading' : 'unconfigured')
  const [loadError, setLoadError] = useState('')
  const [currentDate, setCurrentDate] = useState(() => asLocalDate())
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const savingVirtual = useRef(new Set<string>())

  useEffect(() => {
    let midnightTimer: number
    const scheduleMidnight = () => {
      const now = new Date()
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      midnightTimer = window.setTimeout(() => { setCurrentDate(asLocalDate()); scheduleMidnight() }, nextDay.getTime() - now.getTime() + 100)
    }
    const refreshDate = () => {
      if (document.visibilityState === 'hidden') return
      window.clearTimeout(midnightTimer)
      setCurrentDate(asLocalDate())
      scheduleMidnight()
    }
    scheduleMidnight()
    document.addEventListener('visibilitychange', refreshDate)
    window.addEventListener('focus', refreshDate)
    return () => { window.clearTimeout(midnightTimer); document.removeEventListener('visibilitychange', refreshDate); window.removeEventListener('focus', refreshDate) }
  }, [])

  useEffect(() => {
    const database = firestore
    if (!database) return
    const rolloutDate = asLocalDate()
    const backfilling = new Set<string>()
    let childrenLoaded = false, lessonsLoaded = false
    const markLoaded = () => { if (childrenLoaded && lessonsLoaded) setDataState('ready') }
    const onError = (error: Error) => { setLoadError(error.message); setDataState('error') }
    const stopChildren = onSnapshot(collection(database, 'children'), (snapshot) => {
      setKids(snapshot.docs.map((item) => toChild(item.id, item.data(), rolloutDate)).sort((a, b) => a.name.localeCompare(b.name, 'vi')))
      snapshot.docs.forEach((item) => {
        if (isDateKey(item.data().daily_start_date) || backfilling.has(item.id)) return
        backfilling.add(item.id)
        updateDoc(item.ref, { daily_start_date: rolloutDate })
          .catch(() => setLoadError('Không thể lưu ngày bắt đầu lịch tự động cho một bé. Vui lòng tải lại trang để thử lại.'))
          .finally(() => backfilling.delete(item.id))
      })
      childrenLoaded = true
      markLoaded()
    }, onError)
    const stopLessons = onSnapshot(collection(database, 'lessons'), (snapshot) => {
      setLessons(snapshot.docs.map((item) => toLesson(item.id, item.data())).sort((a, b) => `${a.lesson_date}${a.starts_at}`.localeCompare(`${b.lesson_date}${b.starts_at}`)))
      lessonsLoaded = true
      markLoaded()
    }, onError)
    return () => { stopChildren(); stopLessons() }
  }, [])

  const sessionsToday = useMemo(() => expandDailyLessons(kids, lessons, [currentDate]), [kids, lessons, currentDate])
  const completedToday = sessionsToday.filter((lesson) => lesson.completed).length
  const todayPct = sessionsToday.length ? Math.round((completedToday / sessionsToday.length) * 100) : 0
  const weekStart = useMemo(() => startOfWeek(new Date(`${currentDate}T12:00:00`)), [currentDate])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(weekStart.getDate() + index); return formatDateKey(date) }), [weekStart])
  const weekDateSet = useMemo(() => new Set(weekDates), [weekDates])
  const completedThisWeek = lessons.filter((lesson) => lesson.completed && weekDateSet.has(lesson.lesson_date)).length
  const streak = useMemo(() => getCurrentStreak(lessons, currentDate), [lessons, currentDate])

  const toggleLesson = async (selected: DisplayLesson) => {
    const database = firestore
    if (selected.virtual) {
      if (!database || savingVirtual.current.has(selected.id)) return
      savingVirtual.current.add(selected.id)
      try {
        await setDoc(doc(database, 'lessons', selected.id), { child_id: selected.child_id, lesson_date: selected.lesson_date, completed: true }, { merge: true })
      } catch { setLoadError('Không thể lưu buổi dạy. Vui lòng thử lại.') }
      finally { savingVirtual.current.delete(selected.id) }
      return
    }
    const id = selected.id, current = lessons.find((lesson) => lesson.id === id)
    if (!database || !current) return
    const completed = !current.completed
    setLessons((items) => items.map((lesson) => lesson.id === id ? { ...lesson, completed } : lesson))
    try { await updateDoc(doc(database, 'lessons', id), { completed }) }
    catch { setLessons((items) => items.map((lesson) => lesson.id === id ? current : lesson)); setLoadError('Không thể cập nhật buổi dạy. Vui lòng thử lại.') }
  }
  const addLesson = async (input: LessonInput) => {
    if (!firestore) return false
    try { await addDoc(collection(firestore, 'lessons'), { ...input, createdAt: serverTimestamp() }); return true } catch { return false }
  }
  const addChild = async (input: ChildInput) => {
    if (!firestore) return false
    try { await addDoc(collection(firestore, 'children'), { ...input, daily_start_date: currentDate, createdAt: serverTimestamp() }); return true } catch { return false }
  }
  const markDayAsTaught = async (date: string) => {
    const database = firestore
    if (!database) return
    const pending = expandDailyLessons(kids, lessons, [date]).filter((lesson) => !lesson.completed)
    try {
      for (let index = 0; index < pending.length; index += 450) {
        const batch = writeBatch(database)
        pending.slice(index, index + 450).forEach((lesson) => {
          const reference = doc(database, 'lessons', lesson.id)
          if (lesson.virtual) batch.set(reference, { child_id: lesson.child_id, lesson_date: date, completed: true }, { merge: true })
          else batch.update(reference, { completed: true })
        })
        await batch.commit()
      }
    } catch { setLoadError('Không thể lưu trạng thái đã dạy. Vui lòng thử lại.') }
  }
  const addTaughtLesson = async (date: string, childId: string) => {
    if (!firestore || !kids.some((child) => child.id === childId)) return false
    try {
      await setDoc(doc(firestore, 'lessons', dailyLessonId(childId, date)), { child_id: childId, lesson_date: date, completed: true }, { merge: true })
      return true
    } catch { return false }
  }
  const updateLesson = async (id: string, input: LessonInput) => {
    if (!firestore) return false
    try { await updateDoc(doc(firestore, 'lessons', id), input); return true } catch { return false }
  }
  const updateChild = async (id: string, input: ChildInput) => {
    if (!firestore) return false
    try { await updateDoc(doc(firestore, 'children', id), input); return true } catch { return false }
  }
  const deleteChild = async (id: string) => {
    if (!firestore || !window.confirm('Xoá bé này và toàn bộ buổi học của bé?')) return
    try {
      const attachedLessons = await getDocs(query(collection(firestore, 'lessons'), where('child_id', '==', id)))
      for (let index = 0; index < attachedLessons.docs.length; index += 450) {
        const batch = writeBatch(firestore)
        attachedLessons.docs.slice(index, index + 450).forEach((lesson) => batch.delete(lesson.ref))
        await batch.commit()
      }
      await deleteDoc(doc(firestore, 'children', id))
    } catch { setLoadError('Không thể xoá bé. Vui lòng thử lại.') }
  }

  const openLessonEditor = (lesson: DisplayLesson) => {
    setEditingLesson(lesson.virtual ? null : lesson)
    setLessonDefaults(lesson.virtual ? { childId: lesson.child_id, date: lesson.lesson_date } : null)
    setShowLessonModal(true)
  }

  const canWrite = dataState === 'ready'
  return <main className={dark ? 'app app-dark' : 'app'}>
    <Flower className="decor decor-flower" weight="fill" /><Sparkle className="decor decor-sparkle" weight="fill" /><Heart className="decor decor-heart" weight="fill" />
    <button className="theme-switch" aria-label="Đổi giao diện" onClick={() => setDark(!dark)}>{dark ? <Sun weight="duotone" /> : <Moon weight="duotone" />}</button>
    <section className="shell">
      <DataNotice state={dataState} error={loadError} />
      {tab === 'today' && <TodayView date={currentDate} lessons={sessionsToday} kids={kids} dataReady={canWrite} completed={completedToday} pct={todayPct} streak={streak} weekCompleted={completedThisWeek} onToggle={toggleLesson} onEdit={openLessonEditor} />}
      {tab === 'calendar' && <CalendarView lessons={lessons} kids={kids} month={calendarMonth} todayDate={currentDate} dataReady={canWrite} onChangeMonth={setCalendarMonth} onToggle={toggleLesson} onMarkDay={markDayAsTaught} onAddTaught={addTaughtLesson} onEdit={openLessonEditor} />}
      {tab === 'children' && <ChildrenView kids={kids} lessons={lessons} weekDateSet={weekDateSet} onDelete={deleteChild} onEdit={(child) => { setEditingChild(child); setShowChildModal(true) }} />}
      {tab === 'summary' && <SummaryView lessons={lessons} kids={kids} currentDate={currentDate} weekDates={weekDates} streak={streak} />}
    </section>
    <button className="floating-add" disabled={!canWrite} onClick={() => { if (tab === 'children') { setEditingChild(null); setShowChildModal(true) } else { setEditingLesson(null); setLessonDefaults(null); setShowLessonModal(true) } }} aria-label={tab === 'children' ? 'Thêm bé' : 'Thêm buổi dạy'}><Plus weight="bold" /></button>
    <nav className="bottom-nav">{navItems.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><span><Icon weight={tab === id ? 'fill' : 'regular'} /></span>{label}</button>)}</nav>
    {showLessonModal && <AddLessonModal lesson={editingLesson ?? undefined} initialChildId={lessonDefaults?.childId} initialDate={lessonDefaults?.date ?? currentDate} kids={kids} onClose={() => { setShowLessonModal(false); setEditingLesson(null); setLessonDefaults(null) }} onSave={editingLesson ? (input) => updateLesson(editingLesson.id, input) : addLesson} />}
    {showChildModal && <AddChildModal child={editingChild ?? undefined} onClose={() => { setShowChildModal(false); setEditingChild(null) }} onSave={editingChild ? (input) => updateChild(editingChild.id, input) : addChild} />}
  </main>
}

function DataNotice({ state, error }: { state: DataState; error: string }) {
  if (state === 'ready' && !error) return null
  if (state === 'loading') return <div className="data-notice">Đang tải dữ liệu từ Firebase…</div>
  if (state === 'unconfigured') return <div className="data-notice warning">Chưa kết nối Firebase. Hãy thêm các biến `VITE_FIREBASE_*` vào `.env.local`.</div>
  return <div className="data-notice warning">{error || 'Không thể tải dữ liệu Firebase.'}</div>
}

function TodayView({ date, lessons, kids, dataReady, completed, pct, streak, weekCompleted, onToggle, onEdit }: { date: string; lessons: DisplayLesson[]; kids: Child[]; dataReady: boolean; completed: number; pct: number; streak: number; weekCompleted: number; onToggle: (lesson: DisplayLesson) => void; onEdit: (lesson: DisplayLesson) => void }) {
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))
  return <>
    <div className="today-top"><div className="brand">Sổ Dạy Nhỏ</div><section className="greeting-card"><div><small>{weekday}</small><h1>Chào Cô My nhé ạ <span><FlowerTulip weight="fill" /></span></h1><p>Hôm nay mình có {lessons.length} buổi dạy nè!</p></div><div className="bunny" aria-hidden="true"><Rabbit weight="duotone" /><span><Pencil weight="fill" /></span></div></section></div>
    <div className="stats-row"><StatCard color="mint" icon={<FlowerTulip weight="fill" />} label="Đã hoàn thành" value={`${completed}/${lessons.length} buổi`} /><StatCard color="peach" icon={<Clock weight="duotone" />} label="Buổi còn lại" value={`${Math.max(lessons.length - completed, 0)} buổi`} /></div>
    <section className="progress"><div><strong>Tiến độ hôm nay</strong><b>{pct}%</b></div><span><i style={{ width: `${pct}%` }} /></span></section>
    <section className="section-title"><h2>Lịch dạy hôm nay</h2><p>Một ngày thật xinh <Sparkle weight="fill" /></p></section>
    <div className="lesson-list">{lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} child={kids.find((kid) => kid.id === lesson.child_id)} dataReady={dataReady} onToggle={onToggle} onEdit={onEdit} />)}{!lessons.length && <div className="empty-state">Chưa có buổi dạy nào hôm nay.</div>}</div>
    <div className="streak-banner"><span><FlowerTulip weight="fill" /></span><div><b>{streak} ngày dạy chăm chỉ</b><p>Tuần này mình đã hoàn thành {weekCompleted} buổi.</p></div></div>
  </>
}

function StatCard({ color, icon, label, value }: { color: string; icon: ReactNode; label: string; value: string }) { return <article className={`stat-card ${color}`}><span>{icon}</span><small>{label}</small><b>{value}</b></article> }
function LessonCard({ lesson, child, dataReady, onToggle, onEdit }: { lesson: DisplayLesson; child?: Child; dataReady: boolean; onToggle: (lesson: DisplayLesson) => void; onEdit: (lesson: DisplayLesson) => void }) {
  return <article className={`lesson-card ${lesson.completed ? 'is-complete' : ''}`}><div className={`avatar ${child?.avatarTone ?? 'pink'}`}><ChildAvatar child={child} /></div><div className="lesson-info">{!lesson.virtual && <div className="lesson-meta"><b><Clock weight="bold" /> {lesson.starts_at || 'Chưa đặt giờ'}</b></div>}<h3>{child?.name || 'Bé yêu'}</h3><p>{lesson.virtual ? 'Lịch hằng ngày' : lesson.content || 'Chưa ghi nội dung'}{lesson.duration ? ` · ${lesson.duration} phút` : ''}</p></div><button className="edit-lesson" aria-label="Chỉnh sửa buổi dạy" disabled={!dataReady} onClick={() => onEdit(lesson)}><PencilSimple weight="bold" /></button><button onClick={() => onToggle(lesson)} disabled={!dataReady} className={lesson.completed ? 'done-btn muted' : 'done-btn'}><Check weight="bold" /> {lesson.completed ? 'Đã dạy rồi' : 'Đã dạy'}</button></article>
}

function CalendarView({ lessons, kids, month: monthCursor, todayDate, dataReady, onChangeMonth, onToggle, onMarkDay, onAddTaught, onEdit }: { lessons: Lesson[]; kids: Child[]; month: Date; todayDate: string; dataReady: boolean; onChangeMonth: (date: Date) => void; onToggle: (lesson: DisplayLesson) => void; onMarkDay: (date: string) => void; onAddTaught: (date: string, childId: string) => Promise<boolean>; onEdit: (lesson: DisplayLesson) => void }) {
  const year = monthCursor.getFullYear(), month = monthCursor.getMonth(), firstDay = (new Date(year, month, 1).getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const report = useMemo(() => getMonthlyTeachingReport(kids, lessons, monthKey), [kids, lessons, monthKey])
  const displayedLessons = useMemo(() => expandDailyLessons(kids, lessons, datesInMonth(monthKey)), [kids, lessons, monthKey])
  const lessonsByDate = new Map<string, DisplayLesson[]>()
  displayedLessons.forEach((lesson) => lessonsByDate.set(lesson.lesson_date, [...(lessonsByDate.get(lesson.lesson_date) ?? []), lesson]))
  const cells = Array.from({ length: firstDay + days }, (_, index) => index < firstDay ? null : index - firstDay + 1)
  const dateKey = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`
  const selectMonth = (nextMonth: Date) => { onChangeMonth(nextMonth); setSelectedDate(null) }
  const selectedLessons = selectedDate ? lessonsByDate.get(selectedDate) ?? [] : []
  const downloadCsv = () => {
    const blob = new Blob([monthlyReportCsv(report, monthKey)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tong-hop-day-${monthKey}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  const editFromCalendar = (lesson: DisplayLesson) => { setSelectedDate(null); onEdit(lesson) }

  return <>
    <Header icon={<CalendarDots weight="duotone" />} title={`Lịch tháng ${month + 1}`} subtitle="Chạm vào một ngày để xem buổi học" />
    <section className="calendar-card">
      <div className="calendar-toolbar"><button aria-label="Tháng trước" onClick={() => selectMonth(new Date(year, month - 1, 1))}><CaretLeft /></button><h2>Tháng {month + 1} · {year}</h2><button aria-label="Tháng sau" onClick={() => selectMonth(new Date(year, month + 1, 1))}><CaretRight /></button></div>
      <div className="calendar-week">{weekLabels.map((day) => <b key={day}>{day}</b>)}</div>
      <div className="calendar-grid">{cells.map((day, index) => { const key = day ? dateKey(day) : '', dayLessons = lessonsByDate.get(key) ?? [], hasLesson = dayLessons.length > 0, isComplete = hasLesson && dayLessons.every((lesson) => lesson.completed); return <button type="button" key={index} disabled={!day} onClick={() => day && setSelectedDate(key)} className={`calendar-day ${hasLesson ? 'has-lesson' : ''} ${isComplete ? 'completed-day' : ''} ${key === todayDate ? 'current-day' : ''} ${key === selectedDate ? 'selected-day' : ''}`}>{day && <><b>{day}</b>{hasLesson && <i />}</>}</button> })}</div>
    </section>
    <div className="calendar-key"><span className="key-pending" /> Còn lịch <span className="key-done" /> Đã dạy xong <span className="key-today" /> Hôm nay</div>
    <section className="monthly-report" aria-labelledby="monthly-report-title">
      <div className="monthly-report-heading"><div><h2 id="monthly-report-title">Tổng hợp dạy tháng {month + 1}</h2><p>Mỗi bé được tính một lần cho mỗi ngày đã dạy.</p></div><button type="button" className="download-csv" disabled={!dataReady || !kids.length} onClick={downloadCsv}><DownloadSimple weight="bold" /> Tải CSV</button></div>
      {kids.length ? <div className="monthly-report-grid">{report.map((entry) => <MonthlyReportCard key={entry.child.id} entry={entry} />)}</div> : <p className="monthly-report-empty">Chưa có bé nào để tổng hợp. Thêm bé trong mục Các bé nhé.</p>}
    </section>
    {selectedDate && <CalendarDetails key={selectedDate} date={selectedDate} lessons={selectedLessons} kids={kids} dataReady={dataReady} onToggle={onToggle} onMarkDay={onMarkDay} onAddTaught={onAddTaught} onEdit={editFromCalendar} onClose={() => setSelectedDate(null)} />}
  </>
}

function MonthlyReportCard({ entry }: { entry: MonthlyTeachingRecord }) {
  return <article className="monthly-report-card"><div className={`avatar ${entry.child.avatarTone}`}><ChildAvatar child={entry.child} /></div><div><h3>{entry.child.name || 'Bé yêu'}</h3><b>{entry.totalDays} ngày đã dạy</b><p>{entry.dates.length ? entry.dates.map((date) => `${date.slice(8)}/${date.slice(5, 7)}`).join(', ') : 'Chưa có ngày dạy trong tháng'}</p></div></article>
}

function CalendarDetails({ date, lessons, kids, dataReady, onToggle, onMarkDay, onAddTaught, onEdit, onClose }: { date: string; lessons: DisplayLesson[]; kids: Child[]; dataReady: boolean; onToggle: (lesson: DisplayLesson) => void; onMarkDay: (date: string) => void; onAddTaught: (date: string, childId: string) => Promise<boolean>; onEdit: (lesson: DisplayLesson) => void; onClose: () => void }) {
  const [selectingChild, setSelectingChild] = useState(false)
  const [selectedChild, setSelectedChild] = useState(kids[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const label = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))
  const hasPending = lessons.some((lesson) => !lesson.completed)
  const saveTaughtDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const success = await onAddTaught(date, selectedChild)
    setSaving(false)
    if (success) { setSaved(true); setSelectingChild(false) }
    else setError('Không thể lưu ngày dạy. Vui lòng thử lại.')
  }

  return <div className="calendar-details-backdrop" role="presentation" onMouseDown={onClose}><section className="calendar-details" onMouseDown={(event) => event.stopPropagation()}><button className="close-calendar-details" aria-label="Đóng" onClick={onClose}><X /></button><div><h2>{label}</h2><p>{lessons.length ? `${lessons.length} buổi học` : 'Chưa có lịch dạy'}</p></div>
    {hasPending && <button className="mark-day-btn" disabled={!dataReady} onClick={() => onMarkDay(date)}><Check weight="bold" /> Đánh dấu tất cả đã dạy</button>}
    {!lessons.length && !selectingChild && !saved && <button className="mark-day-btn" disabled={!dataReady || !kids.length} onClick={() => { setSelectedChild(kids[0].id); setSelectingChild(true) }}><Check weight="bold" /> Đánh dấu đã dạy ngày này</button>}
    {!lessons.length && !kids.length && <p className="calendar-details-hint">Thêm bé trong mục Các bé trước khi ghi nhận ngày dạy.</p>}
    {!lessons.length && selectingChild && <form className="taught-day-form" onSubmit={saveTaughtDay}><label htmlFor="taught-child">Đã dạy bé nào?</label><select id="taught-child" value={selectedChild} onChange={(event) => setSelectedChild(event.target.value)} required>{kids.map((child) => <option key={child.id} value={child.id}>{child.name || 'Bé yêu'}</option>)}</select>{error && <p className="form-error">{error}</p>}<button className="mark-day-btn" disabled={saving || !dataReady} type="submit"><Check weight="bold" /> {saving ? 'Đang lưu…' : 'Lưu ngày đã dạy'}</button></form>}
    {saved && !lessons.length && <p className="calendar-details-hint">Đã lưu ngày dạy. Đang cập nhật lịch…</p>}
    {lessons.map((lesson) => { const child = kids.find((kid) => kid.id === lesson.child_id); return <article className="calendar-lesson" key={lesson.id}><div className={`avatar ${child?.avatarTone ?? 'pink'}`}><ChildAvatar child={child} /></div><div className="calendar-lesson-info"><b>{child?.name || 'Chưa gắn bé'}</b><p><Clock weight="bold" /> {lesson.virtual ? 'Lịch hằng ngày' : lesson.starts_at || 'Chưa đặt giờ'}{lesson.duration ? ` · ${lesson.duration} phút` : ''}</p></div><button className="edit-lesson calendar-edit-lesson" aria-label={`Chỉnh sửa buổi dạy ${child?.name || 'chưa gắn bé'}`} disabled={!dataReady} onClick={() => onEdit(lesson)}><PencilSimple weight="bold" /></button><button className={lesson.completed ? 'done-btn muted' : 'done-btn'} disabled={!dataReady} onClick={() => onToggle(lesson)}><Check weight="bold" /> {lesson.completed ? 'Đã dạy' : 'Đánh dấu đã dạy'}</button></article> })}
  </section></div>
}

function ChildrenView({ kids, lessons, weekDateSet, onDelete, onEdit }: { kids: Child[]; lessons: Lesson[]; weekDateSet: Set<string>; onDelete: (id: string) => void; onEdit: (child: Child) => void }) {
  return <><Header icon={<Baby weight="duotone" />} title="Các bé của cô My" subtitle={`${kids.length} bạn nhỏ đáng yêu`} /><div className="kids-grid">{kids.map((kid) => { const weeklyCount = lessons.filter((lesson) => lesson.child_id === kid.id && weekDateSet.has(lesson.lesson_date) && lesson.completed).length; return <article className="kid-card" key={kid.id}><div className="kid-actions"><button className="edit-child" aria-label={`Chỉnh sửa ${kid.name || 'bé'}`} onClick={() => onEdit(kid)}><PencilSimple weight="bold" /></button><button className="delete-child" aria-label={`Xoá ${kid.name || 'bé'}`} onClick={() => onDelete(kid.id)}><Trash weight="bold" /></button></div><div className={`avatar big ${kid.avatarTone}`}><ChildAvatar child={kid} /></div><h2>{kid.name || 'Bé yêu'}</h2><p>{kid.subject || 'Chưa có môn học'} · Lịch hằng ngày</p><hr /><div><b>Tuần này</b><span className="week-pill">{weeklyCount} buổi <Check weight="bold" /></span></div></article> })}</div>{!kids.length && <div className="empty-state">Chưa có bé nào. Nhấn nút + để thêm bé đầu tiên.</div>}<div className="cheer-banner"><Heart weight="fill" /> <b>Dạy vui nha cô giáo</b> <Flower weight="fill" /></div></>
}

function SummaryView({ lessons, kids, currentDate, weekDates, streak }: { lessons: Lesson[]; kids: Child[]; currentDate: string; weekDates: string[]; streak: number }) {
  const currentMonthLessons = expandDailyLessons(kids, lessons, datesInMonth(currentDate.slice(0, 7))), complete = currentMonthLessons.filter((lesson) => lesson.completed).length
  const chart = weekDates.map((date) => lessons.filter((lesson) => lesson.lesson_date === date && lesson.completed).length)
  const chartMax = Math.max(1, ...chart), monthlyPct = currentMonthLessons.length ? Math.round((complete / currentMonthLessons.length) * 100) : 0
  return <><Header icon={<Star weight="fill" />} title="Tổng kết nhỏ xinh" subtitle="Tổng hợp từ dữ liệu buổi dạy của bạn" /><div className="summary-stats"><StatCard color="lilac" icon={<Sparkle weight="fill" />} label="Buổi đã dạy tháng này" value={`${complete} buổi`} /><StatCard color="mint" icon={<FlowerTulip weight="fill" />} label="Chuỗi chăm chỉ" value={`${streak} ngày`} /><StatCard color="rose" icon={<Heart weight="fill" />} label="Buổi đã lên lịch" value={`${currentMonthLessons.length} buổi`} /></div><section className="chart-card"><h2>Nhịp dạy trong tuần</h2><div className="chart">{chart.map((count, index) => <div key={weekLabels[index]}><i className={weekDates[index] === currentDate ? 'highlight' : ''} style={{ height: count ? `${Math.max(12, Math.round((count / chartMax) * 100))}%` : '0%' }} /><span>{weekLabels[index]}</span></div>)}</div></section><div className="great-banner"><Trophy weight="fill" /><b>{monthlyPct === 100 && currentMonthLessons.length ? 'Xuất sắc luôn!' : 'Cố lên nhé!'} <Sparkle weight="fill" /></b><p>Tháng này mình đã hoàn thành {monthlyPct}% số buổi đã lên lịch.</p></div></>
}

function AddLessonModal({ lesson, initialChildId, initialDate, kids, onClose, onSave }: { lesson?: Lesson; initialChildId?: string; initialDate: string; kids: Child[]; onClose: () => void; onSave: (form: LessonInput) => Promise<boolean> }) {
  const [child, setChild] = useState(lesson?.child_id ?? initialChildId ?? kids[0]?.id ?? ''), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); const saved = await onSave({ child_id: child, lesson_date: String(form.get('date')), starts_at: String(form.get('time')), duration: Number(form.get('duration')), content: String(form.get('content')) }); setSaving(false); if (saved) onClose(); else setError('Không thể lưu lịch. Kiểm tra kết nối Firebase rồi thử lại.') }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="lesson-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close-modal" aria-label="Đóng" onClick={onClose}><X /></button><h2>{lesson ? 'Chỉnh sửa buổi dạy' : 'Thêm buổi dạy'} <span><FlowerTulip weight="fill" /></span></h2><label>Tên bé<select value={child} onChange={(event) => setChild(event.target.value)}><option value="">Không chọn bé</option>{kids.map((kid) => <option value={kid.id} key={kid.id}>{kid.name || 'Bé yêu'}</option>)}</select></label><div className="form-two"><label>Ngày học<input name="date" type="date" defaultValue={lesson?.lesson_date ?? initialDate} /></label><label>Giờ học<input name="time" type="time" defaultValue={lesson?.starts_at} /></label></div><label>Số phút dạy<input name="duration" type="number" min="0" step="1" defaultValue={lesson?.duration || ''} placeholder="Ví dụ: 50" /></label><label>Nội dung<input name="content" defaultValue={lesson?.content} placeholder="Ví dụ: Kể chuyện sáng tạo" /></label>{error && <p className="form-error">{error}</p>}<button className="save-btn" disabled={saving} type="submit"><CalendarPlus weight="bold" /> {saving ? 'Đang lưu…' : lesson ? 'Lưu thay đổi' : 'Lưu lịch học'}</button></form></div>
}

function AddChildModal({ child, onClose, onSave }: { child?: Child; onClose: () => void; onSave: (form: ChildInput) => Promise<boolean> }) {
  const [avatar, setAvatar] = useState(child?.avatar ?? 'flower'), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const options = [{ value: 'flower', tone: 'pink' as const, Icon: Flower }, { value: 'bear', tone: 'peach' as const, Icon: Baby }, { value: 'tulip', tone: 'lilac' as const, Icon: FlowerTulip }, { value: 'star', tone: 'pink' as const, Icon: Star }]
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget), selected = options.find((item) => item.value === avatar) ?? options[0]; setSaving(true); const saved = await onSave({ name: String(form.get('name')), subject: String(form.get('subject')), avatar, avatarTone: selected.tone }); setSaving(false); if (saved) onClose(); else setError('Không thể thêm bé. Kiểm tra kết nối Firebase rồi thử lại.') }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="lesson-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close-modal" aria-label="Đóng" onClick={onClose}><X /></button><h2>{child ? 'Chỉnh sửa bé' : 'Thêm bé mới'} <span><Baby weight="duotone" /></span></h2><label>Tên bé<input name="name" defaultValue={child?.name} placeholder="Ví dụ: Bé Mây" /></label><label>Môn học / nội dung chính<input name="subject" defaultValue={child?.subject} placeholder="Ví dụ: Kể chuyện" /></label><label>Chọn biểu tượng<div className="avatar-options">{options.map(({ value, Icon }) => <button type="button" className={avatar === value ? 'selected' : ''} key={value} onClick={() => setAvatar(value)}><Icon weight={avatar === value ? 'fill' : 'regular'} /></button>)}</div></label>{error && <p className="form-error">{error}</p>}<button className="save-btn" disabled={saving} type="submit"><Plus weight="bold" /> {saving ? 'Đang lưu…' : child ? 'Lưu thay đổi' : 'Thêm bé'}</button></form></div>
}

function getCurrentStreak(lessons: Lesson[], currentDate: string) {
  const completedDates = new Set(lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.lesson_date)), cursor = new Date(`${currentDate}T12:00:00`)
  if (!completedDates.has(formatDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (completedDates.has(formatDateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

export default App
