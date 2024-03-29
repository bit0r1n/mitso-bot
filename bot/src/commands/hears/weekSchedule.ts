import { Markup } from 'telegraf'
import { UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'
import { batchButtons, callbackIdBuild, dateToCallback, WeeksArchiveType } from '../../utils/keyboards'
import { getWeekStart, weekToHuman } from '../../keeper/helpers'

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
    const groupId = ctx.user.group!.id!

    const weeks = await keeper.getWeeks({
      group: groupId,
      // from: weekStart
    })

    const actualWeeks = weeks.filter(w => w.getTime() >= weekStart.getTime())

    if (!weeks.length) {
      await ctx.reply('🌴 Недель с занятиями не нашлось')
      return
    }

    const buttons = batchButtons(
      actualWeeks.sort((a, b) => a.getTime() - b.getTime()).map((week, i) =>
        Markup.button.callback(
          weekToHuman(week),
          callbackIdBuild('week', [ `${i}`, dateToCallback(week) ])
        )),
      3,
      weeks.length !== actualWeeks.length
        ? [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild(
          'week', [ 'archive', WeeksArchiveType.Group, groupId ])) ] ]
        : []
    )

    await ctx.reply('🧦 Выбери неделю', {
      reply_markup: buttons.reply_markup
    })
  }
}