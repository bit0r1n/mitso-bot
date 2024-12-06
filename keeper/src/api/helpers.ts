import { Course, DayOfWeek, Faculty, Form, Lesson, LessonTime, LessonType } from './interfaces'
import { ILesson } from '../schemas/Lesson'

export function parseForm(raw: string): Form {
  switch (raw) {
  case 'Dnevnaya':
    return Form.FullTime
  case 'Zaochnaya':
    return Form.PartTime
  case 'Zaochnaya sokrashhennaya':
    return Form.PartTimeReduced
  default:
    throw new Error('Unknown form: ' + raw)
  }
}

export function parseFaculty(raw: string): Faculty {
  switch (raw) {
  case 'Magistratura':
    return Faculty.Magistracy
  case 'E`konomicheskij':
    return Faculty.Economical
  case 'YUridicheskij':
    return Faculty.Legal
  default:
    throw new Error('Unknown faculty: ' + raw)
  }
}

export function parseCourse(raw: string): Course {
  switch (raw) {
  case '1 kurs':
    return Course.First
  case '2 kurs':
    return Course.Second
  case '3 kurs':
    return Course.Third
  case '4 kurs':
    return Course.Fourth
  case '5 kurs':
    return Course.Fifth
  default:
    throw new Error('Unknown course: ' + raw)
  }
}

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
  case '08:00 - 9:25':
    return LessonTime.First
  case '09:35 - 10:55':
  case '09:35 - 11:00':
    return LessonTime.Second
  case '11:05 - 12:25':
  case '11:10 - 12:35':
    return LessonTime.Third
  case '13:00 - 14:20':
  case '13:05 - 14:30':
    return LessonTime.Fourth
  case '14:35 - 15:55':
  case '14:40 - 16:05':
    return LessonTime.Fifth
  case '16:25 - 17:45':
  case '16:35 - 18:00':
    return LessonTime.Sixth
  case '17:55 - 19:15':
  case '18:10 - 19:35':
    return LessonTime.Seventh
  case '19.25 - 20.45':
  case '19:25 - 20:45':
  case '19:45 - 21:10':
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

export function formToRaw(form: Form): string {
  switch (form) {
  case Form.FullTime:
    return 'Dnevnaya'
  case Form.PartTime:
    return 'Zaochnaya'
  case Form.PartTimeReduced:
    return 'Zaochnaya sokrashhennaya'
  }
}

export function courseToRaw(course: Course): string {
  switch (course) {
  case Course.First:
    return '1 kurs'
  case Course.Second:
    return '2 kurs'
  case Course.Third:
    return '3 kurs'
  case Course.Fourth:
    return '4 kurs'
  case Course.Fifth:
    return '5 kurs'
  }
}

export function facultyToRaw(faculty: Faculty): string {
  switch (faculty) {
  case Faculty.Economical:
    return 'E`konomicheskij'
  case Faculty.Legal:
    return 'YUridicheskij'
  case Faculty.Magistracy:
    return 'Magistratura'
  }
}

export const lessonToScheme = (lesson: Lesson, group: string): ILesson => ({
  type: lesson.type,
  date: lesson.date,
  name: lesson.name,
  time: lesson.time,
  teachers: lesson.teachers,
  classrooms: lesson.classrooms,
  group
})