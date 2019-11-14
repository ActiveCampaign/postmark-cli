export interface ServerListArguments {
  accountToken: string
  requestHost: string
  count: number
  offset: number
  name: string
  json: boolean
  showTokens: boolean
}

export interface ColorMap {
  [key: string]: string
}
