import { MiddlewareFn, NarrowedContext } from 'telegraf'
import { MountMap } from 'telegraf/typings/telegram-types'
import { SuperDuperUpgradedContext } from './context'
import { Triggers } from 'telegraf/typings/composer'
import { Keeper } from '../keeper/api'
import { Parser } from '../parser/api'

interface CommandContextExtn {
  command: string
  payload: string
  args: string[]
}

export type CommandMiddleware = MiddlewareFn<NarrowedContext<SuperDuperUpgradedContext, MountMap['text']>>
export type CommandContext = Parameters<CommandMiddleware>[0]
export type SlashCommandContext = CommandContext & CommandContextExtn

export type ActionMiddleware = MiddlewareFn<NarrowedContext<SuperDuperUpgradedContext, MountMap['callback_query']>>
export type ActionContext = Parameters<ActionMiddleware>[0]

export interface CommandUtils {
  keeper: Keeper
  parser: Parser
}

export interface CommandEntity {
  triggers: Triggers<NarrowedContext<SuperDuperUpgradedContext, MountMap['text']>>
  execute: CommandMiddleware
  utils: CommandUtils
}

export abstract class AbstractHearsCommand implements CommandEntity {
  triggers: CommandEntity['triggers']
  utils: CommandUtils
  constructor(triggers: CommandEntity['triggers'], utils: CommandUtils) {
    this.triggers = triggers
    this.utils = utils
  }

  execute(ctx: CommandContext): Promise<unknown> | void {} // eslint-disable-line @typescript-eslint/no-unused-vars
}

export abstract class AbstractSlashCommand extends AbstractHearsCommand {
  execute(ctx: SlashCommandContext): Promise<unknown> | void {} // eslint-disable-line @typescript-eslint/no-unused-vars
}