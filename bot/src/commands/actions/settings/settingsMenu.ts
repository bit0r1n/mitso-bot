import { Composer, Markup } from 'telegraf'
import { callbackIdBuild, callbackIdParse, CallbackIdSplitter, SuperDuperUpgradedContext } from '../../../utils'
import { UserRole, UserState } from '../../../schemas/User'

export const settingsMenuHandler = new Composer<SuperDuperUpgradedContext>()

settingsMenuHandler.action(new RegExp([ 'settings', '*' ].join(CallbackIdSplitter)), async (ctx) => {
  const [ , ...args ] = callbackIdParse(ctx.match.input)
  const [ settingName, chosenRole ] = args

  switch (settingName) {
    case 'role': {
      if (chosenRole?.length) {
        const role = chosenRole === 'teacher' ? UserRole.Teacher : UserRole.Student
        ctx.user.role = role
        ctx.user.state = UserState.AskingFollowingEntity
        ctx.user.isNew = false
        await ctx.user.save()

        const askingText = role === UserRole.Student
          ? 'Теперь напиши свою группу'
          : 'Теперь напиши инициалы преподавателя (или их часть)'

        await ctx.reply('🤨', {
          reply_markup: Markup.removeKeyboard().reply_markup
        })

        return await ctx.editMessageText('🦫 ' + askingText, {
          reply_markup: Markup.inlineKeyboard([]).reply_markup
        })
      }

      const roleOptionsKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('Студент', callbackIdBuild('settings', [ 'role', 'student' ])),
          Markup.button.callback('Преподаватель', callbackIdBuild('settings', [ 'role', 'teacher' ])),
        ]
      ])

      return await ctx.editMessageText('🤸 Выбери новую роль', {
        reply_markup: roleOptionsKeyboard.reply_markup
      })
    }
    case 'change_following': {
      ctx.user.state = UserState.AskingFollowingEntity
      await ctx.user.save()

      const isStudent = ctx.user.role !== UserRole.Teacher
      const askingText = isStudent
        ? 'Напиши номер группы'
        : 'Напиши инициалы преподавателя или их часть'

      return await ctx.editMessageText('🤺 ' + askingText, {
        reply_markup: Markup.inlineKeyboard([]).reply_markup
      })
    }
  }
})