let postmark = require('postmark')

exports.command = 'push-local [options]'
exports.desc = 'Push templates from your local file system to a Postmark server'
exports.builder = {
  'destination-server': {
    type: 'string',
    describe: '',
    alias: ['d'],
    required: true,
  },
}
exports.handler = argv => {
  console.log(argv.destinationServer)
}
