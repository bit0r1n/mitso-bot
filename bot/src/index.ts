import { Markup, Telegraf } from 'telegraf'
import * as mongoose from 'mongoose'
import { SuperDuperUpgradedContext } from './helpers/context'
import { User, UserState } from './schemas/User'
import { CallbackIdSplitter, batchButtons, callbackIdBuild, dateToCallback, keyboards } from './helpers/keyboards'
import { Parser } from './parser/api'
import { Keeper } from './keeper/api'
import { callbackQuery, message } from 'telegraf/filters'
import { getWeekStart, lessonsToMessage, weekToHuman } from './keeper/helpers'
import { Group } from './parser/interfaces'

['BOT_TOKEN', 'MONGO_URL', 'PARSER_URL', 'KEEPER_URL'].every(key => {
  if (!process.env[key])
    throw new Error(`${key} is not set`)
})

await mongoose.connect(process.env.MONGO_URL!)

const bot = new Telegraf<SuperDuperUpgradedContext>(process.env.BOT_TOKEN!)
const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

bot.use(async (ctx, next) => {
  if (!ctx.from) return

  let chatId = ctx.from.id
  let user = await User.findOne({ telegramId: chatId })

  if (!user) {
    user = await User.create({
      telegramId: chatId,
      username: ctx.from.username,
      state: UserState.AskingGroup
    })
    ctx.newUser = true
  }

  ctx.user = user

  return next()
})

bot.start(async ctx => {
  if (ctx.newUser) {
    await ctx.reply('🍉 Привет, я могу тебе показывать расписание!\nТолько мне для этого нужно знать твою группу 😫')
    await ctx.reply('🤨 Давай найдем твою группу. Напиши её номер')
    return
  }

  if (ctx.user.state === UserState.MainMenu) {
    await ctx.reply('🍉 Хватай меню', {
      reply_markup: keyboards[ctx.user.state].resize().reply_markup
    })
  } else if (ctx.user.state === UserState.AskingGroup) {
    await ctx.reply('🍆 Погоди, я пока жду от тебя номер группы', {
      reply_markup: keyboards[ctx.user.state].resize().reply_markup
    })
  } else if (ctx.user.state === UserState.ChoosingGroup) {
    await ctx.reply('👞 Выбери группу', {
      reply_markup: batchButtons(
        ctx.user.choosing_groups
          .map(g => Markup.button.callback(
            g.display!,
            callbackIdBuild('select_group', [ g.id! ])
          ))
      ).reply_markup
    })
  }
})

bot.hears(/^иди|пош(е|ё)л нахуй/i, async (ctx) => {
  await ctx.reply('сам иди') // @krosbite
})

bot.hears([ 'Сегодня', 'Завтра' ], async (ctx) => {
  if (ctx.user.state !== UserState.MainMenu) return

  const extraTime = ctx.message.text === 'Завтра' ? 24 * 60 ** 2 * 1e3 : 0

  const todayStart = new Date()
  todayStart.setTime(todayStart.getTime() + (3 * 60 ** 2 * 1e3) + extraTime)
  todayStart.setHours(0, 0, 0, 0)

  const tomorrowStart = new Date()
  tomorrowStart.setTime(tomorrowStart.getTime() + (3 * 60 ** 2 * 1e3) + extraTime)
  tomorrowStart.setHours(0, 0, 0, 0)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const lessons = await keeper.getLessons({
    group: ctx.user.group!.id,
    from: todayStart,
    before: tomorrowStart
  })

  if (!lessons.length) {
    await ctx.reply(`🤩 На ${ctx.message.text.toLowerCase()} нет занятий`)
    return
  }
  await ctx.reply([
    `Расписание ${ctx.user.group!.display} на ${ctx.message.text.toLowerCase()}`,
    lessonsToMessage(lessons)
  ].join('\n'))
})

bot.hears('Неделя', async (ctx) => {
  if (ctx.user.state !== UserState.MainMenu) return

  const weeks = await keeper.getWeeks({
    group: ctx.user.group!.id!,
    from: new Date()
  })

  const buttons = batchButtons(
    weeks.map((week, i) =>
      Markup.button.callback(
        weekToHuman(week),
        callbackIdBuild('week', [ `${i}`, dateToCallback(week) ])
      )),
    3,
    // [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild('week', [ 'archive' ])) ] ]
  )

  await ctx.reply('🧦 Выбери неделю', {
    reply_markup: buttons.reply_markup
  })
})

bot.hears('Сменить группу', async (ctx) => {
  if (ctx.user.state !== UserState.MainMenu) return

  ctx.user.state = UserState.AskingGroup
  // @ts-ignore
  await ctx.user.save()

  await ctx.reply('👡 Введи номер группы', {
    reply_markup: Markup.removeKeyboard().reply_markup
  })
})

bot.hears('Другие расписания', async (ctx) => {
  if (ctx.user.state !== UserState.MainMenu) return

  await ctx.reply('🥾 Выбери какое расписание тебе нужно', {
    parse_mode: 'MarkdownV2',
    reply_markup: Markup.inlineKeyboard([
      [ Markup.button.callback('Преподаватель', callbackIdBuild('teacher_week')), Markup.button.callback('Группа', callbackIdBuild('group_week')) ]
    ]).reply_markup
  })
})

bot.hears('Отмена', async (ctx) => {
  if (ctx.user.state === UserState.ChoosingGroup) {
    if (!ctx.user.group || !Object.values(ctx.user.group).filter(Boolean).length) {
      await ctx.reply('😳 Нее, без группы мы не начинаем')
    } else {
      ctx.user.state = UserState.MainMenu
      // @ts-ignore
      await ctx.user.save()

      await ctx.reply('🫠 ладн', {
        reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
      })
    }
  } else if ([ UserState.AskingWeekTeacher, UserState.AskingWeekGroup ].includes(ctx.user.state)) {
    ctx.user.state = UserState.MainMenu
    // @ts-ignore
    await ctx.user.save()

    await ctx.reply('👍 (ок (👍))', {
      reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
    })
  }
})

bot.on(callbackQuery('data'), async (ctx) => {
  const [ command, ...args ] = ctx.callbackQuery.data.split(CallbackIdSplitter)

  if (command === 'select_group') {
    const group = ctx.user.choosing_groups.find(g => g.id === args[0])
    if (!group) {
      ctx.user.choosing_groups = []
      ctx.user.state = UserState.AskingGroup
      // @ts-ignore
      await ctx.user.save()

      await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер')
      return
    }

    ctx.user.group = { id: group.id, display: group.display }
    ctx.user.state = UserState.MainMenu
    // @ts-ignore
    await ctx.user.save()

    await ctx.deleteMessage().catch(() => {})

    await ctx.replyWithMarkdownV2(`🫔 Выбрана группа *${group.display}*`, {
      reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
    })
    return
  } else if (command === 'week') {
    const [ weekId, weekStartRaw, groupId ] = args

    if (weekId === 'archive') {
      // TODO: weeks -> view archive
      await ctx.answerCbQuery()
      return
    }

    const weekStart = new Date(weekStartRaw)
    const weekEnd = new Date(weekStartRaw)
    weekEnd.setDate(weekEnd.getDate() + 7)

    if (groupId) {
      try {
        await parser.getGroup(groupId)
      } catch (e) {
        await ctx.answerCbQuery()
        await ctx.editMessageText(
          (e as Error).message === 'Group not found'
            ? '🥲 Группа не найдена'
            : '🤯 Произошла какая-то ошибка'
          )
        return
      }
    }

    const lessons = await keeper.getLessons({
      group: groupId || ctx.user.group!.id,
      from: weekStart,
      before: weekEnd
    })

    const target = weekId === '0' ? 'текущую неделю' : `${+weekId + 1} неделю`

    if (!lessons.length) {
      await ctx.answerCbQuery()
      await ctx.editMessageText(`🤯 Распиания на ${target} нету`)
      return
    }

    await ctx.answerCbQuery()
    await ctx.editMessageText([
      `Расписание ${ctx.user.group!.display} на ${target}`,
      lessonsToMessage(lessons)
    ].join('\n'))
  } else if (command === 'teacher_week') {
    const [ teacherName ] = args

    if (!teacherName) {
      ctx.user.state = UserState.AskingWeekTeacher
      // @ts-ignore
      await ctx.user.save()

      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup)

      await ctx.reply('🤨', {
        reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
      })

      await ctx.editMessageText('🧄 Напиши инициалы преподавателя или его часть\n\nОбычно они в формате Фамилия И. О.')
    } else {
      const weekStart = getWeekStart(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const lessons = await keeper.getLessons({
        teachers: [ teacherName ],
        from: weekStart,
        before: weekEnd
      })

      if (!lessons.length) {
        await ctx.answerCbQuery()
        await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup)
        await ctx.editMessageText(`🪤 Кажется кто-то кайфует на этой неделе`)
        return
      }

      await ctx.answerCbQuery()

      const groups = await parser.getGroups()

      await ctx.editMessageText([
        `Распиания на неделю у ${teacherName}`,
        lessonsToMessage(lessons, groups)
      ].join('\n'))
    }
  } else if (command === 'group_week') {
    const [ groupId ] = args

    if (!groupId) {
      ctx.user.state = UserState.AskingWeekGroup
      // @ts-ignore
      await ctx.user.save()

      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup)

      await ctx.reply('🤨', {
        reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
      })

      await ctx.editMessageText('🥕 Напиши номер группы для поиска расписания')
    } else {
      let group: Group
      try {
        group = await parser.getGroup(groupId)
      } catch (e) {
        await ctx.answerCbQuery()
        await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup)
        await ctx.editMessageText(
          (e as Error).message === 'Group not found'
            ? '😭 Группа не найдена'
            : '📸 Произошла какая-то ошибка'
        )
        return
      }

      const weekStart = getWeekStart(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const lessons = await keeper.getLessons({
        group: groupId,
        from: weekStart,
        before: weekEnd
      })

      if (!lessons.length) {
        await ctx.answerCbQuery()
        await ctx.editMessageText(`🥥 Распиания на неделю для ${group.display} нету`)
        return
      }
    
      await ctx.answerCbQuery()
      await ctx.editMessageText([
        `Распиания на неделю для ${group.display}`,
        lessonsToMessage(lessons)
      ].join('\n'))
    }
  }
})

bot.on(message('text'), async (ctx) => {
  if (ctx.newUser) {
    await ctx.reply('🤯 Что-то я тебя не видал. Ладно, сейчас оформимся. Напиши номер своей группы, чтобы я знал какое расписание получать')
    return
  }

  if (ctx.user.state === UserState.AskingWeekGroup) {
    const groups = await parser.getGroups({ display: ctx.message.text })

    if (!groups.length) {
      await ctx.reply('🥺 Такой группы не нашлось. Попробуй другой номер группы')
      return
    }

    ctx.user.state = UserState.MainMenu
    // @ts-ignore
    await ctx.user.save()

    ctx.reply('🤨', {
      reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
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
    // @ts-ignore
    await ctx.user.save()

    ctx.reply('🤨', {
      reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
    })

    await ctx.reply('🍍 Выбери преподавателя', {
      reply_markup: batchButtons(
        teachers.map(t => Markup.button.callback(t, callbackIdBuild('teacher_week', [ t ]))),
        3
      ).reply_markup
    })
  }

  if (ctx.user.state === UserState.AskingGroup) {
    const groups = await parser.getGroups({ display: ctx.message.text })

    if (!groups.length) {
      await ctx.reply('🩼 Таких групп я не видал. Попробуй другой номер')
      return
    }

    ctx.user.choosing_groups = groups.map(g => ({ id: g.id, display: g.display }))
    ctx.user.state = UserState.ChoosingGroup
    // @ts-ignore
    await ctx.user.save()

    await ctx.reply('👞 Выбери группу', {
      reply_markup: batchButtons(
        ctx.user.choosing_groups
          .map(g => Markup.button.callback(g.display!, callbackIdBuild('select_group', [ g.id! ])))
      ).reply_markup
    })

    await ctx.reply('🤨', {
      reply_markup: keyboards[ctx.user.state as UserState].resize().reply_markup
    })
  }
})

await bot.launch()