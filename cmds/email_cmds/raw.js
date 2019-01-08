const postmark = require('postmark')

exports.command = 'raw [options]'
exports.desc = 'Send a raw email'
exports.builder = {
  'source-server': {
    type: 'string',
    describe: '',
    alias: ['s'],
    required: true,
  },
}
exports.handler = argv => {
  console.log(argv.sourceServer)
}
