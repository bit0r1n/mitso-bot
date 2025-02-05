import { Composer } from 'telegraf'
import { callbackIdParse, CallbackIdSplitter, keyboards, SuperDuperUpgradedContext } from '../../../utils'
import { UserRole, UserState } from '../../../schemas/User'

export const selectEntityHandler = new Composer<SuperDuperUpgradedContext>()

selectEntityHandler.action(new RegExp([ 'select_entity', '*' ].join(CallbackIdSplitter)), async (ctx) => {
  const [ , ...args ] = callbackIdParse(ctx.match.input)

  const isStudent = ctx.user.role !== UserRole.Teacher
  if (isStudent) {
    const group = ctx.user.choosing_groups!.find(g => g.id === args[0])
    if (!group) {
      ctx.user.choosing_groups = []
      ctx.user.state = UserState.AskingFollowingEntity
      await ctx.user.save()

      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер')
    }
    ctx.user.choosing_groups = []
    ctx.user.choosing_teachers = []
    ctx.user.teacher_name = undefined

    ctx.user.group = { id: group.id, display: group.display }
    ctx.user.state = UserState.MainMenu
    await ctx.user.save()

    await ctx.deleteMessage().catch(() => {})

    return await ctx.replyWithMarkdownV2(`🫔 Выбрана группа *${group.display}*`, {
      reply_markup: keyboards[ctx.user.state].resize().reply_markup
    })
  } else {
    const teacher = ctx.user.choosing_teachers!.find(g => g === args[0])
    if (!teacher) {
      ctx.user.choosing_teachers = []
      ctx.user.state = UserState.AskingFollowingEntity
      await ctx.user.save()

      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе преподавателя. Попробуй поискать другого')
    }
    ctx.user.choosing_teachers = []
    ctx.user.choosing_groups = []
    ctx.user.group = undefined

    ctx.user.teacher_name = teacher
    ctx.user.state = UserState.MainMenu
    await ctx.user.save()

    await ctx.deleteMessage().catch(() => {})

    return await ctx.replyWithMarkdownV2(`🕺 Выбран преподаватель *${teacher.replace(/\./g, '\\.')}*`, {
      reply_markup: keyboards[ctx.user.state].resize().reply_markup
    })
  }
})