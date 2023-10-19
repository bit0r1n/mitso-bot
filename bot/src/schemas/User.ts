import * as mongoose from 'mongoose'

export enum UserState {
  MainMenu,
  AskingGroup,
  AskingWeekTeacher,
  AskingWeekGroup,
  ChoosingGroup
}

interface IGroup {
  id: string
  display: string
}

export interface IUser {
  telegramId: number
  username: string
  state: UserState
  choosing_groups?: IGroup[]
  group?: IGroup
  blacklisted?: boolean
}

const userSchema = new mongoose.Schema<IUser>({
  telegramId: { type: Number, required: true },
  username: String,
  state: { type: Number, required: true },
  choosing_groups: [ { id: String, display: String } ],
  group: { id: String, display: String },
  blacklisted: Boolean
})

export const User = mongoose.model('User', userSchema)
export const UserSchema = userSchema