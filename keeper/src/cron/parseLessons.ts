import { Day, lessonToScheme, Parser } from '../api'
import { Lesson } from '../schemas/Lesson'
import { Teacher } from '../schemas/Teacher'
import { getWeekStart } from '../utils'
import { indexClassrooms } from './indexClassrooms'

export async function parseLessons() {
  const parser = new Parser()

  console.debug('Getting groups...')

  const groups = await parser.getGroups()

  console.debug('Got %d groups', groups.length)

  let groupIndex = 0

  const teacherSet = new Set<string>()

  for (const group of groups) {
    console.debug('Getting weeks for "%s" group [%d/%d]', group.id, ++groupIndex, groups.length)

    const weeks = await parser.getGroupWeeks(group.id, { faculty: group.faculty })

    console.log('Got weeks: [%s]', weeks.map(w => w.display).join(', '))

    if (weeks.length === 0) {
      console.log('No weeks found, skipping')
      continue
    }

    for (const week of weeks) {
      let schedule: Day[]

      try {
        schedule = await parser.getGroupSchedule(group.id, parseInt(week.id), { faculty: group.faculty })
      } catch {
        continue
      }

      if (!schedule.length) continue

      const weekStart = getWeekStart(schedule[0].lessons[0].date)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const lessons = schedule.map(day => day.lessons).flat(1)
      const lessonsDocuments = lessons.map(lesson => new Lesson(lessonToScheme(lesson, group.id)))

      for (const lesson of lessons) {
        if (lesson.teachers) lesson.teachers.forEach(teacher => teacherSet.add(teacher))
      }

      lessons.splice(0, lessons.length)

      await Lesson.deleteMany({
        group: group.id,
        date: {
          $gte: weekStart,
          $lt: weekEnd
        }
      })

      await Lesson.insertMany(lessonsDocuments)

      lessonsDocuments.splice(0, lessonsDocuments.length)
    }

    weeks.splice(0, weeks.length)

    await Bun.sleep(5000)
  }

  groups.splice(0, groups.length)

  const parsedTeachers = [ ...teacherSet ]
  const teachers = await Teacher.find()

  teacherSet.clear()

  const teachersToSave = parsedTeachers.filter(name => !teachers.find(t => t.name === name))

  if (teachersToSave.length) {
    console.debug('Saving %d teachers', teachersToSave.length)

    const teachersDocuments = teachersToSave.map(name => new Teacher({ name }))
    await Teacher.insertMany(teachersDocuments)
    teachersDocuments.splice(0, teachersDocuments.length)
  }

  parsedTeachers.splice(0, parsedTeachers.length)
  teachers.splice(0, teachers.length)
  teachersToSave.splice(0, teachersToSave.length)

  console.debug('Indexing classrooms...')
  await indexClassrooms()

  console.debug('Done')
}