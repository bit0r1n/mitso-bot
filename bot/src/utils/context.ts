import { Context } from 'telegraf'
import { IUser } from '../schemas/User'
import { HydratedDocument } from 'mongoose'

export interface SuperDuperUpgradedContext extends Context {
  newUser: boolean
  user: HydratedDocument<IUser>
}