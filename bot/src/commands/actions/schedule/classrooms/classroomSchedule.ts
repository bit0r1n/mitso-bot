import { Composer, Markup } from 'telegraf'
import {
  callbackIdBuild,
  ClassroomScheduleType,
  getDayBounds,
  IDayBounds,
  inlineKeyboards,
  SuperDuperUpgradedContext
} from '../../../../utils'
import { Classroom, ClassroomLocation, classroomLocationToHuman, Keeper, Lesson, LessonTime, lessonTimeToHuman } from '../../../../keeper'

export const classroomScheduleHandler = new Composer<SuperDuperUpgradedContext>()

const keeper = new Keeper(process.env.KEEPER_URL!)

export enum ClassroomLocationSearch {
  InBuilding,
  OldBuilding,
  NewBuilding,
  Dormitory,
  Everywhere
}

const classroomLocationCarousel = [
  ClassroomLocationSearch.InBuilding,
  ClassroomLocationSearch.OldBuilding,
  ClassroomLocationSearch.NewBuilding,
  ClassroomLocationSearch.Dormitory,
  ClassroomLocationSearch.Everywhere
]

const lessonTimeCarousel = [
  LessonTime.First,
  LessonTime.Second,
  LessonTime.Third,
  LessonTime.Fourth,
  LessonTime.Fifth,
  LessonTime.Sixth,
  LessonTime.Seventh,
  LessonTime.Eighth
]

const searchLocationToKeeper = (location: ClassroomLocationSearch): ClassroomLocation[] => {
  switch (location) {
    case ClassroomLocationSearch.InBuilding:
      return [ ClassroomLocation.NewBuilding, ClassroomLocation.OldBuilding ]
    case ClassroomLocationSearch.OldBuilding:
      return [ ClassroomLocation.OldBuilding ]
    case ClassroomLocationSearch.NewBuilding:
      return [ ClassroomLocation.NewBuilding ]
    case ClassroomLocationSearch.Dormitory:
      return [ ClassroomLocation.Dormitory ]
    case ClassroomLocationSearch.Everywhere:
      return [ ClassroomLocation.NewBuilding, ClassroomLocation.OldBuilding, ClassroomLocation.NewBuilding ]
  }
}

const classroomLocationToString = (location: ClassroomLocationSearch) => {
  switch (location) {
    case ClassroomLocationSearch.InBuilding:
      return 'В университете'
    case ClassroomLocationSearch.OldBuilding:
      return 'Старый корпус'
    case ClassroomLocationSearch.NewBuilding:
      return 'Новый корпус'
    case ClassroomLocationSearch.Dormitory:
      return 'Общежитие'
    case ClassroomLocationSearch.Everywhere:
      return 'Везде'
  }
}

function normalizeClassroomName(name: string): string {
  if ([ '(чжф)', 'БАЗ' ].some(e => e.includes(name))) return name

  const match = name.match(/^\d+/)
  return match ? match[0] : name
}

function filterUnusedClassrooms(classrooms: Classroom[], lessons: Lesson[]): Classroom[] {
  const usedClassrooms = new Set(lessons.flatMap(lesson => lesson.classrooms.map(normalizeClassroomName)))
  const uniqueClassrooms = [
    ...new Map(classrooms.map(c => [ normalizeClassroomName(c.name), c ])).values()
  ]

  return uniqueClassrooms.filter(classroom => !usedClassrooms.has(normalizeClassroomName(classroom.name)))
}

function setRange(bounds: IDayBounds, range: string): IDayBounds {
  const match = range.match(/^(\d{2}):(\d{2}) - (\d{2}):(\d{2})$/)
  if (!match) {
    throw new Error('Invalid range')
  }

  const [ , startHour, startMinute, endHour, endMinute ] = match.map(Number)

  bounds.start.setHours(startHour - 3, startMinute, 0, 0)
  bounds.end.setHours(endHour - 3, endMinute, 0, 0)

  return bounds
}

function groupClassrooms(classrooms: Classroom[]): Record<ClassroomLocation, Classroom[]> {
  return classrooms.reduce((acc, classroom) => {
    if (!acc[classroom.location]) {
      acc[classroom.location] = []
    }

    acc[classroom.location].push(classroom)

    acc[classroom.location].sort((a, b) => a.floor - b.floor)

    return acc
  }, {} as Record<ClassroomLocation, Classroom[]>)
}

async function updateFreeSearchMessage(ctx: SuperDuperUpgradedContext) {
  if (!ctx.session?.classroomSearch) return

  const computerEmoji = ctx.session.classroomSearch.onlyComputer ? '✅' : '❌'

  await ctx.editMessageText('🥂 Выбери где и к скольки ты хочешь увидеть свободные на сегодня аудитории', {
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.callback('<',
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'type',
            'prev'
          ])
        ),
        Markup.button.callback(classroomLocationToString(classroomLocationCarousel[ctx.session?.classroomSearch.locationIndex]),
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'type',
            'current'
          ])
        ),
        Markup.button.callback('>',
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'type',
            'next'
          ])
        )
      ],
      [
        Markup.button.callback('◀️',
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'time',
            'prev'
          ])
        ),
        Markup.button.callback(lessonTimeToHuman(lessonTimeCarousel[ctx.session.classroomSearch.timeIndex]),
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'time',
            'current'
          ])
        ),
        Markup.button.callback('▶️',
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'time',
            'next'
          ])
        )
      ],
      [
        Markup.button.callback(computerEmoji + ' Компьютерная аудитория',
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'only_computer'
          ])
        )
      ],
      [
        Markup.button.callback('Искать',
          callbackIdBuild('classroom_schedule', [
            ClassroomScheduleType.Free,
            'confirm'
          ])
        )
      ]
    ]).reply_markup
  })
}

classroomScheduleHandler.action('classroom_schedule', async (ctx) => {
  ctx.session = { classroomSearch: { locationIndex: 0, timeIndex: 0, onlyComputer: false } }
  await ctx.editMessageText('🥏 Выбери что тебе нужно найти', {
    reply_markup: inlineKeyboards.classroomScheduleType.reply_markup
  })
})

classroomScheduleHandler.action(callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free ]), async (ctx) => {
  await updateFreeSearchMessage(ctx)
})

classroomScheduleHandler.action(
  [
    callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'type', 'next' ]),
    callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'type', 'prev' ]),
    callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'type', 'current' ])
  ], async (ctx) => {
    if (ctx.match.input.includes('current')) return
    if (!ctx.session?.classroomSearch) {
      return await ctx.editMessageText('🤥')
    }

    ctx.session.classroomSearch.locationIndex =
      (ctx.match.input.includes('next')
        ? (ctx.session.classroomSearch.locationIndex + 1)
        : (ctx.session.classroomSearch.locationIndex - 1 + classroomLocationCarousel.length))
      % classroomLocationCarousel.length

    await updateFreeSearchMessage(ctx)
  })

classroomScheduleHandler.action(
  [
    callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'time', 'next' ]),
    callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'time', 'prev' ]),
    callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'time', 'current' ])
  ], async (ctx) => {
    if (ctx.match.input.includes('current')) return
    if (!ctx.session?.classroomSearch) {
      return await ctx.editMessageText('🤥')
    }

    ctx.session.classroomSearch.timeIndex =
      (ctx.match.input.includes('next')
        ? (ctx.session.classroomSearch.timeIndex + 1)
        : (ctx.session.classroomSearch.timeIndex - 1 + lessonTimeCarousel.length))
      % lessonTimeCarousel.length

    await updateFreeSearchMessage(ctx)
  })

classroomScheduleHandler.action(callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'only_computer' ]), async (ctx) => {
  if (!ctx.session?.classroomSearch) {
    return await ctx.editMessageText('🤥')
  }

  ctx.session.classroomSearch.onlyComputer = !ctx.session.classroomSearch.onlyComputer

  await updateFreeSearchMessage(ctx)
})

classroomScheduleHandler.action(callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free, 'confirm' ]), async (ctx) => {
  if (!ctx.session?.classroomSearch) {
    return await ctx.editMessageText('🤥')
  }

  const { locationIndex, timeIndex, onlyComputer } = ctx.session.classroomSearch

  const locationSearch = searchLocationToKeeper(classroomLocationCarousel[locationIndex])
  const timeSearch = lessonTimeCarousel[timeIndex]
  const todayBounds = getDayBounds()
  setRange(todayBounds, lessonTimeToHuman(timeSearch))

  const classrooms = await keeper.getClassrooms({ location: locationSearch, is_computer: onlyComputer })
  const lessons = await keeper.getLessons({ from: todayBounds.start, before: todayBounds.end })

  const unused = filterUnusedClassrooms(classrooms, lessons)

  if (!unused.length) {
    return await ctx.editMessageText('🚗 Где все')
  }

  const groupedUnused = groupClassrooms(unused)
  let unusedInfo = ''

  for (const [ location, classrooms ] of Object.entries(groupedUnused)) {
    unusedInfo
      += '\t⛳ ' + classroomLocationToHuman(parseInt(location))
      + '\n'
      + '\t\t' + classrooms.map(c => c.name).join(', ')
      + '\n\n'
  }

  await ctx.editMessageText(`🪙 Свободные на сегодня (${lessonTimeToHuman(lessonTimeCarousel[timeIndex])}) аудитории:\n\n`
    + unusedInfo)
})