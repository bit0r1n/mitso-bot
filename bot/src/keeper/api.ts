import {
  Classroom,
  ClassroomSearchOptions,
  Lesson,
  LessonsSearchOptions,
  RawLesson,
  SubjectResult,
  SubjectSearchOptions,
  TeacherSearchOptions,
  WeeksSearchOptions
} from './interfaces'
import { BaseApi } from '../utils'

export class Keeper extends BaseApi {
  constructor(url: string) {
    super(url)
  }

  async getWeeks(options: WeeksSearchOptions): Promise<Date[]> {
    const query = new URLSearchParams()

    if (options?.group) {
      query.set('group', options.group)
    }

    if (options?.teachers) {
      (Array.isArray(options.teachers) ? options.teachers : [ options.teachers ])
        .forEach(teacher => query.append('teachers', teacher))
    }

    if (options?.subject) {
      query.set('subject', options.subject)
    }

    if (options?.from) {
      query.set('from', options.from.toISOString())
    }

    if (options?.before) {
      query.set('before', options.before.toISOString())
    }

    return (await this.request<string[]>('weeks', query))
      .map(date => new Date(date))
  }

  async getLessons(options?: LessonsSearchOptions): Promise<Lesson[]> {
    const query = new URLSearchParams()

    if (options?.group) {
      query.set('group', options.group)
    }

    if (options?.teachers) {
      (Array.isArray(options.teachers) ? options.teachers : [ options.teachers ])
        .forEach(teacher => query.append('teachers', teacher))
    }

    if (options?.subject) {
      query.set('subject', options.subject)
    }

    if (options?.from) {
      query.set('from', options.from.toISOString())
    }

    if (options?.before) {
      query.set('before', options.before.toISOString())
    }

    if (options?.classrooms) {
      (Array.isArray(options.classrooms) ? options.classrooms : [ options.classrooms ])
        .forEach(classroom => query.append('classrooms', classroom))
    }

    const rawLessons = await this.request<RawLesson[]>('lessons', query)
    return rawLessons.map((lesson: RawLesson) => ({
      date: new Date(lesson.date),
      name: lesson.name,
      type: lesson.type,
      time: lesson.time,
      teachers: lesson.teachers,
      classrooms: lesson.classrooms,
      group: lesson.group
    }))
  }

  async getTeachers(options?: TeacherSearchOptions): Promise<string[]> {
    const query = new URLSearchParams()

    if (options?.name) {
      query.set('name', options.name)
    }

    return await this.request<string[]>('teachers', query)
  }

  async getClassrooms(options?: ClassroomSearchOptions): Promise<Classroom[]> {
    const query = new URLSearchParams()

    if (options?.location !== undefined) {
      (Array.isArray(options.location) ? options.location : [ options.location ])
        .forEach(location => query.append('location', location.toString()))
    }

    if (options?.floor !== undefined) {
      (Array.isArray(options.floor) ? options.floor : [ options.floor ])
        .forEach(floor => query.append('floor', floor.toString()))
    }

    if (options?.is_computer !== undefined) {
      query.set('is_computer', options.is_computer.toString())
    }

    return await this.request<Classroom[]>('classrooms', query)
  }

  async getSubjects(options?: SubjectSearchOptions): Promise<SubjectResult[]> {
    const query = new URLSearchParams()

    if (options?.group) {
      query.set('group', options.group)
    }

    if (options?.teacher) {
      query.set('teacher', options.teacher)
    }

    return await this.request<SubjectResult[]>('subjects', query)
  }
}
