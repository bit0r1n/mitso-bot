import { CancelCommand } from './cancel'
import { SettingsCommand } from './settings'
import { DayScheduleCommand } from './daySchedule'
import { OtherSchedulesCommand } from './otherSchedules'
import { WeekScheduleCommand } from './weekSchedule'

export default {
  DayScheduleCommand,
  WeekScheduleCommand,
  OtherSchedulesCommand,

  SettingsCommand,

  CancelCommand
}

export const hearsCommands = [
  DayScheduleCommand,
  WeekScheduleCommand,
  OtherSchedulesCommand,

  SettingsCommand,

  CancelCommand
]