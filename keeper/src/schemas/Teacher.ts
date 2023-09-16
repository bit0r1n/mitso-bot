import * as mongoose from 'mongoose'

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true }
})

export type Teacher = mongoose.InferSchemaType<typeof teacherSchema>
export const Teacher = mongoose.model('Teacher', teacherSchema)
export const TeacherSchema = teacherSchema