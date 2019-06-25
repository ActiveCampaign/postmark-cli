import { Argv } from 'yargs'
import chalk from 'chalk'
import { prompt } from 'inquirer'
import { CommandOptions, LogSettings } from './types/'
import { Ora } from 'ora'
import ora = require('ora')

/**
 * Bootstrap commands
 * @returns yargs compatible command options
 */
export const cmd = (name: string, desc: string): CommandOptions => ({
  name: name,
  command: `${name} <command> [options]`,
  desc: desc,
  builder: (yargs: Argv) => yargs.commandDir(`commands/${name}`),
})

/**
 * Pluralize a string
 * @returns The proper string depending on the count
 */
export const pluralize = (
  count: number,
  singular: string,
  plural: string
): string => (count > 1 || count === 0 ? plural : singular)

/**
 * Log stuff to the console
 * @returns Logging with fancy colors
 */
export const log = (text: string, settings?: LogSettings): void => {
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

/**
 * Prompt for server or account tokens
 * @returns Promise
 */
export const serverTokenPrompt = (account: boolean): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const tokenType = account ? 'account' : 'server'

    prompt([
      {
        type: 'password',
        name: 'token',
        message: `Please enter your ${tokenType} token`,
        mask: '•',
      },
    ]).then((answer: any) => {
      const { token } = answer

      if (!token) {
        log(`Invalid ${tokenType} token`, { error: true })
        process.exit(1)
        return reject()
      }

      return resolve(token)
    })
  })

/**
 * Validates the presence of a server or account token
 * @return Promise
 */
export const validateToken = (
  token: string,
  account: boolean = false
): Promise<string> =>
  new Promise<string>(resolve => {
    // Missing token
    if (!token) {
      return serverTokenPrompt(account).then(tokenPrompt =>
        resolve(tokenPrompt)
      )
    }

    return resolve(token)
  })

/**
 * Handle starting/stopping spinner and console output
 */
export class CommandResponse {
  private spinner: Ora

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

  public errorResponse(error: any, showJsonError: boolean = false): void {
    this.spinner.stop()
    if (showJsonError === true) {
      log(JSON.stringify(error), { error: true })
    }

    log(error, { error: true })
    process.exit(1)
  }
}
