import { Markup } from 'telegraf'
import { UserState } from '../../schemas/User'
import { AbstractSlashCommand, CommandUtils, SlashCommandContext } from '../../utils/commandHelpers'
import { batchButtons, callbackIdBuild, keyboards } from '../../utils/keyboards'

export class StartCommand extends AbstractSlashCommand {
  constructor(utils: CommandUtils) {
    super('start', utils)
  }

  async execute(ctx: SlashCommandContext) {
    if (ctx.newUser) {
      await ctx.reply('🍉 Привет, я могу тебе показывать расписание!\nТолько мне для этого нужно знать твою группу 😫')
      await ctx.reply('🤨 Давай найдем твою группу. Напиши её номер')
      return
    }
  
    const state = ctx.user.state
  
    switch (state) {
    case UserState.MainMenu: {
      await ctx.reply('🍉 Хватай меню', {
        reply_markup: keyboards[state].resize().reply_markup
      })
      return
    }
    case UserState.AskingGroup: {
      await ctx.reply('🍆 Погоди, я пока жду от тебя номер группы', {
        reply_markup: keyboards[state].resize().reply_markup
      })
      return
    }
    case UserState.ChoosingGroup: {
      await ctx.reply('👞 Выбери группу', {
        reply_markup: batchButtons(
            ctx.user.choosing_groups!
              .map(g => Markup.button.callback(
                g.display!,
                callbackIdBuild('select_group', [ g.id! ])
              ))
        ).reply_markup
      })
      return
    }
    case UserState.AskingWeekGroup: {
      await ctx.reply('🥥 Напиши номер группы, распиание которой ты хочешь узнать', {
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