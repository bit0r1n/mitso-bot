import { Group } from '../parser/interfaces'
import { Lesson, LessonGroups, LessonTime, LessonType } from './interfaces'

// const plural = (n: number, plurals: string[]) => plurals[(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)]

// export const monthsPlurals: Record<number, string[]> = {
//   0: [ 'января', 'января', 'января' ],
//   1: [ 'февраля', 'февраля', 'февраля' ],
//   2: [ 'марта', 'марта', 'марта' ],
//   3: [ 'апреля', 'апреля', 'апреля' ],
//   4: [ 'мая', 'мая', 'мая' ],
//   5: [ 'июня', 'июня', 'июня' ],
//   6: [ 'июля', 'июля', 'июля' ],
//   7: [ 'августа', 'августа', 'августа' ],
//   8: [ 'сентября', 'сентября', 'сентября' ],
//   9: [ 'октября', 'октября', 'октября' ],
//   10: [ 'ноября', 'ноября', 'ноября' ],
//   11: [ 'декабря', 'декабря', 'декабря' ] 
// }

// export const daysOfWeek = [ 'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота' ]

export function getWeekStart(date: Date = new Date()) {
  const dayOfWeek = date.getDay()
  const weekStart = new Date(date)
  weekStart.setDate(weekStart.getDate() - dayOfWeek)
  weekStart.setUTCHours(0, 0, 0, 0)
  return weekStart
}

export const lessonTimeToHuman = (time: LessonTime): string => {
  switch (time) {
  case LessonTime.First:
    return '08:00 - 9:20'
  case LessonTime.Second:
    return '09:35 - 10:55'
  case LessonTime.Third:
    return '11:05 - 12:25'
  case LessonTime.Fourth:
    return '13:00 - 14:20'
  case LessonTime.Fifth:
    return '14:35 - 15:55'
  case LessonTime.Sixth:
    return '16:25 - 17:45'
  case LessonTime.Seventh:
    return '17:55 - 19:15'
  case LessonTime.Eighth:
    return '19:25 - 20:45'
  }
}

export const lessonTypeToHuman = (type: LessonType): string => {
  switch (type) {
  case LessonType.Lecture:
    return 'Лекция'
  case LessonType.Practice:
    return 'Практика'
  case LessonType.Laboratory:
    return 'Лабораторная'
  case LessonType.CreditCourse:
    return 'Зачет'
  case LessonType.Consultation:
    return 'Консультация'
  case LessonType.Exam:
    return 'Экзамен'
  case LessonType.CourseProject:
    return 'Курсовая'
  }
}

export const lessonToMessage = (lesson: Lesson | LessonGroups, groups?: Group[]): string => {
  const items: string[] = [ '🍤 ' + lessonTimeToHuman(lesson.time), lessonTypeToHuman(lesson.type) ]

  if ('groups' in lesson && groups) {
    if (lesson.groups.length) items.push(
      lesson.groups.map(group => groups.find(g => g.id === group)?.display ?? group
      ).join(', '))
  }
  if (lesson.classrooms.length) items.push(`Ауд. ${lesson.classrooms.join(', ')}`)
  items.push(lesson.name)
  if (lesson.teachers.length) items.push(lesson.teachers.join(', '))

  return items.join(' | ')
}

export const lessonsToMessage = (lessons: Lesson[], groups?: Group[]): string => {
  const daysLessons = lessons
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reduce((acc, lesson) => {
      const dayStart = lesson.date
      dayStart.setHours(0, 0, 0, 0)
      const dayString = dayStart.toUTCString()

      if (groups) {
        // @ts-ignore
        lesson.groups = [ lesson.group ]
        // @ts-ignore
        delete lesson.group
      }

      if (!acc[dayString]) acc[dayString] = [ lesson ]
      else {
        if (!groups) acc[dayString].push(lesson)
        else {
          const index = acc[dayString].findIndex(l =>
            l.name === lesson.name
              && l.time === lesson.time
                && l.teachers.every(t => lesson.teachers.includes(t))
          )

          // @ts-ignore
          if (index !== -1) acc[dayString][index].groups.push(...lesson.groups)
          else acc[dayString].push(lesson)
        }
      }

      return acc
    }, {} as Record<string, (Lesson | LessonGroups)[]>)

  const days = Object.entries(daysLessons).map(([ dayString, lessons ]) => {
    const day = new Date(dayString)
    // const lines = [ `🥀  ${day.getDate()} ${plural(day.getDate(), monthsPlurals[day.getMonth()])}, ${daysOfWeek[day.getDay()]}` ]
    const lines = [ `🥀 ${new Intl.DateTimeFormat('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' }).format(day)}` ]
    lessons.forEach(lesson => lines.push('  ' + lessonToMessage(lesson, groups)))

    return lines.join('\n')
  })

  return days.join('\n\n')
}

export const weekToHuman = (weekStart: Date, from = getWeekStart()): string => {
  const diff = weekStart.getTime() - from.getTime()
  const weekDiff = Math.ceil(diff / (7 * 24 * 60 ** 2 * 1e3))
  return weekDiff === 0 ? 'Текущая неделя' : `${weekDiff + 1} неделя`
}