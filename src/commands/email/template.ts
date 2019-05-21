import ora from 'ora'
import { ServerClient } from 'postmark'
import { log, validateToken } from '../../utils'

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
    alias: 'i',
  },
  alias: {
    type: 'string',
    describe: 'Template Alias. Required if a template ID is not specified.',
    alias: 'a',
  },
  from: {
    type: 'string',
    describe:
      'Email address you are sending from. Must be an address on a verified domain or confirmed Sender Signature.',
    alias: 'f',
    required: true,
  },
  to: {
    type: 'string',
    describe: 'Email address you are sending to',
    alias: 't',
    required: true,
  },
  model: {
    type: 'string',
    describe: '',
    alias: 'm',
  },
}
export const handler = (args: Types) => exec(args)

/**
 * Execute the command
 */
const exec = (args: Types) => {
  const { serverToken } = args

  return validateToken(serverToken).then(token => {
    send(token, args)
  })
}

/**
 * Send the email
 */
const send = (serverToken: string, args: Types) => {
  const { id, alias, from, to, model } = args
  const spinner = ora('Sending an email').start()
  const client = new ServerClient(serverToken)

  client
    .sendEmailWithTemplate({
      TemplateId: id || undefined,
      TemplateAlias: alias || undefined,
      From: from,
      To: to,
      TemplateModel: model ? JSON.parse(model) : undefined,
    })
    .then((response: any) => {
      spinner.stop()
      log(JSON.stringify(response))
    })
    .catch((error: any) => {
      spinner.stop()
      log(error, { error: true })
      process.exit(1)
    })
}
