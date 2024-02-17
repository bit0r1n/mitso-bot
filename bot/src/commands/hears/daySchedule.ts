import { lessonsToMessage } from '../../keeper/helpers'
import { UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'

export class DayScheduleCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Сегодня', 'Завтра' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.MainMenu) return

    const { keeper } = this.utils

    const extraTime = ctx.message.text === 'Завтра' ? 24 * 60 ** 2 * 1e3 : 0
  
    const todayStart = new Date()
    todayStart.setTime(todayStart.getTime() + (3 * 60 ** 2 * 1e3) + extraTime)
    todayStart.setHours(0, 0, 0, 0)
  
    const tomorrowStart = new Date()
    tomorrowStart.setTime(todayStart.getTime() + (24 * 60 ** 2 * 1e3))
    tomorrowStart.setHours(0, 0, 0, 0)
  
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
  }
}