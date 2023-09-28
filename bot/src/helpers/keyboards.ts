import { InlineKeyboardButton } from 'telegraf/types'
import { UserState } from '../schemas/User'
import { Markup } from 'telegraf'

export const CallbackIdSplitter = ':'

export const keyboards = {
  [UserState.AskingGroup]: Markup.keyboard([ [] ]),
  [UserState.ChoosingGroup]: Markup.keyboard([ [ Markup.button.text('Отмена') ] ]),
  [UserState.AskingWeekTeacher]: Markup.keyboard([ [ Markup.button.text('Отмена') ] ]),
  [UserState.AskingWeekGroup]: Markup.keyboard([ [ Markup.button.text('Отмена') ] ]),
  [UserState.MainMenu]: Markup.keyboard([
    [ Markup.button.text('Сегодня'), Markup.button.text('Завтра'), Markup.button.text('Неделя') ],
    [ Markup.button.text('Другие расписания'), Markup.button.text('Сменить группу') ]
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

export const callbackIdBuild = (command: string, args?: string[]): string => {
  return [ command, ...(args || []) ].join(CallbackIdSplitter)
}

export const dateToCallback = (date: Date): string =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate()}`