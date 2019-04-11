import { Argv } from 'yargs'

const namespace = 'servers'

export const command = `${namespace} <command> [options]`
export const desc = 'Manage your servers'
export const builder = (yargs: Argv) => {
  return yargs.commandDir(`${namespace}`)
}
