import { ServerClient } from 'postmark'
import { validateToken, CommandResponse } from '../../utils'
import { RawEmailArguments } from '../../types'
import { MessageSendingResponse } from 'postmark/dist/client/models'

export const command = 'raw [options]'
export const desc = 'Send a raw email'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  'request-host': {
    type: 'string',
    hidden: true,
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
  subject: {
    type: 'string',
    describe: 'The subject line of the email',
    required: true,
  },
  html: {
    type: 'string',
    describe: 'The HTML version of the email',
  },
  text: {
    type: 'string',
    describe: 'The text version of the email',
  },
}
export const handler = (args: RawEmailArguments): Promise<void> => exec(args)

/**
 * Execute the command
 */
const exec = (args: RawEmailArguments): Promise<void> => {
  const { serverToken } = args

  return validateToken(serverToken).then(token => {
    sendCommand(token, args)
  })
}

/**
 * Execute send command in shell
 */
const sendCommand = (serverToken: string, args: RawEmailArguments): void => {
  const { from, to, subject, html, text, requestHost } = args
  const command: CommandResponse = new CommandResponse()
  command.initResponse('Sending an email')
  const client = new ServerClient(serverToken)
  if (requestHost !== undefined && requestHost !== '') {
    client.setClientOptions({ requestHost })
  }

  sendEmail(client, from, to, subject, html, text)
    .then(response => {
      command.response(JSON.stringify(response))
    })
    .catch(error => {
      command.errorResponse(error)
    })
}

/**
 * Send the email
 *
 * @return - Promised sending response
 */
const sendEmail = (
  client: ServerClient,
  from: string,
  to: string,
  subject: string,
  html: string | undefined,
  text: string | undefined
): Promise<MessageSendingResponse> => {
  return client.sendEmail({
    From: from,
    To: to,
    Subject: subject,
    HtmlBody: html || undefined,
    TextBody: text || undefined,
  })
}
