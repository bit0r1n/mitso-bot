import { Composer, Markup } from 'telegraf'
import {
  batchButtons,
  callbackIdBuild,
  CallbackIdSplitter,
  dateToCallback,
  SuperDuperUpgradedContext,
  WeeksArchiveType
} from '../../../../utils'
import {
  getWeekStart,
  Keeper,
  LessonsSearchOptions,
  lessonsToMessage,
  SubjectResult,
  SubjectSearchOptions,
  WeeksSearchOptions,
  weekToHuman
} from '../../../../keeper'
import { UserRole } from '../../../../schemas/User'
import { InlineKeyboardButton } from 'telegraf/types'
import { Parser } from '../../../../parser'

export const subjectsScheduleHandler = new Composer<SuperDuperUpgradedContext>()

const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)
const subjectsPerPage = 5

async function getSubjectsPage(ctx: SuperDuperUpgradedContext, page: number) {
  const searchPayload: SubjectSearchOptions = {}
  const isStudent = ctx.user.role !== UserRole.Teacher

  if (isStudent && ctx.user.group) {
    searchPayload.group = ctx.user.group.id
  } else if (!isStudent && ctx.user.teacher_name) {
    searchPayload.teacher = ctx.user.teacher_name
  } else {
    await ctx.editMessageText('🎅 кто')
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
    return { pages: 0, pageSubjects: [] }
  }

  const subjects = await keeper.getSubjects(searchPayload)
  const pages = Math.ceil(subjects.length / subjectsPerPage)
  const pageSubjects = subjects.slice(page * subjectsPerPage, (page + 1) * subjectsPerPage)

  return { pages, pageSubjects }
}

function buildSubjectsInlineKeyboard(ctx: SuperDuperUpgradedContext, page: number, pages: number, subjects: SubjectResult[]) {
  const buttons: InlineKeyboardButton[][] = subjects.map((subject) => [
    Markup.button.callback(subject.name, callbackIdBuild('subject_schedule', [ 'select', subject.hash.toString() ]))
  ])

  const paginatorRow: InlineKeyboardButton[] = []

  if (page !== 0) {
    paginatorRow.push(Markup.button.callback('◀️', callbackIdBuild('subject_schedule', [ 'page', (page - 1).toString() ])))
  }

  if (page !== pages - 1) {
    paginatorRow.push(Markup.button.callback('▶️', callbackIdBuild('subject_schedule', [ 'page', (page + 1).toString() ])))
  }

  if (paginatorRow.length) {
    buttons.push(paginatorRow)
  }

  return Markup.inlineKeyboard(buttons)
}

subjectsScheduleHandler.action('subject_schedule', async (ctx) => {
  // будут искаться свои дисциплины, потому что мне в падлу поиск делать
  const payload: SubjectSearchOptions = {}
  const isStudent = ctx.user.role !== UserRole.Teacher

  if (isStudent && ctx.user.group) {
    payload.group = ctx.user.group.id
  } else if (!isStudent && ctx.user.teacher_name) {
    payload.teacher = ctx.user.teacher_name
  } else {
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
    return await ctx.editMessageText('🎅 кто')
  }

  const subjects = await keeper.getSubjects(payload)
  if (!subjects.length) {
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
    return await ctx.editMessageText('🏌️‍♂️ Дисциплин не нашлось, ты кто вообще')
  }

  const startPage = await getSubjectsPage(ctx, 0)
  if (!startPage.pages) return
  const buttons = buildSubjectsInlineKeyboard(ctx, 0, startPage.pages, startPage.pageSubjects)

  await ctx.editMessageText('📚 Выбери дисциплину', {
    reply_markup: buttons.reply_markup
  })
})

subjectsScheduleHandler.action(new RegExp([ '^subject_schedule', 'page', '\\d+$' ].join(CallbackIdSplitter)), async (ctx) => {
  const page = parseInt(ctx.match.input.split(CallbackIdSplitter).pop()!)
  const { pages, pageSubjects } = await getSubjectsPage(ctx, page)
  if (!pages) return
  const buttons = buildSubjectsInlineKeyboard(ctx, page, pages, pageSubjects)

  await ctx.editMessageReplyMarkup(buttons.reply_markup)
})

subjectsScheduleHandler.action(new RegExp([ '^subject_schedule', 'select', '-?\\d+$' ].join(CallbackIdSplitter)), async (ctx) => {
  const hash = parseInt(ctx.match.input.split(CallbackIdSplitter).pop()!)
  const payload: SubjectSearchOptions = {}
  const isStudent = ctx.user.role !== UserRole.Teacher

  if (isStudent && ctx.user.group) {
    payload.group = ctx.user.group.id
  } else if (!isStudent && ctx.user.teacher_name) {
    payload.teacher = ctx.user.teacher_name
  } else {
    return await ctx.editMessageText('🎅 кто')
  }

  const subjects = await keeper.getSubjects(payload)
  const subject = subjects.find((s) => s.hash === hash)

  if (!subject) {
    return await ctx.editMessageText('🏌️‍♂️ Дисциплины не нашлось, ты кто вообще')
  }

  const weeksPayload: WeeksSearchOptions = {
    subject: subject.name
  }
  if (payload.group) weeksPayload.group = payload.group
  if (payload.teacher) weeksPayload.teachers = payload.teacher

  const weeks = await keeper.getWeeks(weeksPayload)

  if (!weeks.length) {
    return await ctx.editMessageText('🤺 Недель не нашлось')
  }

  const weekStartDate = new Date()
  weekStartDate.setTime(weekStartDate.getTime() + (3 * 60 ** 2 * 1e3))

  const weekStart = getWeekStart(weekStartDate)

  const actualWeeks = weeks.filter(w => w.getTime() >= weekStart.getTime())

  const buttons = batchButtons(
    actualWeeks.sort((a, b) => a.getTime() - b.getTime()).map((week) =>
      Markup.button.callback(
        weekToHuman(week),
        callbackIdBuild('subject_schedule', [ 'week', hash.toString(), dateToCallback(week) ])
      )
    ),
    3,
    weeks.length !== actualWeeks.length
      ? [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild(
        'week', [ 'archive', WeeksArchiveType.Subject, hash.toString() ])) ] ]
      : []
  )

  await ctx.editMessageText('🛗 Выбери неделю')
  await ctx.editMessageReplyMarkup(buttons.reply_markup)
})

subjectsScheduleHandler.action(new RegExp([ '^subject_schedule', 'week', '-?\\d+', '.+$' ].join(CallbackIdSplitter)), async (ctx) => {
  const [ , , ...args ] = ctx.match.input.split(CallbackIdSplitter)
  const [ hash, weekStartRaw ] = args

  const weekStart = new Date(weekStartRaw)
  const weekEnd = new Date(weekStartRaw)
  weekEnd.setTime(weekStart.getTime() + (7 * 24 * 60 ** 2 * 1e3))

  const subjects = await keeper.getSubjects()
  const subject = subjects.find((s) => s.hash === parseInt(hash))
  if (!subject) {
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
    return await ctx.editMessageText('🏌️‍♂️ Дисциплины не нашлось, ты кто вообще')
  }

  const lessonsPayload: LessonsSearchOptions = {
    subject: subject!.name,
    from: weekStart,
    before: weekEnd
  }
  const isStudent = ctx.user.role !== UserRole.Teacher
  let displayName = ''
  if (isStudent && ctx.user.group) {
    lessonsPayload.group = ctx.user.group.id
    displayName = ctx.user.group.display
  } else if (!isStudent && ctx.user.teacher_name) {
    lessonsPayload.teachers = ctx.user.teacher_name
    displayName = ctx.user.teacher_name
  }

  const lessons = await keeper.getLessons(lessonsPayload)

  if (!lessons.length) {
    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
    return await ctx.editMessageText(`🥥 Расписания дисциплины ${subject.name} на неделю для ${displayName} нету`)
  }

  const groups = ctx.user.role === UserRole.Teacher
    ? await parser.getGroups().catch(() => [])
    : undefined

  await ctx.answerCbQuery()

  const currentDate = new Date()
  currentDate.setTime(currentDate.getTime() + (3 * 60 ** 2 * 1e3))
  const diff = weekStart.getTime() - currentDate.getTime()
  const weekDiff = Math.ceil(diff / (7 * 24 * 60 ** 2 * 1e3))

  const target = weekDiff === 0 ? 'текущую неделю' : `${weekDiff + 1} неделю`

  const messagesContent = lessonsToMessage(lessons, groups)

  for (let i = 0; i < messagesContent.length; i++) {
    let content = i === 0
      ? `Расписание ${subject.name} на ${target} для ${displayName}\n`
      : ''

    content += messagesContent[i] + '\n\n'
      + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

    if (i === 0) {
      await ctx.editMessageText(content, { parse_mode: 'HTML', disable_web_page_preview: true })
    } else {
      await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
    }
  }
})