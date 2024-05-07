/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */

const maximumTimeout = 2 ** 31 - 1

export class LongTimeout {
  private callback: () => void
  private ms: number
  private timeout?: NodeJS.Timeout

  public constructor(callback: () => void, ms: number) {
    this.callback = callback
    this.ms = ms

    if (this.ms <= 0) {
      this.callback()
      return
    }

    this.setTimeout()
  }

  private setTimeout() {
    if (this.ms > maximumTimeout) {
      this.timeout = setTimeout(() => {
        this.ms -= maximumTimeout
        this.setTimeout()
      }, maximumTimeout)
      return
    }

    this.timeout = setTimeout(this.callback, this.ms)
  }

  public clear() {
    clearTimeout(this.timeout)

    this.callback = () => undefined
  }
}
