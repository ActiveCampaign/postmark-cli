const postmark = require('postmark')
const chalk = require('chalk')
const util = require('util')
const spinner = require('../../utils/spinner')

exports.command = 'list [options]'
exports.desc = 'List the servers on your account'
exports.builder = {
  'account-token': {
    type: 'string',
    describe: '',
    alias: ['a'],
    required: true,
  },
  count: {
    type: 'integer',
    describe: 'Number of servers to return',
    alias: ['c'],
  },
  offset: {
    type: 'integer',
    describe: 'Number of servers to skip',
    alias: ['o'],
  },
  name: {
    type: 'string',
    describe: 'Filter servers by name',
    alias: ['n'],
  },
}
exports.handler = argv => {
  spinner.setSpinnerTitle(chalk.gray('%s Fetching your servers...'))
  spinner.start()

  const account = new postmark.AccountClient(argv.accountToken)

  let options = {
    ...(argv.count && { count: argv.count }),
    ...(argv.offset && { offset: argv.offset }),
    ...(argv.name && { name: argv.name }),
  }

  account
    .getServers(options)
    .then(response => {
      spinner.stop(true)
      console.log(JSON.stringify(response, null, 2))
    })
    .catch(error => {
      spinner.stop(true)
      console.log(chalk.red(JSON.stringify(error)))
    })
}
