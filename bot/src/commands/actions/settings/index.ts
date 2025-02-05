import { Composer } from 'telegraf'
import { SuperDuperUpgradedContext } from '../../../utils'
import { selectEntityHandler } from './selectEntity'
import { settingsMenuHandler } from './settingsMenu'

export const settingsHandler = new Composer<SuperDuperUpgradedContext>()

settingsHandler
  .use(selectEntityHandler)
  .use(settingsMenuHandler)