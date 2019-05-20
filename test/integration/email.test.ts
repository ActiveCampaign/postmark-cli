import { expect } from 'chai'
import 'mocha'
import * as execa from 'execa'
import * as nconf from 'nconf'

const testingKeys = nconf
  .env()
  .file({ file: __dirname + '/../config/testing_keys.json' })

describe('Email send command', () => {
  const serverToken: string = testingKeys.get('SERVER_TOKEN')
  const options: execa.CommonOptions = {
    env: { POSTMARK_SERVER_TOKEN: serverToken },
  }
  const CLICommand: string = './dist/index.js'
  const commandParameters = ['email', 'raw']

  describe('Not enough arguments', () => {
    it('no arguments', async () => {
      try {
        await execa(CLICommand, [], options)
      } catch (error) {
        expect(error.message).to.include(
          'Not enough non-option arguments: got 0, need at least 1'
        )
      }
    })
  })
})
