import { WeeksSearchOptions, LessonsSearchOptions, Lesson, RawLesson, TeacherSearchOptions } from './interfaces'
import { BaseApi } from '../helpers/BaseApi'

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

    if (options.from) {
      query.set('from', options.from.toISOString())
    }

    return (await this.request<string[]>('weeks', query))
      .map(date => new Date(date))
  }

  async getLessons(options?: LessonsSearchOptions): Promise<Lesson[]> {
    const query = new URLSearchParams()

    if (options?.group) {
      query.set('group', options.group)
    }

    if (options?.from) {
      query.set('from', options.from.toISOString())
    }

    if (options?.before) {
      query.set('before', options.before.toISOString())
    }
  
    if (options?.teachers) {
      (Array.isArray(options.teachers) ? options.teachers : [ options.teachers ])
        .forEach(teacher => query.append('teachers', teacher))
    }

    if (options?.classrooms) {
      (Array.isArray(options.classrooms) ? options.classrooms : [ options.classrooms ])
        .forEach(classroom => query.append('classrooms', classroom))
    }

    return (await this.request<RawLesson[]>('lessons', query))
      .map((lesson: RawLesson) => ({
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
}
