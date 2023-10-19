import * as mongoose from 'mongoose'

export interface ITeacher {
  name: string
}

const teacherSchema = new mongoose.Schema<ITeacher>({
  name: { type: String, required: true, unique: true }
})

export const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema)