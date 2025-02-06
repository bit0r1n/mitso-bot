import { Context } from 'telegraf'
import { IUser } from '../schemas/User'
import { HydratedDocument } from 'mongoose'

export interface ClassroomSearchSession {
  locationIndex: number
  timeIndex: number
  onlyComputer: boolean
}

export interface ContextSession {
  classroomSearch?: ClassroomSearchSession
}

export interface SuperDuperUpgradedContext extends Context {
  newUser: boolean
  user: HydratedDocument<IUser>

  session?: ContextSession
}