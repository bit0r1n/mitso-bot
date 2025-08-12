type
  GroupNotFound* = object of CatchableError
  WeekNotFound* = object of CatchableError
  FailedToParseWeek* = object of CatchableError
  IndexingGroupsConflict* = object of CatchableError
