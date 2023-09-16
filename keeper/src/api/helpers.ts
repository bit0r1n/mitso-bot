import { DayOfWeek, Lesson, LessonTime, LessonType } from "./interfaces"
import { Lesson as LessonScheme } from '../schemas/Lesson'

export function parseLessonType(raw: string): LessonType {
  switch (raw) {
    case 'Лекция':
      return LessonType.Lecture
    case 'Практика':
      return LessonType.Practice
    case 'Лабораторная':
      return LessonType.Laboratory
    case 'Зачет':
      return LessonType.CreditCourse
    case 'Консультация':
      return LessonType.Consultation
    case 'Экзамен':
      return LessonType.Exam
    case 'Курсовая':
      return LessonType.CourseProject
    default:
      throw new Error('Unknown lesson type: ' + raw)
  }
}

export function parseLessonTime(raw: string): LessonTime {
  switch (raw) {
    case '08:00 - 9:20':
      return LessonTime.First
    case '09:35 - 10:55':
      return LessonTime.Second
    case '11:05 - 12:25':
      return LessonTime.Third
    case '13:00 - 14:20':
      return LessonTime.Fourth
    case '14:35 - 15:55':
      return LessonTime.Fifth
    case '16:25 - 17:45':
      return LessonTime.Sixth
    case '17:55 - 19:15':
      return LessonTime.Seventh
    case '19.25 - 20.45':
    case '19:25 - 20:45':
      return LessonTime.Eighth
    default:
      throw new Error('Unknown lesson time: ' + raw)
  }
}

export function parseDayOfWeek(raw: string): DayOfWeek {
  switch (raw) {
    case 'Понедельник':
      return DayOfWeek.Monday
    case 'Вторник':
      return DayOfWeek.Tuesday
    case 'Среда':
      return DayOfWeek.Wednesday
    case 'Четверг':
      return DayOfWeek.Thursday
    case 'Пятница':
      return DayOfWeek.Friday
    case 'Суббота':
      return DayOfWeek.Saturday
    case 'Воскресенье':
      return DayOfWeek.Sunday
    default:
      throw new Error('Unknown day of week: ' + raw)
  }
}

export const lessonToScheme = (lesson: Lesson, group: string): LessonScheme => ({
  type: lesson.type,
  date: lesson.date,
  name: lesson.name,
  time: lesson.time,
  teachers: lesson.teachers,
  classrooms: lesson.classrooms,
  group
})