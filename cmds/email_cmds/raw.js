const postmark = require('postmark')
const chalk = require('chalk')
const spinner = require('../../utils/spinner')

exports.command = 'raw [options]'
exports.desc = 'Send a raw email'
exports.builder = {
  'source-server': {
    type: 'string',
    describe: 'Server from which to send the email from',
    alias: ['s'],
    required: true,
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
  subject: {
    type: 'string',
    describe: 'The subject line of the email',
    required: true,
  },
  htmlbody: {
    type: 'string',
    describe: 'The HTML version of the email',
  },
  textbody: {
    type: 'string',
    describe: 'The text version of the email',
  },
}
exports.handler = argv => {
  spinner.setSpinnerTitle(chalk.gray('%s Sending an email...'))
  spinner.start()

  const sourceServer = postmark(argv.sourceServer)
  sourceServer
    .sendEmail({
      From: argv.from,
      To: argv.to,
      Subject: argv.subject,
      HtmlBody: argv.htmlbody ? argv.htmlbody : undefined,
      TextBody: argv.textbody ? argv.textbody : undefined,
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
