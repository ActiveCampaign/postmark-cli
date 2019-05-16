import * as ora from 'ora'
import { prompt } from 'inquirer'
import { ServerClient } from 'postmark'
import { log } from '../../utils'

interface Types {
  serverToken: string
  id: number
  alias: string
  from: string
  to: string
  model: string
}

export const command = 'template [options]'
export const desc = 'Send a templated email'
export const builder = {
  'source-server': {
    type: 'string',
    hidden: true,
  },
  id: {
    type: 'string',
    describe: 'Template ID. Required if a template alias is not specified.',
    alias: ['i'],
  },
  alias: {
    type: 'string',
    describe: 'Template Alias. Required if a template ID is not specified.',
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
export const handler = (argv: Types) => {
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
const execute = (serverToken: string, args: Types) => {
  if (!hasIdOrAlias(args))
    return log('--id or --alias required', { color: 'green' })

  const spinner = ora('Sending an email').start()
  const client = new ServerClient(serverToken)

  client
    .sendEmailWithTemplate({
      TemplateId: args.id ? args.id : undefined,
      TemplateAlias: args.alias ? args.alias : undefined,
      From: args.from,
      To: args.to,
      TemplateModel: args.model ? JSON.parse(args.model) : undefined,
    })
    .then((response: any) => {
      spinner.stop()
      log(JSON.stringify(response))
    })
    .catch((error: any) => {
      spinner.stop()
      log(JSON.stringify(error), { error: true })
      log(error, { error: true })
    })
}

const hasIdOrAlias = (args: Types) => {
  return args.id || args.alias
}
