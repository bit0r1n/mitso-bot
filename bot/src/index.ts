import { session, Telegraf } from 'telegraf'
import * as mongoose from 'mongoose'
import { CommandUtils, createSecret, SuperDuperUpgradedContext } from './utils'
import { User, UserState } from './schemas/User'
import { Parser } from './parser'
import { Keeper } from './keeper'
import { hearsCommands } from './commands/hears'
import { slashCommands } from './commands/slash'
import { classroomScheduleMasterHandler, weeksHandler } from './commands/actions/schedule'
import { settingsHandler } from './commands/actions/settings'
import { chatHandler } from './commands/chatHandler'

[ 'BOT_TOKEN', 'MONGO_URL', 'PARSER_URL', 'KEEPER_URL' ].every(key => {
  if (!process.env[key])
    throw new Error(`${key} is not set`)
})

await mongoose.connect(process.env.MONGO_URL!)

const bot = new Telegraf<SuperDuperUpgradedContext>(process.env.BOT_TOKEN!)
const parser = new Parser(process.env.PARSER_URL!)
const keeper = new Keeper(process.env.KEEPER_URL!)

const commandUtilsObject: CommandUtils = {
  parser,
  keeper
}
const registeredHearsCommands = hearsCommands.map((c) => new c(commandUtilsObject))
const registeredSlashCommands = slashCommands.map((c) => new c(commandUtilsObject))

bot.use(session())

bot.use(async (ctx, next) => {
  if (!ctx.from) return

  const chatId = ctx.from.id
  let user = await User.findOne({ telegramId: chatId })

  if (!user) {
    user = await User.create({
      telegramId: chatId,
      username: ctx.from.username,
      state: UserState.AskingFollowingEntity
    })
    ctx.newUser = true
  }

  ctx.user = user

  if (ctx.user.username !== ctx.from.username) {
    ctx.user.username = ctx.from.username!
    await ctx.user.save()
  }

  if (ctx.user.blacklisted === true) return

  return next()
})

for (const command of registeredSlashCommands) {
  bot.command(command.triggers, command.execute.bind(command))
}

for (const command of registeredHearsCommands) {
  console.log('Registering HEARS with "%s" triggers', command.triggers)
  bot.hears(command.triggers, command.execute.bind(command))
}

bot
  .use(weeksHandler)
  .use(classroomScheduleMasterHandler)
  .use(settingsHandler)
  .use(chatHandler)

process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

bot.catch((err) => console.error(err))

if (process.env.WEBHOOK_DOMAIN?.length) {
  const secretToken = process.env.WEBHOOK_SECRET?.length ? process.env.WEBHOOK_SECRET : createSecret()
  const webhookDomain = process.env.WEBHOOK_DOMAIN!
  const webhookPath = process.env.WEBHOOK_PATH?.length
    ? process.env.WEBHOOK_PATH
    :`/telegraf/${bot.secretPathComponent()}`
  const webhookServerPort = process.env.WEBHOOK_SERVER_PORT?.length
    ? parseInt(process.env.WEBHOOK_SERVER_PORT)
    : 3000

  console.log(
    'Startin bot in WEBHOOK MODE, startin server %s, Telegram will know as %s',
    `http://localhost:${webhookServerPort}${webhookPath}`,
    `${webhookDomain}${webhookPath}`
  )

  await bot.launch({
    webhook: {
      domain: webhookDomain,
      port: webhookServerPort,
      hookPath: webhookPath,
      secretToken
    }
  })
} else {
  console.log('Startin bot in POLLING MODE')
  await bot.launch()
}
