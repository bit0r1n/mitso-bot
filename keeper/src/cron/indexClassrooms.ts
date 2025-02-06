import { Lesson } from '../schemas/Lesson'
import { Classroom, ClassroomLocation } from '../schemas/Classroom'

interface LocationClassroomMap {
  _id: ClassroomLocation
  classrooms: string[]
}

export async function indexClassrooms() {
  const locationClassroomMap: LocationClassroomMap[] = await Lesson.aggregate([
    { $unwind: '$classrooms' },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $regexMatch: { input: '$classrooms', regex: 'чжф', options: 'i' } }, then: ClassroomLocation.Dormitory },
              { case: { $regexMatch: { input: '$classrooms', regex: 'БАЗ', options: 'i' } }, then: ClassroomLocation.OldBuilding },
              { case: { $regexMatch: { input: '$classrooms', regex: '^[0-9]+' } }, then: {
                $cond: {
                  if: {
                    $lt: [
                      { $toInt: { $getField: { field: 'match', input: { $regexFind: { input: '$classrooms', regex: '^[0-9]+' } } } } },
                      100
                    ]
                  },
                  then: ClassroomLocation.NewBuilding,
                  else: ClassroomLocation.OldBuilding
                }
              }
              }
            ],
            default: ClassroomLocation.Invalid
          }
        },
        classrooms: { $addToSet: '$classrooms' }
      }
    }
  ])

  await Classroom.deleteMany()

  for (const { _id: location, classrooms } of locationClassroomMap) {
    if (location === ClassroomLocation.Invalid) continue

    const classroomsToInsert = classrooms.map(c => new Classroom({
      name: c,
      location: location,
      floor: c.startsWith('БАЗ') ? 1 : parseInt(c[0]),
      is_computer: c.includes('(к)')
    }))

    await Classroom.insertMany(classroomsToInsert)
  }
}