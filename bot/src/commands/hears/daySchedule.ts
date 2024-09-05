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

    const messagesContent = lessonsToMessage(lessons)
    for (let i = 0; i < messagesContent.length; i++) {
      let content = ''
      if (i === 0) content = `Расписание ${ctx.user.group!.display} на ${ctx.message.text.toLowerCase()}\n`
      content += messagesContent + '\n\n'
          + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

      await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
    }
  }
}