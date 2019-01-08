const postmark = require('postmark')
const chalk = require('chalk')
const spinner = require('../../utils/spinner')

exports.command = 'template [options]'
exports.desc = 'Send an email with a template'
exports.builder = {
  'source-server': {
    type: 'string',
    describe: 'Server from which to send the email from',
    alias: ['s'],
    required: true,
  },
  id: {
    type: 'string',
    describe: 'Template ID',
    alias: ['i'],
  },
  alias: {
    type: 'string',
    describe: 'Template Alias',
    alias: ['a'],
  },
  from: {
    type: 'string',
    describe:
      'Email address you are sending from. Must be an address on a verified domain or confirmed Sender Signature.',
    alias: ['f'],
    required: true,
  },
  to: {
    type: 'string',
    describe: 'Email address you are sending to',
    alias: ['t'],
    required: true,
  },
  model: {
    type: 'string',
    describe: '',
    alias: ['m'],
  },
}
exports.handler = argv => {
  spinner.setSpinnerTitle(chalk.gray('%s Sending an email...'))
  spinner.start()

  const sourceServer = postmark(argv.sourceServer)
  sourceServer
    .sendEmailWithTemplate({
      TemplateId: argv.id ? argv.id : undefined,
      TemplateAlias: argv.alias ? argv.alias : undefined,
      From: argv.from,
      To: argv.to,
      TemplateModel: argv.model ? JSON.parse(argv.model) : undefined,
    })
    .then(response => {
      spinner.stop(true)
      console.log(chalk.green(JSON.stringify(response)))
    })
    .catch(error => {
      spinner.stop(true)
      console.error(chalk.red(JSON.stringify(error)))
    })
}
