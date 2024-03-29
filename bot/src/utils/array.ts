export const batchArray = <T>(arr: T[], size: number): T[][] =>
  arr.length > size
    ? [ arr.slice(0, size), ...batchArray(arr.slice(size), size) ]
    : [ arr ]