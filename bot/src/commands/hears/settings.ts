import { UserRole, UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'
import { callbackIdBuild } from '../../utils/keyboards'
import { Markup } from 'telegraf'

export class SettingsCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Настройки' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.MainMenu) return

    const isStudent = ctx.user.role !== UserRole.Teacher

    const settingsButtons = Markup.inlineKeyboard([
      [
        Markup.button.callback('Сменить роль', callbackIdBuild('settings', [ 'role' ])),
        Markup.button.callback(isStudent ? 'Сменить группу' : 'Сменить преподавателя',
          callbackIdBuild('settings', [ 'change_following' ])),
      ]
    ])

    await ctx.reply('👡 Выбери что хочешь настроить', {
      reply_markup: settingsButtons.reply_markup
    })
  }
}