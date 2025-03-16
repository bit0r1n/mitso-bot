export interface WeeksSearchOptions {
  group?: string
  teachers?: string | string[]
  subject?: string
  from?: Date
  before?: Date
}

export interface LessonsSearchOptions {
  group?: string
  teachers?: string | string[]
  subject?: string
  from?: Date
  before?: Date
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

export enum ClassroomLocation {
  NewBuilding,
  OldBuilding,
  Dormitory
}

export interface Classroom {
  name: string
  location: ClassroomLocation
  floor: number
  is_computer: boolean
}

export interface ClassroomSearchOptions {
  location?: ClassroomLocation | ClassroomLocation[]
  floor?: number | number[]
  is_computer?: boolean
}

export interface SubjectSearchOptions {
  group?: string
  teacher?: string
}

export interface SubjectResult {
  name: string
  hash: number
}