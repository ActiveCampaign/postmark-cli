import { Argv } from 'yargs'

const namespace = 'email'

export const command = `${namespace} <command> [options]`
export const desc = 'Send an email'
export const builder = (yargs: Argv) => {
  return yargs.commandDir(`${namespace}`)
}
