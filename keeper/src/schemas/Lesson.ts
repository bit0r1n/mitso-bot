import * as mongoose from 'mongoose'
import { LessonTime, LessonType } from '../api/interfaces'

function getWeekStart(date: Date = new Date()) {
  const dayOfWeek = date.getDay()
  const weekStart = new Date(date)
  weekStart.setDate(weekStart.getDate() - dayOfWeek)
  weekStart.setUTCHours(0, 0, 0, 0)
  return weekStart
}

export interface LessonFilterOptions {
  group?: string;
  teachers?: string[];
  classrooms?: string[];
  from?: Date;
  before?: Date;
}

export interface ILesson {
  date: Date
  name: String
  type: LessonType
  time: LessonTime
  teachers?: string[]
  classrooms?: string[]
  group: string
}

interface LessonModel extends mongoose.Model<ILesson> {
  getWeeks(group: string, from?: Date): Promise<Date[]>
  getLessons(filter?: LessonFilterOptions): Promise<ILesson[]>
}

const lessonSchema = new mongoose.Schema<ILesson, LessonModel>({
  date: Date,
  name: String,
  type: Number,
  time: Number,
  teachers: [String],
  classrooms: [String],
  group: String,
}, {
  statics: {
    async getWeeks(group: string, from?: Date): Promise<Date[]> {
      const filterOptions: Record<string, any> = {
        group
      }

      if (from) {
        filterOptions['date'] = {
          $gte: getWeekStart(from)
        }
      }

      const lessons = await this.find(filterOptions)

      const startsOfWeeks = new Set<string>()
      for (const lesson of lessons) {
        startsOfWeeks.add(getWeekStart(lesson.date).toString())
      }

      return [...startsOfWeeks].map(date => new Date(date))
    },
    async getLessons(filter?: LessonFilterOptions) {
      const filterOptions: Record<string, any> = {}

      if (filter?.group) {
        filterOptions.group = filter.group
      }



      if (filter?.from) {
        filterOptions['date'] = {
          ...filterOptions['date'],
          $gte: filter.from
        }
      }

      if (filter?.before) {
        filterOptions['date'] = {
          ...filterOptions['date'],
          $lte: filter.before
        }
      }

      if (filter?.teachers) {
        filterOptions['teachers'] = {
          $all: filter.teachers.map(s => ({
            $elemMatch: {
              $regex: s,
              $options: 'i'
            }
          }))
        }
      }

      if (filter?.classrooms) {
        filterOptions['classrooms'] = {
          $all: filter.classrooms
        }
      }

      return await this.find(filterOptions)
    }
  }
})

export const Lesson = mongoose.model<ILesson, LessonModel>('Lesson', lessonSchema)