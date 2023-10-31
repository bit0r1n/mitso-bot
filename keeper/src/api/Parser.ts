import { courseToRaw, facultyToRaw, formToRaw, parseDayOfWeek, parseLessonTime, parseLessonType } from './helpers'
import { Course, Day, Faculty, Form, Group, SelectOption } from './interfaces'
import { join } from 'path'

export interface ParserApiOptions {
  url?: string
}

interface LessonResponse {
  date: string
  name: string
  teachers: string[]
  time: string
  type: string
  classrooms: string[]
}

interface DayResponse {
  date: string
  display_date: string
  day_of_week: string
  lessons: LessonResponse[]
}

interface GroupFilterOptions {
  id?: string
  display?: string
  course?: Course
  form?: Form
  faculty?: Faculty
}

export class Parser {
  private url: string
  constructor(options?: ParserApiOptions) {
    this.url = options?.url || 'http://parser:3000'
  }

  async getGroups(filter?: GroupFilterOptions): Promise<Group[]> {
    const url = new URL(join(this.url, 'groups'))
    
    if (filter) {
      for (const filterKey in filter) {
        const key = filterKey as keyof GroupFilterOptions
        let filterValue: string

        switch (key) {
          case 'course':
            filterValue = courseToRaw(filter[key]!)
            break
          case 'form':
            filterValue = formToRaw(filter[key]!)
            break
          case 'faculty':
            filterValue = facultyToRaw(filter[key]!)
            break
          default:
            filterValue = filter[key]!
        }
        
        url.searchParams.append(filterKey, filterValue)
      }
    }

    const req = await fetch(url)
    return (await req.json()).result
  }

  async getGroup(id: string, filter?: GroupFilterOptions): Promise<Group> {
    const url = new URL(join(this.url, 'groups', encodeURIComponent(id)))

    if (filter) {
      for (const filterKey in filter) {
        const key = filterKey as keyof GroupFilterOptions
        let filterValue: string

        switch (key) {
          case 'course':
            filterValue = courseToRaw(filter[key]!)
            break
          case 'form':
            filterValue = formToRaw(filter[key]!)
            break
          case 'faculty':
            filterValue = facultyToRaw(filter[key]!)
            break
          default:
            filterValue = filter[key]!
        }
        
        url.searchParams.append(filterKey, filterValue)
      }
    }

    const req = await fetch(url)
    const res = await req.json()

    if (res.result) {
      return res.result
    } else {
      throw new Error(res.error)
    }
  }

  async getGroupWeeks(id: string, groupFilter?: GroupFilterOptions): Promise<SelectOption[]> {
    const url = new URL(join(this.url, 'groups', encodeURIComponent(id), 'weeks'))

    if (groupFilter) {
      for (const filterKey in groupFilter) {
        const key = filterKey as keyof GroupFilterOptions
        let filterValue: string

        switch (key) {
          case 'course':
            filterValue = courseToRaw(groupFilter[key]!)
            break
          case 'form':
            filterValue = formToRaw(groupFilter[key]!)
            break
          case 'faculty':
            filterValue = facultyToRaw(groupFilter[key]!)
            break
          default:
            filterValue = groupFilter[key]!
        }
        
        url.searchParams.append(filterKey, filterValue)
      }
    }

    const req = await fetch(url)
    const res = await req.json()

    if (res.result) {
      return res.result
    } else {
      throw new Error(res.error)
    }
  }

  async getGroupSchedule(id: string, week: number, groupFilter?: GroupFilterOptions): Promise<Day[]> {
    const url = new URL(join(this.url, 'groups', encodeURIComponent(id), 'weeks', week.toString()))

    if (groupFilter) {
      for (const filterKey in groupFilter) {
        const key = filterKey as keyof GroupFilterOptions
        let filterValue: string

        switch (key) {
          case 'course':
            filterValue = courseToRaw(groupFilter[key]!)
            break
          case 'form':
            filterValue = formToRaw(groupFilter[key]!)
            break
          case 'faculty':
            filterValue = facultyToRaw(groupFilter[key]!)
            break
          default:
            filterValue = groupFilter[key]!
        }
        
        url.searchParams.append(filterKey, filterValue)
      }
    }

    const req = await fetch(url)
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