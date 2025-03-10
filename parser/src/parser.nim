import strutils, asyncdispatch, asynchttpserver, json, tables, uri, sequtils, options
import mitso/[ wrapper, typedefs ]
import jester
import helpers, errors

var
  mitsoWrapper {.threadvar.}: MitsoWrapper
  fetchedGroups {.threadvar.}: seq[Group]

router parserRouter:
  get "/":
    resp(
      Http200,
      $(%*{ "result": "OK" }),
      "application/json; charset=utf-8"
    )
  get "/groups":
    var groups: seq[Group] = filterGroups(
      fetchedGroups,
      toTable(toSeq(decodeQuery(request.query)))
    )
    resp(
      Http200,
      $(%*{ "result": %groups }),
      "application/json; charset=utf-8"
    )
  get "/groups/@id":
    var
      id = decodeUrl(@"id")
      filteredGroups = filterGroups(
        fetchedGroups,
        toTable(toSeq(decodeQuery(request.query)))
      ).filterIt(it.id == id)

    if filteredGroups.len == 0:
      raise newException(GroupNotFound, "Group not found")

    let group = filteredGroups[0]
    filteredGroups.setLen(0)
    resp(
      Http200,
      $(%*{ "result": %group }),
      "application/json; charset=utf-8"
    )
  get "/groups/@id/schedule":
    var
      id = decodeUrl(@"id")
      filteredGroups = filterGroups(
        fetchedGroups,
        toTable(toSeq(decodeQuery(request.query)))
      ).filterIt(it.id == id)

    if filteredGroups.len == 0:
      raise newException(GroupNotFound, "Group not found")

    var group = filteredGroups[0]
    filteredGroups.setLen(0)

    var schedule = await mitsoWrapper.getSchedule(group)
    resp(
        Http200,
        $(%*{ "result": %schedule }),
        "application/json; charset=utf-8"
      )
  error GroupNotFound:
    resp(
      Http404,
      $(%*{ "error": "Group not found" }),
      "application/json; charset=utf-8"
    )
  error WeekNotFound:
    resp(
      Http404,
      $(%*{ "error": "Week not found" }),
      "application/json; charset=utf-8"
    )
  error FailedToParseWeek:
    resp(
      Http500,
      $(%*{ "error": "Failed to parse week" }),
      "application/json; charset=utf-8"
    )
  # error ScheduleServiceError:
  #   resp(
  #     Http500,
  #     $(%*{ "error": "Schedule service returned an unexpected result" }),
  #     "application/json; charset=utf-8"
  #   )
  error Http404:
    resp(
      Http404,
      $(%*{ "error": "Not found" }),
      "application/json; charset=utf-8"
    )

proc main() {.async.} =
  mitsoWrapper = newMitsoWrapper()
  echo "Loading groups..."
  fetchedGroups = await mitsoWrapper.getAllGroups()

  let s = newSettings(
    Port(3000)
  )

  var jest = initJester(parserRouter, s)
  jest.serve()

waitFor main()