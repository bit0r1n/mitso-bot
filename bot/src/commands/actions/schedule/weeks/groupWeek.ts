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
import { Group, Parser } from '../../../../parser'
import { getWeekStart, Keeper, lessonsToMessage, weekToHuman } from '../../../../keeper'
import { UserState } from '../../../../schemas/User'

export const groupWeekHandler = new Composer<SuperDuperUpgradedContext>()

const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

groupWeekHandler.action(/group_week*/, async (ctx) => {
  const [ , ...args ] = callbackIdParse(ctx.match.input)
  const [ groupId, weekStartRaw ] = args

  if (!groupId) {
    ctx.user.state = UserState.AskingWeekGroup
    await ctx.user.save()

    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)

    await ctx.reply('🤨', {
      reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
    })

    await ctx.editMessageText('🥕 Напиши номер группы для поиска расписания')
  } else if (!weekStartRaw) {
    let group: Group
    try {
      group = await parser.getGroup(groupId)
    } catch (e) {
      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
      return await ctx.editMessageText(
        (e as Error).message === 'Group not found'
          ? '😭 Группа не найдена'
          : '📸 Произошла какая-то ошибка'
      )
    }

    const weekStartDate = new Date()
    weekStartDate.setTime(weekStartDate.getTime() + (3 * 60 ** 2 * 1e3))

    const weekStart = getWeekStart(weekStartDate)

    const weeks = await keeper.getWeeks({
      group: groupId
    })

    const actualWeeks = weeks.filter(w => w.getTime() >= weekStart.getTime())

    if (!weeks.length) {
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
      return await ctx.reply(`🫠 Чувачки из ${group.display} на кайфах`)
    }

    const buttons = batchButtons(
      actualWeeks.sort((a, b) => a.getTime() - b.getTime()).map((week) =>
        Markup.button.callback(
          weekToHuman(week),
          callbackIdBuild('group_week', [ groupId, dateToCallback(week) ])
        )
      ),
      3,
      weeks.length !== actualWeeks.length
        ? [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild(
          'week', [ 'archive', WeeksArchiveType.Group, groupId ])) ] ]
        : []
    )

    await ctx.editMessageText('🛗 Выбери неделю')
    await ctx.editMessageReplyMarkup(buttons.reply_markup)
  } else {
    let group: Group
    try {
      group = await parser.getGroup(groupId)
    } catch (e) {
      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
      return await ctx.editMessageText(
        (e as Error).message === 'Group not found'
          ? '😭 Группа не найдена'
          : '📸 Произошла какая-то ошибка'
      )
    }

    const weekStart = new Date(weekStartRaw)
    const weekEnd = new Date(weekStartRaw)
    weekEnd.setTime(weekStart.getTime() + (7 * 24 * 60 ** 2 * 1e3))

    const lessons = await keeper.getLessons({
      group: groupId,
      from: weekStart,
      before: weekEnd
    })

    if (!lessons.length) {
      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)
      return await ctx.editMessageText(`🥥 Расписания на неделю для ${group.display} нету`)

    }

    await ctx.answerCbQuery()

    const currentDate = new Date()
    currentDate.setTime(currentDate.getTime() + (3 * 60 ** 2 * 1e3))
    const diff = weekStart.getTime() - currentDate.getTime()
    const weekDiff = Math.ceil(diff / (7 * 24 * 60 ** 2 * 1e3))

    const target = weekDiff === 0 ? 'текущую неделю' : `${weekDiff + 1} неделю`

    const messagesContent = lessonsToMessage(lessons)

    for (let i = 0; i < messagesContent.length; i++) {
      let content = i === 0
        ? `Расписание на ${target} для ${group.display}\n`
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