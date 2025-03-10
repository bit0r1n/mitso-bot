import { Composer } from 'telegraf'
import { callbackIdParse, CallbackIdSplitter, SuperDuperUpgradedContext, WeeksArchiveType } from '../../../../utils'
import { Parser } from '../../../../parser'
import { Keeper, lessonsToMessage } from '../../../../keeper'
import { UserRole } from '../../../../schemas/User'

export const selfWeekHandler = new Composer<SuperDuperUpgradedContext>()

const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

selfWeekHandler.action(new RegExp([ '^week', '\\d+', '*' ].join(CallbackIdSplitter)), async (ctx) => {
  const [ , ...args ] = callbackIdParse(ctx.match.input)
  const [ , entityType, entityId, weekStartRaw ] = args

  const weekStart = new Date(weekStartRaw)
  const weekEnd = new Date(weekStartRaw)
  weekEnd.setTime(weekStart.getTime() + (7 * 24 * 60 ** 2 * 1e3))

  const isStudent = ctx.user.role !== UserRole.Teacher
  let entityName: string = isStudent ? ctx.user.group!.display! : ctx.user.teacher_name!

  if (entityId && entityType === WeeksArchiveType.Group) {
    try {
      entityName = (await parser.getGroup(entityId)).display
    } catch (e) {
      await ctx.answerCbQuery()
      return await ctx.editMessageText(
        (e as Error).message === 'Group not found'
          ? '🥲 Группа не найдена'
          : '🤯 Произошла какая-то ошибка'
      )
    }
  }

  const lessons = await keeper.getLessons({
    group: entityType === WeeksArchiveType.Group ? entityId || ctx.user.group!.id : undefined,
    teachers: entityType === WeeksArchiveType.Teacher ? entityId : undefined,
    from: weekStart,
    before: weekEnd
  })

  const currentDate = new Date()
  currentDate.setTime(currentDate.getTime() + (3 * 60 ** 2 * 1e3))
  const diff = weekStart.getTime() - currentDate.getTime()
  const weekDiff = Math.ceil(diff / (7 * 24 * 60 ** 2 * 1e3))

  const target = weekDiff === 0 ? 'текущую неделю' : `${weekDiff + 1} неделю`

  if (!lessons.length) {
    await ctx.answerCbQuery()
    return await ctx.editMessageText(`🤯 Расписания на ${target} нету`)
  }

  await ctx.answerCbQuery()

  const groupsList = entityType === WeeksArchiveType.Teacher
    ? await parser.getGroups().catch(() => [])
    : undefined

  const messagesContent = lessonsToMessage(lessons, groupsList)

  for (let i = 0; i < messagesContent.length; i++) {
    let content = i === 0
      ? `Расписание ${entityName} на ${target}\n`
      : ''

    content += messagesContent[i] + '\n\n'
      + '❤️‍🔥 <a href="https://bitor.in/donate">ПОДДЕРЖАТЬ МАТЕРИАЛЬНО!!</a>'

    if (i === 0) {
      await ctx.editMessageText(content, { parse_mode: 'HTML', disable_web_page_preview: true })
    } else {
      await ctx.reply(content, { parse_mode: 'HTML', disable_web_page_preview: true })
    }
  }
})