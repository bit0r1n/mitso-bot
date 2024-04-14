import * as mongoose from 'mongoose'

export enum UserState {
  MainMenu,
  AskingGroup,
  AskingWeekTeacher,
  AskingWeekGroup,
  ChoosingGroup,
  ChoosingRole,
  AskingTeacherProfile
}

export enum UserRole {
  Student,
  Teacher
}

interface IGroup {
  id: string
  display: string
}

export interface IUser {
  telegramId: number
  username: string
  state: UserState
  role?: UserRole
  choosing_groups?: IGroup[]
  group?: IGroup
  blacklisted?: boolean
}

const userSchema = new mongoose.Schema<IUser>({
  telegramId: { type: Number, required: true },
  username: String,
  state: { type: Number, required: true, default: UserState.ChoosingRole },
  choosing_groups: [ { id: String, display: String } ],
  group: { id: String, display: String },
  blacklisted: Boolean,
  role: Number
})

export const User = mongoose.model('User', userSchema)
export const UserSchema = userSchema