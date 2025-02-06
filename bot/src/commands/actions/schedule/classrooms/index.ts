import { Composer } from 'telegraf'
import { SuperDuperUpgradedContext } from '../../../../utils'
import { classroomScheduleHandler } from './classroomSchedule'

export const classroomScheduleMasterHandler = new Composer<SuperDuperUpgradedContext>()

classroomScheduleMasterHandler
  .use(classroomScheduleHandler)