import { Composer, Markup } from 'telegraf'
import {
  batchButtons,
  callbackIdBuild,
  callbackIdParse,
  dateToCallback,
  replyKeyboards,
  SuperDuperUpgradedContext,
  WeeksArchiveType
} from '../../../../utils'
import { Parser } from '../../../../parser'
import { getWeekStart, Keeper, lessonsToMessage, weekToHuman } from '../../../../keeper'
import { UserState } from '../../../../schemas/User'

export const teacherWeekHandler = new Composer<SuperDuperUpgradedContext>()

const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

teacherWeekHandler.action(/teacher_week*/, async (ctx) => {
  const [ , ...args ] = callbackIdParse(ctx.match.input)
  const [ teacherName, weekStartRaw ] = args

  if (!teacherName) {
    ctx.user.state = UserState.AskingWeekTeacher
    await ctx.user.save()

    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)

    await ctx.reply('🤨', {
      reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
    })

    await ctx.editMessageText('🧄 Напиши инициалы преподавателя или его часть\n\nОбычно они в формате Фамилия И. О.')
  } else if (!weekStartRaw) {
    const weekStartDate = new Date()
    weekStartDate.setTime(weekStartDate.getTime() + (3 * 60 ** 2 * 1e3))

    const weekStart = getWeekStart(weekStartDate)

    const weeks = await keeper.getWeeks({
      // from: weekStart,
      teachers: teacherName
    })

    const actualWeeks = weeks.filter(w => w.getTime() >= weekStart.getTime())

    if (!weeks.length) {
      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
      return await ctx.reply('🧉 Кажется кто-то конкретно кайфует')
    }

    const buttons = batchButtons(
      actualWeeks.sort((a, b) => a.getTime() - b.getTime()).map((week) =>
        Markup.button.callback(
          weekToHuman(week),
          callbackIdBuild('teacher_week', [ teacherName, dateToCallback(week) ])
        )
      ),
      3,
      weeks.length !== actualWeeks.length
        ? [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild(
          'week', [ 'archive', WeeksArchiveType.Teacher, teacherName ])) ] ]
        : []
    )

    await ctx.editMessageText('🚸 Выбери неделю')
    await ctx.editMessageReplyMarkup(buttons.reply_markup)
  } else {
    const weekStart = new Date(weekStartRaw)
    const weekEnd = new Date(weekStartRaw)
    weekEnd.setTime(weekStart.getTime() + (7 * 24 * 60 ** 2 * 1e3))

    const lessons = await keeper.getLessons({
      teachers: [ teacherName ],
      from: weekStart,
      before: weekEnd
    })

    if (!lessons.length) {
      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
      return await ctx.editMessageText('🪤 Емае, неловко как-то вышло)') // неделя нашлась, но нет расписния. в принципе невозможно, но все же

    }

    await ctx.answerCbQuery()

    const groups = await parser.getGroups()

    const currentDate = new Date()
    currentDate.setTime(currentDate.getTime() + (3 * 60 ** 2 * 1e3))
    const diff = weekStart.getTime() - currentDate.getTime()
    const weekDiff = Math.ceil(diff / (7 * 24 * 60 ** 2 * 1e3))

    const target = weekDiff === 0 ? 'текущую неделю' : `${weekDiff + 1} неделю`

    const messagesContent = lessonsToMessage(lessons, groups)

    for (let i = 0; i < messagesContent.length; i++) {
      let content = i === 0
        ? `Расписание на ${target} у ${teacherName}\n`
        : ''

      content += messagesContent[i] + '\n\n'
        + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

      if (i === 0) {
        await ctx.editMessageText(content, { parse_mode: 'HTML', disable_web_page_preview: true })
      } else {
        await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
      }
    }
  }
})