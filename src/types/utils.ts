export interface CommandOptions {
  name: string
  command: string
  desc: string
  builder: any
}

export interface CustomLogTypeDetails {
  color: 'green' | 'red' | 'blue' | 'yellow'
}

export enum LogTypes { Warning, Error, Info, Custom, Success }
