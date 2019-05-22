export interface CommandOptions {
  name: string
  command: string
  desc: string
  builder: any
}

export interface LogSettings {
  error?: boolean
  warn?: boolean
  color?: 'green' | 'red' | 'blue' | 'yellow'
}
