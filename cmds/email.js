const namespace = 'email'

exports.command = `${namespace} <command> [options]`
exports.desc = 'Send an email'
exports.builder = yargs => {
  return yargs.commandDir(`${namespace}_cmds`)
}
exports.handler = argv => {}
