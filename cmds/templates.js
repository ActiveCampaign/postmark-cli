exports.command = 'templates <push|pull> [options]'
exports.desc = 'Manage your templates'
exports.builder = (yargs) => {
  return yargs.commandDir('templates_cmds');
}
exports.handler = (argv) => {}
