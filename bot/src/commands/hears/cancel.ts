import { UserRole, UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils, keyboards } from '../../utils'

export class CancelCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Отмена' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state === UserState.ChoosingFollowingEntity) {
      const isStudent = ctx.user.role !== UserRole.Teacher

      if (isStudent && (!ctx.user.group || !Object.values(ctx.user.group).filter(Boolean).length)) {
        await ctx.reply('😳 Нее, без группы мы не начинаем')
      } else if (ctx.user.role === UserRole.Teacher && !ctx.user.teacher_name) {
        await ctx.reply('🫠 Нее, так не начинаем')
      } else {
        ctx.user.state = UserState.MainMenu
        await ctx.user.save()
  
        await ctx.reply('🫠 ладн', {
          reply_markup: keyboards[ctx.user.state].resize().reply_markup
        })
      }
    } else if ([ UserState.AskingWeekTeacher, UserState.AskingWeekGroup ].includes(ctx.user.state)) {
      ctx.user.state = UserState.MainMenu
      await ctx.user.save()
  
      await ctx.reply('👍 (ок (👍))', {
        reply_markup: keyboards[ctx.user.state].resize().reply_markup
      })
    }
  }
}