import { Markup } from 'telegraf'
import { UserRole, UserState } from '../../schemas/User'
import { AbstractSlashCommand, batchButtons, callbackIdBuild, CommandUtils, keyboards, SlashCommandContext } from '../../utils'

export class StartCommand extends AbstractSlashCommand {
  constructor(utils: CommandUtils) {
    super('start', utils)
  }

  async execute(ctx: SlashCommandContext) {
    if (ctx.newUser) {
      await ctx.reply('🍉 Привет, я могу тебе показывать расписание!\nТолько мне для этого нужно знать кто ты 😫')
      return await ctx.reply('🤨 Давай определимся от какого лица ты тут', {
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('Студент', callbackIdBuild('settings', [ 'role', 'student' ])),
            Markup.button.callback('Преподаватель', callbackIdBuild('settings', [ 'role', 'teacher' ])),
          ]
        ]).reply_markup
      })
    }
  
    const state = ctx.user.state
  
    switch (state) {
      case UserState.MainMenu: {
        return await ctx.reply('🍉 Хватай меню', {
          reply_markup: keyboards[state].resize().reply_markup
        })
      }
      case UserState.AskingFollowingEntity: {
        const askingText = ctx.user.role !== UserRole.Teacher
          ? 'Погоди, я пока жду от тебя номер группы'
          : 'Погоди, я пока жду от тебя инициалы преподавателя'
        return await ctx.reply('🍆 ' + askingText, {
          reply_markup: keyboards[state].resize().reply_markup
        })
      }
      case UserState.ChoosingFollowingEntity: {
        const buttons = ctx.user.role !== UserRole.Teacher
          ? ctx.user.choosing_groups!
            .map(g => Markup.button.callback(
              g.display,
              callbackIdBuild('select_entity', [ g.id ])
            ))
          : ctx.user.choosing_teachers!
            .map(t => Markup.button.callback(
              t,
              callbackIdBuild('select_entity', [ t ])
            ))
        return await ctx.reply('👞 Выбери ' + (ctx.user.role === UserRole.Teacher ? 'преподавателя' : 'группу'), {
          reply_markup: batchButtons(buttons).reply_markup
        })
      }
      case UserState.AskingWeekGroup: {
        await ctx.reply('🥥 Напиши номер группы, расписание которой ты хочешь узнать', {
          reply_markup: keyboards[state].resize().reply_markup
        })
        return
      }
      case UserState.AskingWeekTeacher: {
        await ctx.reply('📛 Напиши инициалы преподавателя, расписание которого ты хочешь узнать', {
          reply_markup: keyboards[state].resize().reply_markup
        })
        return
      }
    }
  }
}