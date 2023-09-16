import { join } from 'path'

export class BaseApi {
  private readonly url: string

  constructor(url: string) {
    this.url = url
  }

  protected async request<R = any>(path: string, options?: URLSearchParams): Promise<R> {
    const url = new URL(join(this.url, path))
    if (options) {
      url.search = options.toString()
    }
    const request = await fetch(url)
    const response = await request.json()

    if (response.error) {
      throw new Error(response.error)
    }

    return response.result as R
  }
}