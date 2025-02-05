import { Markup } from 'telegraf'
import { UserState } from '../../schemas/User'
import { AbstractHearsCommand, callbackIdBuild, CommandContext, CommandUtils, inlineKeyboards } from '../../utils'

export class OtherSchedulesCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Другие расписания' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.MainMenu) return

    await ctx.reply('🥾 Выбери какое расписание тебе нужно', {
      parse_mode: 'MarkdownV2',
      reply_markup: inlineKeyboards.otherSchedules.reply_markup
    })
  }
}