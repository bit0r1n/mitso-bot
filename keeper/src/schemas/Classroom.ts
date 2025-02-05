import * as mongoose from 'mongoose'

export enum ClassroomLocation {
  Invalid = -1,
  NewBuilding = 0,
  OldBuilding,
  Dormitory
}

export interface IClassroom {
  name: string
  location: ClassroomLocation
  floor: number
  is_computer: boolean
}

const classroomSchema = new mongoose.Schema<IClassroom>({
  name: String,
  location: Number,
  floor: Number,
  is_computer: Boolean
})

export const Classroom = mongoose.model<IClassroom>('Classroom', classroomSchema)