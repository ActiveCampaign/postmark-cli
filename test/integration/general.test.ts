import { expect } from 'chai'
import 'mocha'
import * as execa from 'execa'

describe('Default command', () => {
  const CLICommand: string = './dist/index.js'
  const packageJson: any = require('../../package.json')

  describe('parameters', () => {
    it('help', async () => {
      const { stdout } = await execa(CLICommand, ['--help'])
      expect(stdout).to.include('Commands:')
      expect(stdout).to.include('Options:')
    })

    it('version', async () => {
      const { stdout } = await execa(CLICommand, ['--version'])
      expect(stdout).to.include(packageJson.version)
    })

    it('no parameters', async () => {
      execa(CLICommand).catch(error => {
        expect(error.message).to.include('Not enough non-option arguments')
      })
    })
  })
})
