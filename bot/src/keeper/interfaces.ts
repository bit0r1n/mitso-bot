export interface WeeksSearchOptions {
  group?: string
  teachers?: string | string[]
  from?: Date
  before?: Date
}

export interface LessonsSearchOptions {
  group?: string
  from?: Date
  before?: Date
  teachers?: string | string[]
  classrooms?: string | string[]
}

export interface TeacherSearchOptions {
  name?: string
}

export interface RawLesson {
  date: string
  name: string
  type: number
  time: number
  teachers: string[]
  classrooms: string[]
  group: string
}

export enum LessonType {
  Lecture,
  Practice,
  Laboratory,
  CreditCourse,
  Consultation,
  Exam,
  CourseProject
}

export enum LessonTime {
  First,
  Second,
  Third,
  Fourth,
  Fifth,
  Sixth,
  Seventh,
  Eighth
}

export type Lesson = Omit<RawLesson, 'date'> & {
  date: Date
  type: LessonType
  time: LessonTime
}

export type LessonGroups = Omit<Lesson, 'group'> & {
  groups: string[]
}