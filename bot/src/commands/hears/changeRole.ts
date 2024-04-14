import { Markup } from 'telegraf'
import { UserRole, UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'

export class ChangeRoleCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Студент', 'Преподаватель' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.ChoosingRole) return

    ctx.user.role = ctx.message.text === 'Студент'
      ? UserRole.Student
      : UserRole.Teacher

    ctx.user.state = ctx.user.role === UserRole.Student
      ? UserState.AskingGroup
      : UserState.AskingTeacherProfile
    await ctx.user.save()

    await ctx.reply('👡 Введи номер группы', {
      reply_markup: Markup.removeKeyboard().reply_markup
    })
  }
}