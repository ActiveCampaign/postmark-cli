import chalk from 'chalk'
import * as ora from 'ora'
import { prompt } from 'inquirer'
import { ServerClient } from 'postmark'
import { log } from '../../utils'

interface types {
  serverToken: string
  from: string
  to: string
  subject: string
  htmlbody: string
  textbody: string
}

export const command = 'raw [options]'
export const desc = 'Send a raw email'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
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
export const handler = (argv: types) => {
  if (!argv.serverToken) {
    prompt([
      {
        type: 'password',
        name: 'serverToken',
        message: 'Please enter your server token',
        mask: '•',
      },
    ]).then((answer: any) => {
      if (answer.serverToken) {
        execute(answer.serverToken, argv)
      } else {
        log('Invalid server token', { error: true })
      }
    })
  } else {
    execute(argv.serverToken, argv)
  }
}

/**
 * Execute the command
 */
const execute = (serverToken: string, args: types) => {
  const spinner = ora('Sending an email').start()
  const client = new ServerClient(serverToken)
  client
    .sendEmail({
      From: args.from,
      To: args.to,
      Subject: args.subject,
      HtmlBody: args.htmlbody ? args.htmlbody : undefined,
      TextBody: args.textbody ? args.textbody : undefined,
    })
    .then(response => {
      spinner.stop()
      log(JSON.stringify(response))
    })
    .catch(error => {
      spinner.stop()
      log(JSON.stringify(error), { error: true })
      log(error, { error: true })
    })
}
