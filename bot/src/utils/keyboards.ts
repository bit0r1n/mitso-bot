import { InlineKeyboardButton } from 'telegraf/types'
import { UserState } from '../schemas/User'
import { Markup } from 'telegraf'

export enum WeeksArchiveAction {
  GetLessons = 'gl',
  ShowPage = 'sp'
}

export enum WeeksArchiveType {
  Group = 'gp',
  Teacher = 'tc'
}

export enum ClassroomScheduleType {
  Default = 'def',
  Free = 'free'
}

export const CallbackIdSplitter = ':'

export const callbackIdBuild = (command: string, args?: string[]): string => {
  return [ command, ...(args || []) ].join(CallbackIdSplitter)
}

export const callbackIdParse = (str: string) => str.split(CallbackIdSplitter)

export const dateToCallback = (date: Date): string =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate()}`

export const replyKeyboards = {
  [UserState.AskingFollowingEntity]: Markup.keyboard([ [] ]),
  [UserState.ChoosingFollowingEntity]: Markup.keyboard([ [ Markup.button.text('Отмена') ] ]),
  [UserState.AskingWeekTeacher]: Markup.keyboard([ [ Markup.button.text('Отмена') ] ]),
  [UserState.AskingWeekGroup]: Markup.keyboard([ [ Markup.button.text('Отмена') ] ]),
  [UserState.MainMenu]: Markup.keyboard([
    [ Markup.button.text('Сегодня'), Markup.button.text('Завтра'), Markup.button.text('Неделя') ],
    [ Markup.button.text('Другие расписания'), Markup.button.text('Настройки') ]
  ])
}

export const inlineKeyboards = {
  chooseRole: Markup.inlineKeyboard([
    [
      Markup.button.callback('Студент', callbackIdBuild('settings', [ 'role', 'student' ])),
      Markup.button.callback('Преподаватель', callbackIdBuild('settings', [ 'role', 'teacher' ])),
    ]
  ]),
  otherSchedules: Markup.inlineKeyboard([
    [
      Markup.button.callback('Преподаватель', callbackIdBuild('teacher_week')),
      Markup.button.callback('Группа', callbackIdBuild('group_week')),
      Markup.button.callback('Аудитории', callbackIdBuild('classroom_schedule'))
    ]
  ]),
  classroomScheduleType: Markup.inlineKeyboard([
    [
      Markup.button.callback('Свободные аудитории', callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free ]))
    ]
  ])
}

export const batchButtons = (buttons: InlineKeyboardButton[], rowSize = 3, extraRows: InlineKeyboardButton[][] = []) => {
  const rows: InlineKeyboardButton[][] = []
  for (let i = 0; i < buttons.length; i += rowSize) {
    rows.push(buttons.slice(i, i + rowSize))
  }
  
  rows.push(...extraRows)

  return Markup.inlineKeyboard(rows)
}
