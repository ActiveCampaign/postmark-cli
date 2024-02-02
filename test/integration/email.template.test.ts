import { expect } from 'chai'
import 'mocha'
import execa from 'execa'
import { serverToken, fromAddress, toAddress, CLICommand } from './shared'
import * as postmark from 'postmark'

describe('Email send template command', () => {
  const options: execa.CommonOptions = {
    env: { POSTMARK_SERVER_TOKEN: serverToken },
  }

  const toParameter = `--to=${toAddress}`
  const fromParameter = `--from=${fromAddress}`
  const baseParameters = ['email', 'template']
  const defaultParameters = baseParameters.concat([toParameter, fromParameter])

  const client: postmark.ServerClient = new postmark.ServerClient(serverToken)

  describe('not valid', () => {
    it('no arguments', () => {
      return execa(CLICommand, baseParameters, options).then(
        result => {
          expect(result).to.equal(null)
        },
        error => {
          expect(error.message).to.include(
            'Missing required arguments: from, to',
          )
        },
      )
    })

    it('no model', async () => {
      const templates: postmark.Models.Templates = await client.getTemplates()
      const parameters: string[] = defaultParameters.concat(
        `--id=${templates.Templates[0].TemplateId}`,
      )

      try {
        await execa(CLICommand, parameters, options)
        throw Error('make sure error is thrown')
      } catch (error: any) {
        expect(error.message).to.include('ApiInputError')
      }
    })

    it('no template id', async () => {
      try {
        await execa(CLICommand, defaultParameters, options)
        throw Error('make sure error is thrown')
      } catch (error: any) {
        expect(error.message).to.include('ApiInputError')
      }
    })
  })

  describe('valid', () => {
    it('send with template id', async () => {
      const templates: postmark.Models.Templates = await client.getTemplates()
      const extraParameters: string[] = [
        `--id=${templates.Templates[0].TemplateId}`,
        '--m={}',
      ]
      const parameters: string[] = defaultParameters.concat(extraParameters)
      const { stdout } = await execa(CLICommand, parameters, options)

      expect(stdout).to.include('"Message":"OK"')
    })
  })
})
