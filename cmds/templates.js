const namespace = 'templates'

exports.command = `${namespace} <command> [options]`
exports.desc = 'Manage your templates'
exports.builder = yargs => {
  return yargs.commandDir(`${namespace}_cmds`)
}
exports.handler = argv => {}
