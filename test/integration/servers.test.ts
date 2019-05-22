import { expect } from 'chai'
import 'mocha'
import execa from 'execa'

import { accountToken, CLICommand } from './shared'

describe('Servers list command', () => {
  const options: execa.CommonOptions = {
    env: { POSTMARK_ACCOUNT_TOKEN: accountToken },
  }
  const commandParameters: string[] = ['servers', 'list']

  it('list', async () => {
    const { stdout } = await execa(CLICommand, commandParameters, options)
    const servers = JSON.parse(stdout)
    expect(servers.TotalCount).to.be.gte(0)
  })

  it('list - invalid token', async () => {
    const invalidOptions: execa.CommonOptions = {
      env: { POSTMARK_ACCOUNT_TOKEN: 'test' },
    }

    try {
      await execa(CLICommand, commandParameters, invalidOptions)
      throw Error('make sure error is thrown')
    } catch (error) {
      expect(error.message).to.include('InvalidAPIKeyError')
    }
  })
})
