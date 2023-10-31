import mitso/[typedefs, helpers]
import json, strutils, tables, sequtils, times, uri

proc `%`*(select: SelectOption): JsonNode =
  result = newJObject()
  result["id"] = %select.id
  result["display"] = %select.display

proc `%`*(group: Group): JsonNode =
  result = newJObject()
  result["id"] = %(%group.id)
  result["display"] = %(%group.display)
  result["course"] = %(%group.course)
  result["form"] = %(%group.form)
  result["faculty"] = %(%group.faculty)
  result["course_human"] = %($group.course)
  result["form_human"] = %($group.form)
  result["faculty_human"] = %($group.faculty)

proc `%`*(lesson: Lesson): JsonNode =
  result = newJObject()
  result["date"] = %($lesson.date)
  result["name"] = %lesson.name
  result["teachers"] = %lesson.teachers
  result["time"] = %lesson.lessonTime
  result["type"] = %lesson.lType
  result["classrooms"] = %lesson.classrooms

proc `%`*(day: ScheduleDay): JsonNode =
  result = newJObject()
  result["date"] = %($day.date)
  result["display_date"] = %day.displayDate
  result["day_of_week"] = %day.day
  result["lessons"] = %day.lessons

proc filterGroups*(groups: seq[Group], query: Table[string, string]): seq[Group] =
  result = groups
  for field, value in query:
    if field == "id":
      result = result.filterIt(it.id == value)
    elif field == "display":
      result = result.filterIt(it.display.contains(value))
    elif field == "course":
      result = result.filterIt(%it.course == value)
    elif field == "form":
      result = result.filterIt(%it.form == value)
    elif field == "faculty":
      result = result.filterIt(%it.faculty == value)

proc queryToTable*(query: string): Table[string, string] = toTable(toSeq(decodeQuery(query)))