import { Markup, Telegraf } from 'telegraf'
import * as mongoose from 'mongoose'
import { SuperDuperUpgradedContext } from './utils/context'
import { User, UserRole, UserState } from './schemas/User'
import {
  batchButtons,
  callbackIdBuild,
  dateToCallback,
  keyboards,
  callbackIdParse, WeeksArchiveAction, WeeksArchiveType
} from './utils/keyboards'
import { Parser } from './parser/api'
import { Keeper } from './keeper/api'
import { callbackQuery, message } from 'telegraf/filters'
import { getWeekStart, lessonsToMessage, weekToHuman } from './keeper/helpers'
import { Group } from './parser/interfaces'
import { createSecret } from './utils/createSecret'
import { hearsCommands } from './commands/hears'
import { CommandUtils } from './utils/commandHelpers'
import { slashCommands } from './commands/slash'
import { batchArray } from './utils/array'
import { InlineKeyboardButton } from 'telegraf/types'

[ 'BOT_TOKEN', 'MONGO_URL', 'PARSER_URL', 'KEEPER_URL' ].every(key => {
  if (!process.env[key])
    throw new Error(`${key} is not set`)
})

await mongoose.connect(process.env.MONGO_URL!)

const bot = new Telegraf<SuperDuperUpgradedContext>(process.env.BOT_TOKEN!)
const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

const commandUtilsObject: CommandUtils = {
  parser,
  keeper
}
const registeredHearsCommands = hearsCommands.map((c) => new c(commandUtilsObject))
const registeredSlashCommands = slashCommands.map((c) => new c(commandUtilsObject))

bot.use(async (ctx, next) => {
  if (!ctx.from) return

  const chatId = ctx.from.id
  let user = await User.findOne({ telegramId: chatId })

  if (!user) {
    user = await User.create({
      telegramId: chatId,
      username: ctx.from.username,
      state: UserState.AskingFollowingEntity
    })
    ctx.newUser = true
  }

  ctx.user = user

  if (ctx.user.username !== ctx.from.username) {
    ctx.user.username = ctx.from.username!
    await ctx.user.save()
  }

  if (ctx.user.blacklisted === true) return

  return next()
})

for (const command of registeredSlashCommands) {
  bot.command(command.triggers, command.execute.bind(command))
}

for (const command of registeredHearsCommands) {
  console.log('Registering HEARS with "%s" triggers', command.triggers)
  bot.hears(command.triggers, command.execute.bind(command))
}

bot.on(callbackQuery('data'), async (ctx) => {
  const [ command, ...args ] = callbackIdParse(ctx.callbackQuery.data)

  if (command === 'select_entity') {
    const isStudent = ctx.user.role !== UserRole.Teacher
    if (isStudent) {
      const group = ctx.user.choosing_groups!.find(g => g.id === args[0])
      if (!group) {
        ctx.user.choosing_groups = []
        ctx.user.state = UserState.AskingFollowingEntity
        await ctx.user.save()

        return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер')
      }
      ctx.user.choosing_groups = []
      ctx.user.choosing_teachers = []
      ctx.user.teacher_name = undefined

      ctx.user.group = { id: group.id, display: group.display }
      ctx.user.state = UserState.MainMenu
      await ctx.user.save()

      await ctx.deleteMessage().catch(() => {})

      return await ctx.replyWithMarkdownV2(`🫔 Выбрана группа *${group.display}*`, {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
      })
    } else {
      const teacher = ctx.user.choosing_teachers!.find(g => g === args[0])
      if (!teacher) {
        ctx.user.choosing_teachers = []
        ctx.user.state = UserState.AskingFollowingEntity
        await ctx.user.save()

        return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе преподавателя. Попробуй поискать другого')
      }
      ctx.user.choosing_teachers = []
      ctx.user.choosing_groups = []
      ctx.user.group = undefined

      ctx.user.teacher_name = teacher
      ctx.user.state = UserState.MainMenu
      await ctx.user.save()

      await ctx.deleteMessage().catch(() => {})

      return await ctx.replyWithMarkdownV2(`🕺 Выбран преподаватель *${teacher.replace(/\./g, '\\.')}*`, {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
      })
    }
  } else if (command === 'week') {
    const [ weekId ] = args

    if (weekId === 'archive') {
      const [ , entityType, entityId, week, action, pageString ] = args

      if (!week && !action) {
        const weeks = await keeper.getWeeks({
          teachers: entityType === WeeksArchiveType.Teacher ? entityId : undefined,
          group: entityType === WeeksArchiveType.Group ? entityId : undefined,
          before: getWeekStart()
        })

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

        let groupName: string

        try {
          groupName = entityType === WeeksArchiveType.Teacher
            ? entityId
            : (await parser.getGroup(entityId)).display
        } catch (e) {
          return await ctx.editMessageText(
            (e as Error).message === 'Group not found'
              ? '🥲 Группа не найдена'
              : '🤯 Произошла какая-то ошибка'
          )
        }

        const lessons = await keeper.getLessons({
          group: entityType === WeeksArchiveType.Group ? entityId : undefined,
          teachers: entityType === WeeksArchiveType.Teacher ? entityId : undefined,
          from: weekStart,
          before: weekEnd
        })

        const target = weekToHuman(weekStart, new Date())

        if (!lessons.length) {
          return await ctx.editMessageText(`🤯 Расписания на неделю с ${target} нету`)
        }

        const groupsList = entityType === WeeksArchiveType.Teacher
          ? (await parser.getGroups())
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
        const weeks = await keeper.getWeeks({
          group: entityType === WeeksArchiveType.Group ? entityId : undefined,
          teachers: entityType === WeeksArchiveType.Teacher ? entityId : undefined,
          before: getWeekStart()
        })

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
      return
    }

    const [ , entityType, entityId, weekStartRaw ] = args

    const weekStart = new Date(weekStartRaw)
    const weekEnd = new Date(weekStartRaw)
    weekEnd.setTime(weekStart.getTime() + (7 * 24 * 60 ** 2 * 1e3))

    const isStudent = ctx.user.role !== UserRole.Teacher
    let entityName: string = isStudent ? ctx.user.group!.display! : ctx.user.teacher_name!

    if (entityId && entityType === WeeksArchiveType.Group) {
      try {
        entityName = (await parser.getGroup(entityId)).display
      } catch (e) {
        await ctx.answerCbQuery()
        return await ctx.editMessageText(
          (e as Error).message === 'Group not found'
            ? '🥲 Группа не найдена'
            : '🤯 Произошла какая-то ошибка'
        )
      }
    }

    const lessons = await keeper.getLessons({
      group: entityType === WeeksArchiveType.Group ? entityId || ctx.user.group!.id : undefined,
      teachers: entityType === WeeksArchiveType.Teacher ? entityId : undefined,
      from: weekStart,
      before: weekEnd
    })

    const currentDate = new Date()
    currentDate.setTime(currentDate.getTime() + (3 * 60 ** 2 * 1e3))
    const diff = weekStart.getTime() - currentDate.getTime()
    const weekDiff = Math.ceil(diff / (7 * 24 * 60 ** 2 * 1e3))

    const target = weekDiff === 0 ? 'текущую неделю' : `${weekDiff + 1} неделю`

    if (!lessons.length) {
      await ctx.answerCbQuery()
      return await ctx.editMessageText(`🤯 Расписания на ${target} нету`)
    }

    await ctx.answerCbQuery()

    const groupsList = entityType === WeeksArchiveType.Teacher
      ? (await parser.getGroups())
      : undefined

    const messagesContent = lessonsToMessage(lessons, groupsList)

    for (let i = 0; i < messagesContent.length; i++) {
      let content = i === 0
        ? `Расписание ${entityName} на ${target}\n`
        : ''

      content += messagesContent[i] + '\n\n'
          + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

      if (i === 0) {
        await ctx.editMessageText(content, { parse_mode: 'HTML', disable_web_page_preview: true })
      } else {
        await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
      }
    }
  } else if (command === 'teacher_week') {
    const [ teacherName, weekStartRaw ] = args

    if (!teacherName) {
      ctx.user.state = UserState.AskingWeekTeacher
      await ctx.user.save()

      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)

      await ctx.reply('🤨', {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
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
  } else if (command === 'group_week') {
    const [ groupId, weekStartRaw ] = args

    if (!groupId) {
      ctx.user.state = UserState.AskingWeekGroup
      await ctx.user.save()

      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([ [] ]).reply_markup)

      await ctx.reply('🤨', {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
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
  } else if (command === 'settings') {
    const [ settingName, chosenRole ] = args

    switch (settingName) {
    case 'role': {
      if (chosenRole?.length) {
        const role = chosenRole === 'teacher' ? UserRole.Teacher : UserRole.Student
        ctx.user.role = role
        ctx.user.state = UserState.AskingFollowingEntity
        ctx.user.isNew = false
        await ctx.user.save()

        const askingText = role === UserRole.Student ?
          'Теперь напиши свою группу' :
          'Теперь напиши инициалы преподавателя (или их часть)'

        await ctx.reply('🤨', {
          reply_markup: Markup.removeKeyboard().reply_markup
        })

        return await ctx.editMessageText('🦫 ' + askingText, {
          reply_markup: Markup.inlineKeyboard([]).reply_markup
        })
      }

      const roleOptionsKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('Студент', callbackIdBuild('settings', [ 'role', 'student' ])),
          Markup.button.callback('Преподаватель', callbackIdBuild('settings', [ 'role', 'teacher' ])),
        ]
      ])

      return await ctx.editMessageText('🤸 Выбери новую роль', {
        reply_markup: roleOptionsKeyboard.reply_markup
      })
    }
    case 'change_following': {
      ctx.user.state = UserState.AskingFollowingEntity
      await ctx.user.save()

      const isStudent = ctx.user.role !== UserRole.Teacher
      const askingText = isStudent
        ? 'Напиши номер группы'
        : 'Напиши инициалы преподавателя или их часть'

      return await ctx.editMessageText('🤺 ' + askingText, {
        reply_markup: Markup.inlineKeyboard([]).reply_markup
      })
    }
    }
  }
})

bot.on(message('text'), async (ctx) => {
  if (ctx.newUser) {
    await ctx.reply('🤯 Что-то я тебя не видал. Ладно, сейчас оформимся. Выбери кто ты', {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('Студент', callbackIdBuild('settings', [ 'role', 'student' ])),
          Markup.button.callback('Преподаватель', callbackIdBuild('settings', [ 'role', 'teacher' ])),
        ]
      ]).reply_markup
    })
    return
  }

  if (ctx.user.state === UserState.AskingWeekGroup) {
    const groups = await parser.getGroups({ display: ctx.message.text })

    if (!groups.length) {
      await ctx.reply('🥺 Такой группы не нашлось. Попробуй другой номер группы')
      return
    }

    ctx.user.state = UserState.MainMenu
    await ctx.user.save()

    ctx.reply('🤨', {
      reply_markup: keyboards[ctx.user.state].resize().reply_markup
    })

    await ctx.reply('🍍 Выбери группу', {
      reply_markup: batchButtons(
        groups.map(g => Markup.button.callback(g.display, callbackIdBuild('group_week', [ g.id! ]))),
        3
      ).reply_markup
    })
  }

  if (ctx.user.state === UserState.AskingWeekTeacher) {
    const teachers: string[] = await keeper.getTeachers({ name: ctx.message.text })

    if (!teachers.length) {
      await ctx.reply('🥺 Такого преподавателя не нашлось. Попробуй написать по-другому')
      return
    }

    ctx.user.state = UserState.MainMenu
    await ctx.user.save()

    await ctx.reply('🤨', {
      reply_markup: keyboards[ctx.user.state].resize().reply_markup
    })

    await ctx.reply('🍍 Выбери преподавателя', {
      reply_markup: batchButtons(
        teachers.map(t => Markup.button.callback(t, callbackIdBuild('teacher_week', [ t ]))),
        3
      ).reply_markup
    })
  }

  if (ctx.user.state === UserState.AskingFollowingEntity) {
    const isStudent = ctx.user.role !== UserRole.Teacher
    if (isStudent) {
      const groups = await parser.getGroups({ display: ctx.message.text })

      if (!groups.length) {
        return await ctx.reply('🩼 Таких групп я не видал. Попробуй другой номер')
      }

      ctx.user.choosing_groups = groups.map(g => ({ id: g.id, display: g.display }))
      ctx.user.state = UserState.ChoosingFollowingEntity
      await ctx.user.save()

      await ctx.reply('👞 Выбери группу', {
        reply_markup: batchButtons(
          ctx.user.choosing_groups
            .map(g => Markup.button.callback(g.display!, callbackIdBuild('select_entity', [ g.id! ])))
        ).reply_markup
      })

      await ctx.reply('🤨', {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
      })
    } else if (ctx.user.role === UserRole.Teacher) {
      const teachers = await keeper.getTeachers({ name: ctx.message.text })

      if (!teachers.length) {
        return await ctx.reply('🫐 Таких я не видал. Попробуй написать другого преподавателя')
      }

      ctx.user.choosing_teachers = teachers
      ctx.user.state = UserState.ChoosingFollowingEntity
      await ctx.user.save()

      await ctx.reply('👞 Выбери преподавателя', {
        reply_markup: batchButtons(
          ctx.user.choosing_teachers
            .map(t => Markup.button.callback(t, callbackIdBuild('select_entity', [ t ])))
        ).reply_markup
      })

      await ctx.reply('🤨', {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
      })
    }
  }
})

process.on('uncaughtException', console.error)

process.on('unhandledRejection', console.error)

bot.catch((err) => console.error(err))

if (process.env.WEBHOOK_DOMAIN?.length) {
  const secretToken = process.env.WEBHOOK_SECRET?.length ? process.env.WEBHOOK_SECRET : createSecret()
  const webhookDomain = process.env.WEBHOOK_DOMAIN!
  const webhookPath = process.env.WEBHOOK_PATH?.length ?
    process.env.WEBHOOK_PATH :
    `/telegraf/${bot.secretPathComponent()}`
  const webhookServerPort = process.env.WEBHOOK_SERVER_PORT?.length ?
    parseInt(process.env.WEBHOOK_SERVER_PORT) :
    3000

  console.log(
    'Startin bot in WEBHOOK MODE, startin server %s, Telegram will know as %s',
    `http://localhost:${webhookServerPort}${webhookPath}`,
    `${webhookDomain}${webhookPath}`
  )

  await bot.launch({
    webhook: {
      domain: webhookDomain,
      port: webhookServerPort,
      hookPath: webhookPath,
      secretToken
    }
  })
} else {
  console.log('Startin bot in POLLING MODE')
  await bot.launch()
}
