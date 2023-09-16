import * as mongoose from 'mongoose'

export enum UserState {
  MainMenu,
  AskingGroup,
  AskingWeekTeacher,
  AskingWeekGroup,
  ChoosingGroup
}

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  username: String,
  state: { type: Number, required: true },
  choosing_groups: [ { id: String, display: String } ],
  group: { id: String, display: String },
  blacklisted: Boolean
})

export type User = mongoose.InferSchemaType<typeof userSchema>
export const User = mongoose.model('User', userSchema)
export const UserSchema = userSchema