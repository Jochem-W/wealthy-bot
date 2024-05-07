/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */

export function* chunks<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

export function remove<T>(
  array: T[],
  predicate: (value: T, index: number, obj: T[]) => unknown,
) {
  const index = array.findIndex(predicate)
  const element = array[index]
  if (element === undefined) {
    return null
  }

  array.splice(index, 1)
  return element
}
