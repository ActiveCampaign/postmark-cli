const namespace = 'email'

export const command = `${namespace} <command> [options]`
export const desc = 'Send an email'
export const builder = (yargs: any) => {
  return yargs.commandDir(`${namespace}`)
}
