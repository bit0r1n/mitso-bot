export enum Form {
  FullTime,
  PartTime,
  PartTimeReduced
}

export enum Faculty {
  Magistracy,
  Economical,
  Legal
}

export enum Course {
  First,
  Second,
  Third,
  Fourth,
  Fifth
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

export enum DayOfWeek {
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday,
  Sunday
}

export interface Group {
  id: string
  display: string
  course: Course
  form: Form
  faculty: Faculty
  course_human: string
  form_human: string
  faculty_human: string
}

export interface SelectOption {
  id: string
  display: string
}

export interface Lesson {
  date: Date
  name: string
  teachers: string[]
  classrooms: string[]
  type: LessonType
  time: LessonTime
}

export interface Day {
  date: Date
  display_date: string
  lessons: Lesson[]
}