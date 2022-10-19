import axios, {AxiosError, AxiosInstance} from 'axios'
import FormData from 'form-data'
import {ReadStream} from 'fs'

export class SlackWebApi {
  private readonly client: AxiosInstance
  private readonly userToken: string

  public constructor({ workspaceName, userToken, cookieToken }: SlackWebApiOptions) {
    this.userToken = userToken
    this.client = axios.create({
      baseURL: `https://${workspaceName}.slack.com/api`,
      headers: { cookie: `d=${cookieToken};` },
    })
  }

  public async removeEmoji(name: string): Promise<void> {
    const formData = new FormData()
    formData.append('name', name)

    await this.request<ApiResponse>('emoji.remove', formData)
  }

  public async addEmoji({ name, image }: AddEmojiOptions): Promise<void> {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('mode', 'data')
    formData.append('image', image)

    await this.request<ApiResponse>('emoji.add', formData)
  }

  public async getEmojiInfo(name: string): Promise<EmojiInfoResult> {
    const formData = new FormData()
    formData.append('name', name)

    return this.request<EmojiInfoResult>('emoji.getInfo', formData)
  }

  public async getEmojiList({
    queries = [],
    sortBy = SortBy.createdAt,
    sortDirection = SortDirection.descending,
    page = 1,
    limit = 100,
  }: GetEmojiListOptions = {}): Promise<EmojiListResult> {
    const formData = new FormData()
    formData.append('queries', JSON.stringify(queries))
    formData.append('sort_by', sortBy)
    formData.append('sort_dir', sortDirection)
    formData.append('page', page)
    formData.append('count', limit)

    return this.request<EmojiListResult>('emoji.adminList', formData)
  }

  private async request<T extends ApiResponse>(route: string, formData: FormData): Promise<T> {
    formData.append('token', this.userToken)
    try {
      const { data } = await this.client.post<T>(route, formData)
      if (data.error !== undefined) {
        throw new Error(data.error)
      }
      if (!data.ok) {
        throw new Error(`Request failed, got ${JSON.stringify(data)}`)
      }

      return data
    } catch (error: AxiosError | any) {
      if (error?.response?.data?.error) {
        throw new AggregateError([error], error.response.data.error)
      }

      throw error
    }
  }
}

interface SlackWebApiOptions {
  workspaceName: string
  // Token extracted from an authenticated page using `boot_data.api_token` in the browser dev console. Starts with `xoxc-`.
  userToken: string
  // Token extracted from the cookie store with name `d`. Starts with `xoxd-`.
  cookieToken: string
}

interface AddEmojiOptions {
  name: string
  image: ReadStream
}

interface EmojiInfoResult extends ApiResponse {
  name: string
  is_alias: number
  alias_for: string
  url: string
  team_id: string
  user_id: string
  user_display_name: string
  can_delete: boolean
}

interface GetEmojiListOptions {
  queries?: string[]
  sortBy?: SortBy
  sortDirection?: SortDirection
  page?: number
  limit?: number
}

export enum SortBy {
  name = 'name',
  createdAt = 'created',
}

export enum SortDirection {
  ascending = 'asc',
  descending = 'desc',
}

interface EmojiListResult extends ApiResponse {
  emoji: Emoji[]
  paging: {
    count: number
    total: number
    page: number
    pages: number
  }
}

interface Emoji {
  name: string
  is_alias: number
  alias_for: string
  url: string
  created: number
  team_id: string
  user_id: string
  user_display_name: string
  avatar_hash: string
  can_delete: boolean
  is_bad: boolean
  synonyms: string[]
}

interface ApiResponse {
  ok: boolean
  error?: string
}
