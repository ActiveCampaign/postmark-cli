import { Argv } from 'yargs'
import chalk from 'chalk'
import { prompt } from 'inquirer'
import { CommandOptions, LogSettings } from './types/'
import ora = require('ora')

/**
 * Bootstrap commands
 * @returns yargs compatible command options
 */
export function cmd(name: string, desc: string): CommandOptions {
  return ({
    name: name,
    command: `${name} <command> [options]`,
    desc: desc,
    builder: (yargs: Argv) => yargs.commandDir(`commands/${name}`),
  })
}

/**
 * Pluralize a string
 * @returns The proper string depending on the count
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return (count > 1 || count === 0 ? plural : singular)
}

/**
 * Log stuff to the console
 * @returns Logging with fancy colors
 */
export function log(text: string, settings?: LogSettings): void {
  // Errors
  if (settings && settings.error) {
    return console.error(chalk.red(text))
  }

  // Warnings
  if (settings && settings.warn) {
    return console.warn(chalk.yellow(text))
  }

  // Custom colors
  if (settings && settings.color) {
    return console.log(chalk[settings.color](text))
  }

  // Default
  return console.log(text)
}

export function logError(error: unknown): void {
  log(extractErrorMessage(error), { error: true })
} 

export function fatalError(error: unknown): never {
  logError(error)
  return process.exit(1)
}

/**
 * Prompt for server or account tokens
 */
async function serverTokenPrompt(forAccount: boolean): Promise<string> {
  const tokenType = forAccount ? 'account' : 'server'
  const { token } = await prompt<{token: string}>([{
      type: 'password',
      name: 'token',
      message: `Please enter your ${tokenType} token`,
      mask: '•',
    }]
  )

  if (!token) {
    return fatalError(`Invalid ${tokenType} token`)
  }

  return token
}

/**
 * Validates the presence of a server or account token
 */
export async function validateToken(token: string, forAccount = false): Promise<string> {
  if (!token) {
    return serverTokenPrompt(forAccount)
  }

  return token
}


/**
 * Handle starting/stopping spinner and console output
 */
export class CommandResponse {
  private spinner: ora.Ora

  public constructor() {
    this.spinner = ora().clear()
  }

  public initResponse(message: string) {
    this.spinner = ora(message).start()
  }

  public response(text: string, settings?: LogSettings): void {
    this.spinner.stop()
    log(text, settings)
  }

  public errorResponse(error: unknown): never {
    this.spinner.stop()

    return fatalError(error)
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.toString()
  }

  if (typeof error === 'string') {
    return error
  }

  return `Unknown error: ${error}`
}
