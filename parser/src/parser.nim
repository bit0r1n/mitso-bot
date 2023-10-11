import strutils, asyncdispatch, asynchttpserver, json, tables, uri, sequtils, options
import mitso/[parser, helpers, typedefs]
import jester
import helpers, errors

var mitsoParser {.threadvar.}: Site

router parserRouter:
  get "/":
    resp(
      Http200,
      $(%*{ "result": "OK" }),
      "application/json; charset=utf-8"
    )
  get "/groups":
    let groups: seq[Group] = filterGroups(
      mitsoParser.groups,
      toTable(toSeq(decodeQuery(request.query)))
    )
    resp(
      Http200,
      $(%*{ "result": %groups }),
      "application/json; charset=utf-8"
    )
  get "/groups/@id":
    let id = decodeUrl(@"id")
    if mitsoParser.groups.filterIt(it.id == id).len == 0:
      raise newException(GroupNotFound, "Group not found")
    resp(
      Http200,
      $(%*{ "result": %mitsoParser.groups.filterIt(it.id == id)[0] }),
      "application/json; charset=utf-8"
    )
  get "/groups/@id/weeks":
    let id = decodeUrl(@"id")
    if mitsoParser.groups.filterIt(it.id == id).len == 0:
      raise newException(GroupNotFound, "Group not found")

    let
      group = mitsoParser.groups.filterIt(it.id == id)[0]
      weeks = await group.getWeeks()

    resp(
      Http200,
      $(%*{ "result": %weeks }),
      "application/json; charset=utf-8"
    )
  get "/groups/@id/weeks/@week":
    let id = decodeUrl(@"id")
    if mitsoParser.groups.filterIt(it.id == id).len == 0:
      raise newException(GroupNotFound, "Group not found")

    let
      group = mitsoParser.groups.filterIt(it.id == id)[0]
      weeks = await group.getWeeks()

    if weeks.filterIt(it.id == @"week").len == 0:
      raise newException(WeekNotFound, "Week not found")

    try:
      let schedule = await group.getSchedule(@"week")

      resp(
        Http200,
        $(%*{ "result": %schedule }),
        "application/json; charset=utf-8"
      )
    except:
      raise newException(FailedToParseWeek, "Failed to parse week")
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
  error Http404:
    resp(
      Http404,
      $(%*{ "error": "Not found" }),
      "application/json; charset=utf-8"
    )

proc main() {.async.} =
  mitsoParser = newSite()
  echo "Loading groups..."
  discard await mitsoParser.loadGroups()

  let s = newSettings(
    Port(3000)
  )

  var jest = initJester(parserRouter, s)
  jest.serve()

waitFor main()