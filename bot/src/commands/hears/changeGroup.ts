import { Markup } from 'telegraf'
import { UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'

export class ChangeGroupCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Сменить группу' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.MainMenu) return

    ctx.user.state = UserState.AskingGroup
    await ctx.user.save()

    await ctx.reply('👡 Введи номер группы', {
      reply_markup: Markup.removeKeyboard().reply_markup
    })
  }
}