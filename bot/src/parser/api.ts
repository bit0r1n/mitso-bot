import { BaseApi } from '../utils'
import { courseToIdMap, facultyToIdMap, formToIdMap } from './helpers'
import { GetGroupsOptions, Group, RawGroup } from './interfaces'

export class Parser extends BaseApi {
  constructor(url: string) {
    super(url)
  }

  async getGroups(options?: GetGroupsOptions): Promise<Group[]> {
    const query = new URLSearchParams()
    if (options?.id) query.set('id', options.id)
    if (options?.display) query.set('display', options.display)
    if (options?.course) {
      (Array.isArray(options.course) ? options.course : [ options.course ])
        .forEach(course => query.append('course', courseToIdMap[course]))
    }
    if (options?.form) {
      (Array.isArray(options.form) ? options.form : [ options.form ])
        .forEach(form => query.append('form', formToIdMap[form]))
    }
    if (options?.faculty) {
      (Array.isArray(options.faculty) ? options.faculty : [ options.faculty ])
        .forEach(faculty => query.append('faculty', facultyToIdMap[faculty]))
    }

    return (await this.request<RawGroup[]>('groups', query))
  }

  async getGroup(id: string): Promise<Group> {
    return (await this.request<RawGroup>(`groups/${id}`))
  }
}