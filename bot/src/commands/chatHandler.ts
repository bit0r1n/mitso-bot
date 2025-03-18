import { Composer, Markup } from 'telegraf'
import { batchButtons, callbackIdBuild, inlineKeyboards, replyKeyboards, SuperDuperUpgradedContext } from '../utils'
import { message } from 'telegraf/filters'
import { UserRole, UserState } from '../schemas/User'
import { Group, Parser } from '../parser'
import { Keeper } from '../keeper'

export const chatHandler = new Composer<SuperDuperUpgradedContext>()

const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

chatHandler.on(message('text'), async (ctx) => {
  if (ctx.newUser) {
    await ctx.reply('🤯 Что-то я тебя не видал. Ладно, сейчас оформимся. Выбери кто ты', {
      reply_markup: inlineKeyboards.chooseRole.reply_markup
    })
    return
  }

  if (ctx.user.state === UserState.AskingWeekGroup) {
    if (ctx.message.text.length < 2) {
      return await ctx.reply('😨 Давай конкретнее, слишком маленький запрос')
    }

    let groups: Group[] = []

    try {
      groups = await parser.getGroups({ display: ctx.message.text })
    } catch {
      ctx.user.state = UserState.MainMenu
      await ctx.user.save()

      return await ctx.reply('😔 Поиск групп сейчас недоступен. Попробуй повторить позже', {
        reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
      })
    }

    if (!groups.length) {
      return await ctx.reply('🥺 Такой группы не нашлось. Попробуй другой номер группы')
    }

    ctx.user.state = UserState.MainMenu
    await ctx.user.save()

    ctx.reply('🤨', {
      reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
    })

    await ctx.reply('🍍 Выбери группу', {
      reply_markup: batchButtons(
        groups.map(g => Markup.button.callback(g.display, callbackIdBuild('group_week', [ g.id! ]))),
        3
      ).reply_markup
    })
  }

  if (ctx.user.state === UserState.AskingWeekTeacher) {
    if (ctx.message.text.length < 3) {
      return await ctx.reply('😨 Давай конкретнее, слишком маленький запрос')
    }

    const teachers: string[] = await keeper.getTeachers({ name: ctx.message.text })

    if (!teachers.length) {
      await ctx.reply('🥺 Такого преподавателя не нашлось. Попробуй написать по-другому')
      return
    }

    ctx.user.state = UserState.MainMenu
    await ctx.user.save()

    await ctx.reply('🤨', {
      reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
    })

    await ctx.reply('🍍 Выбери преподавателя', {
      reply_markup: batchButtons(
        teachers.map(t => Markup.button.callback(t, callbackIdBuild('teacher_week', [ t ]))),
        3
      ).reply_markup
    })
  }

  if (ctx.user.state === UserState.AskingFollowingEntity) {
    if (ctx.message.text.length < 2) {
      return await ctx.reply('😨 Давай конкретнее, слишком маленький запрос')
    }

    const isStudent = ctx.user.role !== UserRole.Teacher
    if (isStudent) {
      let groups: Group[] = []

      try {
        groups = await parser.getGroups({ display: ctx.message.text }) 
      } catch {
        return await ctx.reply('🏌️‍♂️ ГООООООЛ выбор группы пока недоступен, напиши свою группу чуть позже')
      }

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
        reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
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
        reply_markup: replyKeyboards[ctx.user.state].resize().reply_markup
      })
    }
  }
})