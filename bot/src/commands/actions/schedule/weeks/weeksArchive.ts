import {
  batchArray,
  batchButtons,
  callbackIdBuild,
  callbackIdParse,
  CallbackIdSplitter,
  dateToCallback,
  SuperDuperUpgradedContext,
  WeeksArchiveAction,
  WeeksArchiveType
} from '../../../../utils'
import { Composer, Markup } from 'telegraf'
import { getWeekStart, Keeper, LessonsSearchOptions, lessonsToMessage, WeeksSearchOptions, weekToHuman } from '../../../../keeper'
import { InlineKeyboardButton } from 'telegraf/types'
import { Parser } from '../../../../parser'
import { UserRole } from '../../../../schemas/User'

export const weeksArchiveHandler = new Composer<SuperDuperUpgradedContext>()

const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

weeksArchiveHandler.action(new RegExp([ '^week', 'archive', '*' ].join(CallbackIdSplitter)), async (ctx) => {
  const [ , ...args ] = callbackIdParse(ctx.match.input)
  const [ , entityType, entityId, week, action, pageString ] = args

  if (!week && !action) {
    const weeksPayload: WeeksSearchOptions = {
      before: getWeekStart()
    }

    switch (entityType) {
      case WeeksArchiveType.Group:
        weeksPayload.group = entityId
        break
      case WeeksArchiveType.Teacher:
        weeksPayload.teachers = entityId
        break
      case WeeksArchiveType.Subject: {
        const subject = (await keeper.getSubjects()).find(s => s.hash === parseInt(entityId))
        weeksPayload.subject = subject!.name

        const isStudent = ctx.user.role !== UserRole.Teacher
        if (isStudent && ctx.user.group) {
          weeksPayload.group = ctx.user.group.id
        } else if (!isStudent && ctx.user.teacher_name) {
          weeksPayload.teachers = ctx.user.teacher_name
        }
        break
      }
    }
    
    const weeks = await keeper.getWeeks(weeksPayload)

    const batchedWeeks = batchArray(
      weeks.sort((a, b) => b.getTime() - a.getTime()), 9)

    const extraRows: InlineKeyboardButton[][] = []

    if (batchedWeeks.length > 1) extraRows.push([
      Markup.button.callback('▶️',
        callbackIdBuild('week', [
          'archive', entityType,
          entityId, dateToCallback(batchedWeeks[1][0]), WeeksArchiveAction.ShowPage, '1' ]))
    ])

    const buttons = batchButtons(
      batchedWeeks[0].map((week) =>
        Markup.button.callback(
          weekToHuman(week, getWeekStart(), true),
          callbackIdBuild('week', [ 'archive', entityType,
            entityId, dateToCallback(week),
            WeeksArchiveAction.GetLessons ])
        )),
      3,
      extraRows
    )

    await ctx.editMessageText('🧦 Выбери неделю')
    await ctx.editMessageReplyMarkup(buttons.reply_markup)
  }

  switch (action) {
    case WeeksArchiveAction.GetLessons: {
      const weekStart = new Date(week)
      const weekEnd = new Date(week)
      weekEnd.setTime(weekStart.getTime() + (7 * 24 * 60 ** 2 * 1e3))

      let groupName = ''

      try {
        switch (entityType) {
          case WeeksArchiveType.Group:
            groupName = (await parser.getGroup(entityId)).display
            break
          case WeeksArchiveType.Teacher:
            groupName = entityId
            break
          case WeeksArchiveType.Subject: {
            const isStudent = ctx.user.role !== UserRole.Teacher
            if (isStudent && ctx.user.group) {
              groupName = ctx.user.group.display
            } else if (!isStudent && ctx.user.teacher_name) {
              groupName = ctx.user.teacher_name
            } else {
              throw new Error('Subject archive no entity name')
            }
            break
          }
        }
      } catch (e) {
        return await ctx.editMessageText(
          (e as Error).message === 'Group not found'
            ? '🥲 Группа не найдена'
            : '🤯 Произошла какая-то ошибка'
        )
      }

      const lessonsPayload: LessonsSearchOptions = {
        from: weekStart,
        before: weekEnd
      }

      switch (entityType) {
        case WeeksArchiveType.Group:
          lessonsPayload.group = entityId
          break
        case WeeksArchiveType.Teacher:
          lessonsPayload.teachers = entityId
          break
        case WeeksArchiveType.Subject: {
          const subject = (await keeper.getSubjects()).find(s => s.hash === parseInt(entityId))
          lessonsPayload.subject = subject!.name

          const isStudent = ctx.user.role !== UserRole.Teacher
          if (isStudent && ctx.user.group) {
            lessonsPayload.group = ctx.user.group.id
          } else if (!isStudent && ctx.user.teacher_name) {
            lessonsPayload.teachers = ctx.user.teacher_name
          }
          break
        }
      }

      const lessons = await keeper.getLessons(lessonsPayload)

      const target = weekToHuman(weekStart, new Date())

      if (!lessons.length) {
        return await ctx.editMessageText(`🤯 Расписания на неделю с ${target} нету`)
      }

      const groupsList = (entityType === WeeksArchiveType.Subject && ctx.user.role === UserRole.Teacher)
        || entityType === WeeksArchiveType.Teacher
        ? await parser.getGroups().catch(() => [])
        : undefined

      const messagesContent = lessonsToMessage(lessons, groupsList)

      for (let i = 0; i < messagesContent.length; i++) {
        let content = i === 0
          ? `Расписание ${groupName} на неделю с ${target}\n`
          : ''

        content += messagesContent[i] + '\n\n'
        + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

        if (i === 0) {
          await ctx.editMessageText(content, { parse_mode: 'HTML', disable_web_page_preview: true })
        } else {
          await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
        }
      }

      break
    }
    case WeeksArchiveAction.ShowPage: {
      const page = parseInt(pageString)
      const weeksPayload: WeeksSearchOptions = {
        before: getWeekStart()
      }

      switch (entityType) {
        case WeeksArchiveType.Group:
          weeksPayload.group = entityId
          break
        case WeeksArchiveType.Teacher:
          weeksPayload.teachers = entityId
          break
        case WeeksArchiveType.Subject: {
          const subject = (await keeper.getSubjects()).find(s => s.hash === parseInt(entityId))
          weeksPayload.subject = subject!.name

          const isStudent = ctx.user.role !== UserRole.Teacher
          if (isStudent && ctx.user.group) {
            weeksPayload.group = ctx.user.group.id
          } else if (!isStudent && ctx.user.teacher_name) {
            weeksPayload.teachers = ctx.user.teacher_name
          }
          break
        }
      }

      const weeks = await keeper.getWeeks(weeksPayload)

      const batchedWeeks = batchArray(
        weeks.sort((a, b) => b.getTime() - a.getTime()), 9)

      const extraRows: InlineKeyboardButton[][] = [ [] ]

      if (page !== 0) extraRows[0].push(
        Markup.button.callback('◀️',
          callbackIdBuild('week', [
            'archive', entityType,
            entityId, dateToCallback(batchedWeeks[1][0]),
            WeeksArchiveAction.ShowPage, `${page - 1}`
          ])
        )
      )

      if (page < batchedWeeks.length - 1) extraRows[0].push(
        Markup.button.callback('▶️',
          callbackIdBuild('week', [
            'archive', entityType,
            entityId, dateToCallback(batchedWeeks[1][0]),
            WeeksArchiveAction.ShowPage, `${page + 1}`
          ])
        )
      )

      const buttons = batchButtons(
        batchedWeeks[page].map((week) =>
          Markup.button.callback(
            weekToHuman(week, getWeekStart(), true),
            callbackIdBuild('week', [ 'archive', entityType, entityId,
              dateToCallback(week), WeeksArchiveAction.GetLessons ]
            )
          )),
        3,
        extraRows
      )

      return await ctx.editMessageReplyMarkup(buttons.reply_markup)
    }
  }
})