import { parseDayOfWeek, parseLessonTime, parseLessonType } from './helpers';
import { Day, Group, SelectOption } from './interfaces'
import { join } from 'path'

export interface ParserApiOptions {
  url?: string;
}

interface LessonResponse {
  date: string;
  name: string;
  teachers: string[];
  time: string;
  type: string;
  classrooms: string[];
}

interface DayResponse {
  date: string;
  display_date: string;
  day_of_week: string;
  lessons: LessonResponse[];
}

export class Parser {
  private url: string;
  constructor(options?: ParserApiOptions) {
    this.url = options?.url || `http://parser:3000`
  }

  async getGroups(): Promise<Group[]> {
    const req = await fetch(join(this.url, 'groups'))
    return (await req.json()).result
  }

  async getGroup(id: string): Promise<Group> {
    const req = await fetch(join(this.url, 'groups', encodeURIComponent(id)))
    const res = await req.json()

    if (res.result) {
      return res.result
    } else {
      throw new Error(res.error)
    }
  }

  async getGroupWeeks(id: string): Promise<SelectOption[]> {
    const req = await fetch(join(this.url, 'groups', encodeURIComponent(id), 'weeks'))
    const res = await req.json()

    if (res.result) {
      return res.result
    } else {
      throw new Error(res.error)
    }
  }

  async getGroupSchedule(id: string, week: number): Promise<Day[]> {
    const req = await fetch(join(this.url, 'groups', encodeURIComponent(id), 'weeks', week.toString()))
    const res = await req.json()

    if (res.result) {
      return (res.result as DayResponse[])
        .map(day => ({
          ...day,
          date: new Date(day.date),
          day_of_week: parseDayOfWeek(day.day_of_week),
          lessons: day.lessons.map(lesson => ({
            ...lesson,
            date: new Date(lesson.date),
            type: parseLessonType(lesson.type),
            time: parseLessonTime(lesson.time)
          }))
        }) as Day)
    } else {
      throw new Error(res.error)
    }
  }
}