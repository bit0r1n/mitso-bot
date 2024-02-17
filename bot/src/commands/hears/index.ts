import { CancelCommand } from './cancel'
import { ChangeGroupCommand } from './changeGroup'
import { DayScheduleCommand } from './daySchedule'
import { OtherSchedulesCommand } from './otherSchedules'
import { WeekScheduleCommand } from './weekSchedule'

export default {
  DayScheduleCommand,
  WeekScheduleCommand,
  OtherSchedulesCommand,

  ChangeGroupCommand,

  CancelCommand
}

export const hearsCommands = [
  DayScheduleCommand,
  WeekScheduleCommand,
  OtherSchedulesCommand,

  ChangeGroupCommand,

  CancelCommand
]