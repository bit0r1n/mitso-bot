import { lessonsToMessage } from '../../keeper'
import { UserRole, UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils'

export class DayScheduleCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Сегодня', 'Завтра' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.MainMenu) return

    const { keeper, parser } = this.utils

    const extraTime = ctx.message.text === 'Завтра' ? 24 * 60 ** 2 * 1e3 : 0
  
    const todayStart = new Date()
    todayStart.setTime(todayStart.getTime() + (3 * 60 ** 2 * 1e3) + extraTime)
    todayStart.setHours(0, 0, 0, 0)
  
    const tomorrowStart = new Date()
    tomorrowStart.setTime(todayStart.getTime() + (24 * 60 ** 2 * 1e3))
    tomorrowStart.setHours(0, 0, 0, 0)

    const isStudent = ctx.user.role !== UserRole.Teacher

    const lessons = await keeper.getLessons({
      group: isStudent ? ctx.user.group!.id : undefined,
      teachers: isStudent ? undefined : ctx.user.teacher_name,
      from: todayStart,
      before: tomorrowStart
    })

    if (!lessons.length) {
      await ctx.reply(`🤩 На ${ctx.message.text.toLowerCase()} нет занятий`)
      return
    }

    const groupsList = ctx.user.role === UserRole.Teacher
      ? (await parser.getGroups())
      : undefined

    const messagesContent = lessonsToMessage(lessons, groupsList)
    const displayName = isStudent ? ctx.user.group!.display : ctx.user.teacher_name!
    for (let i = 0; i < messagesContent.length; i++) {
      let content = ''
      if (i === 0) content = `Расписание ${displayName} на ${ctx.message.text.toLowerCase()}\n`
      content += messagesContent[i] + '\n\n'
          + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

      await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
    }
  }
}