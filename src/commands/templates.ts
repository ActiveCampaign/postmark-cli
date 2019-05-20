import { Argv } from 'yargs'

const namespace = 'templates'

export const command = `${namespace} <command> [options]`
export const desc = 'Manage your templates'
export const builder = (yargs: Argv) => {
  return yargs.commandDir(`${namespace}`)
}
