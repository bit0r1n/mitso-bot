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
    console.debug('Getting schedule for "%s" group [%d/%d]', group.id, ++groupIndex, groups.length)

    let schedule: Day[]

    try {
      schedule = await parser.getGroupSchedule(group.id, { faculty: group.faculty })
    } catch {
      continue
    }

    if (!schedule.length) continue

    const lessonsStart = getWeekStart(schedule[0].lessons[0].date)
    const lessonsEnd = getWeekStart(schedule.at(-1)!.lessons.at(-1)!.date)
    lessonsEnd.setDate(lessonsEnd.getDate() + 7)

    const lessons = schedule.map(day => day.lessons).flat(1)
    const lessonsDocuments = lessons.map(lesson => new Lesson(lessonToScheme(lesson, group.id)))

    for (const lesson of lessons) {
      if (lesson.teachers) lesson.teachers.forEach(teacher => teacherSet.add(teacher))
    }

    lessons.splice(0, lessons.length)

    await Lesson.deleteMany({
      group: group.id,
      date: {
        $gte: lessonsStart,
        $lt: lessonsEnd
      }
    })

    await Lesson.insertMany(lessonsDocuments)

    lessonsDocuments.splice(0, lessonsDocuments.length)

    await Bun.sleep(2500)
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