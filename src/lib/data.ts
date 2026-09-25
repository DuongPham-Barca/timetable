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
