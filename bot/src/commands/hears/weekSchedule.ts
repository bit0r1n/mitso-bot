import { Markup } from 'telegraf'
import { UserRole, UserState } from '../../schemas/User'
import {
  AbstractHearsCommand,
  batchButtons,
  callbackIdBuild,
  CommandContext,
  CommandUtils,
  dateToCallback,
  WeeksArchiveType
} from '../../utils'
import { getWeekStart, weekToHuman } from '../../keeper'

export class WeekScheduleCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super([ 'Неделя' ], utils)
  }

  async execute(ctx: CommandContext) {
    if (ctx.user.state !== UserState.MainMenu) return

    const { keeper } = this.utils

    const weekStartDate = new Date()
    weekStartDate.setTime(weekStartDate.getTime() + (3 * 60 ** 2 * 1e3))

    const weekStart = getWeekStart(weekStartDate)
    const isStudent = ctx.user.role !== UserRole.Teacher
    const searchEntity = isStudent ? ctx.user.group!.id : ctx.user.teacher_name!

    const weeks = await keeper.getWeeks({
      group: isStudent ? searchEntity : undefined,
      teachers: isStudent ? undefined : searchEntity
      // from: weekStart
    }).catch(() => [] as Date[])

    const actualWeeks = weeks.filter(w => w.getTime() >= weekStart.getTime())

    if (!weeks.length) {
      await ctx.reply('🌴 Недель с занятиями не нашлось')
      return
    }

    const buttons = batchButtons(
      actualWeeks.sort((a, b) => a.getTime() - b.getTime()).map((week, i) =>
        Markup.button.callback(
          weekToHuman(week),
          callbackIdBuild('week', [
            `${i}`,
            isStudent ? WeeksArchiveType.Group : WeeksArchiveType.Teacher,
            searchEntity,
            dateToCallback(week)
          ])
        )),
      3,
      weeks.length !== actualWeeks.length
        ? [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild(
          'week', [ 'archive', isStudent ? WeeksArchiveType.Group : WeeksArchiveType.Teacher, searchEntity ])) ] ]
        : []
    )

    await ctx.reply('🧦 Выбери неделю', {
      reply_markup: buttons.reply_markup
    })
  }
}