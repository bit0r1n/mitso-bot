import { Composer } from 'telegraf'
import { SuperDuperUpgradedContext } from '../../../../utils'
import { groupWeekHandler } from './groupWeek'
import { selfWeekHandler } from './selfWeek'
import { teacherWeekHandler } from './teacherWeek'
import { weeksArchiveHandler } from './weeksArchive'

export const weeksHandler = new Composer<SuperDuperUpgradedContext>()

weeksHandler
  .use(selfWeekHandler)
  .use(groupWeekHandler)
  .use(teacherWeekHandler)
  .use(weeksArchiveHandler)