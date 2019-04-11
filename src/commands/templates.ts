const namespace = 'templates'

export const command = `${namespace} <command> [options]`
export const desc = 'Manage your templates'
export const builder = (yargs: any) => {
  return yargs.commandDir(`${namespace}`)
}
