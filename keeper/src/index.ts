import express from 'express'
import * as mongoose from 'mongoose'
import { GetWeeksOptions, Lesson, LessonFilterOptions } from './schemas/Lesson'
import { Parser } from './api/Parser'
import { Teacher } from './schemas/Teacher'
import { parseJob } from './cron/parseJob'

// //                        d   h&m      s->ms
// const parseJobCooldown = 24 * 60 ** 2 * 1e3

if (!process.env.MONGODB_URL) {
  throw new Error('MONGODB_URL is not set')
}

await mongoose.connect(process.env.MONGODB_URL)

const app = express()

app.get('/', (req, res) => {
  res.json({ result: 'OK' })
})

let parseJobRunning = false
// let parseJobWaitingStart: number | undefined

app.get('/parse_job', async (req, res) => {
  // const cooldown = parseJobWaitingStart
  //   ? ((parseJobWaitingStart + parseJobCooldown) - Date.now()) / 1e3
  //   : null
  // if (cooldown && cooldown > 0) {
  //   res
  //     .status(429)
  //     .header('Retry-After', cooldown.toString())
  //     .json({ error: 'Parse job have executed recently' })

  //   return
  // }

  if (parseJobRunning) {
    res.status(409).json({ error: 'Parse job is already running' })
    return
  }

  res.status(202).json({ result: 'Accepted' })

  parseJobRunning = true

  try {
    await parseJob()
  } finally {
    parseJobRunning = false
  }
})

app.get('/weeks', async (req, res) => {
  const group = req.query.group as string | undefined
  const teachers = req.query.teachers as string | string[] | undefined
  const from = req.query.from as string | undefined
  if (!(group || teachers?.length)) {
    res.status(400).json({ error: '"group" or "teachers" is required' })
    return
  }

  if (from && isNaN(new Date(from).valueOf())) {
    res.status(400).json({ error: '"from" is invalid' })
    return
  }

  if (group) {
    try {
      await new Parser().getGroup(group)
    } catch (e) {
      const error = e as Error
      if (error.message === 'Group not found') {
        res.status(404).json({ error: error.message })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
  }

  const filter: GetWeeksOptions = {}

  if (from) {
    filter.from = new Date(from)
  }

  if (group) {
    filter.group = group
  }

  if (teachers?.length) {
    filter.teachers = Array.isArray(teachers) ? teachers : [ teachers ]
  }

  const weeks = await Lesson.getWeeks(filter)

  res.json({ result: weeks })
})

app.get('/lessons', async (req, res) => {
  const group = req.query.group as string | undefined
  const from = req.query.from as string | undefined
  const before = req.query.before as string | undefined
  const teachers = req.query.teachers as string | string[] | undefined
  const classrooms = req.query.classrooms as string | string[] | undefined

  if (from && isNaN(new Date(from).valueOf())) {
    res.status(400).json({ error: '"from" is invalid' })
    return
  }

  if (before && isNaN(new Date(before).valueOf())) {
    res.status(400).json({ error: '"before" is invalid' })
    return
  }

  const filter: LessonFilterOptions = {}

  if (group) {
    try {
      await new Parser().getGroup(group)
    } catch (e) {
      const error = e as Error
      if (error.message === 'Group not found') {
        res.status(404).json({ error: error.message })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }

    filter.group = group
  }

  if (from) filter.from = new Date(from)
  if (before) filter.before = new Date(before)

  if (teachers) {
    filter.teachers = Array.isArray(teachers) ? teachers : [ teachers ]
  }

  if (classrooms) {
    filter.classrooms = Array.isArray(classrooms) ? classrooms : [ classrooms ]
  }

  const lessons = await Lesson.getLessons(filter)

  res.json({ result: lessons })
})

app.get('/teachers', async (req, res) => {
  const name = req.query.name as string | undefined

  const teachers = name
    ? await Teacher.find({ name: new RegExp(name, 'i') })
    : await Teacher.find()

  res.json({ result: teachers.map(t => t.name) })

})

app.listen(3000, () => {
  console.log('Server started on port 3000')
})