const namespace = 'servers'

exports.command = `${namespace} <list> [options]`
exports.desc = 'Manage servers on your account'
exports.builder = yargs => {
  return yargs.commandDir(`${namespace}_cmds`)
}
exports.handler = argv => {}
