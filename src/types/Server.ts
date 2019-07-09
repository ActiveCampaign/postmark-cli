export interface Arguments {}

export interface ServerListArguments extends Arguments{
  accountToken: string
  count: number
  offset: number
  name: string
  json: boolean
  showTokens: boolean
}

export interface ColorMap {
  [key: string]: string
}
