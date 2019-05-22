interface EmailArguments {
  serverToken: string
  from: string
  to: string
}

export interface RawEmailArguments extends EmailArguments{
  subject: string
  html: string
  text: string
}

export interface TemplatedEmailArguments extends EmailArguments {
  id: number
  alias: string
  model: string
}