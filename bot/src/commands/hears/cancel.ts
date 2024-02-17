import { UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'
import { keyboards } from '../../utils/keyboards'

export class CancelCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Отмена' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state === UserState.ChoosingGroup) {
      if (!ctx.user.group || !Object.values(ctx.user.group).filter(Boolean).length) {
        await ctx.reply('😳 Нее, без группы мы не начинаем')
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