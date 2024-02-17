import { Markup } from 'telegraf'
import { UserState } from '../../schemas/User'
import { AbstractHearsCommand, CommandContext, CommandUtils } from '../../utils/commandHelpers'
import { batchButtons, callbackIdBuild, dateToCallback } from '../../utils/keyboards'
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

    const weeks = await keeper.getWeeks({
      group: ctx.user.group!.id!,
      from: weekStart
    })

    if (!weeks.length) {
      await ctx.reply('🌴 Недель с занятиями не нашлось')
      return
    }

    const buttons = batchButtons(
      weeks.map((week, i) =>
        Markup.button.callback(
          weekToHuman(week),
          callbackIdBuild('week', [ `${i}`, dateToCallback(week) ])
        )),
      3,
      // [ [ Markup.button.callback('🚽 Архив недель', callbackIdBuild('week', [ 'archive' ])) ] ]
    )

    await ctx.reply('🧦 Выбери неделю', {
      reply_markup: buttons.reply_markup
    })
  }
}