import { ServerClient } from 'postmark'
import { validateToken, CommandResponse } from '../../utils'
import { TemplatedEmailArguments } from '../../types'
import { MessageSendingResponse } from 'postmark/dist/client/models'

export const command = 'template [options]'
export const desc = 'Send a templated email'
export const builder = {
  'source-server': {
    type: 'string',
    hidden: true,
  },
  'request-host': {
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
export const handler = (args: TemplatedEmailArguments) => exec(args)

/**
 * Execute the command
 */
const exec = (args: TemplatedEmailArguments) => {
  const { serverToken } = args

  return validateToken(serverToken).then(token => {
    sendCommand(token, args)
  })
}

/**
 * Execute templated email send command in shell
 */
const sendCommand = (serverToken: string, args: TemplatedEmailArguments) => {
  const { id, alias, from, to, model, requestHost } = args
  const command: CommandResponse = new CommandResponse()
  command.initResponse('Sending an email')
  const client = new ServerClient(serverToken)
  if (requestHost !== undefined && requestHost !== '') {
    client.clientOptions.requestHost = requestHost
  }

  sendEmailWithTemplate(client, id, alias, from, to, model)
    .then((response: any) => {
      command.response(JSON.stringify(response))
    })
    .catch((error: any) => {
      command.errorResponse(error)
    })
}

/**
 * Send the email
 *
 * @return - Promised sending response
 */
const sendEmailWithTemplate = (
  client: ServerClient,
  id: number | undefined,
  alias: string | undefined,
  from: string,
  to: string | undefined,
  model: any | undefined
): Promise<MessageSendingResponse> => {
  return client.sendEmailWithTemplate({
    TemplateId: id || undefined,
    TemplateAlias: alias || undefined,
    From: from,
    To: to,
    TemplateModel: model ? JSON.parse(model) : undefined,
  })
}
