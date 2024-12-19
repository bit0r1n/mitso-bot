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

export enum UserRole {
  Student,
  Teacher
}

export interface IUser {
  telegramId: number
  username: string
  state: UserState
  role?: UserRole

  choosing_groups?: IGroup[]
  group?: IGroup

  choosing_teachers?: string[]
  teacher_name?: string

  blacklisted?: boolean
}

const userSchema = new mongoose.Schema<IUser>({
  telegramId: { type: Number, required: true },
  username: String,
  state: { type: Number, required: true },
  role: Number,

  choosing_groups: [ { id: String, display: String } ],
  group: { id: String, display: String },

  choosing_teachers: [ String ],
  teacher_name: String,

  blacklisted: Boolean
})

export const User = mongoose.model('User', userSchema)
export const UserSchema = userSchema