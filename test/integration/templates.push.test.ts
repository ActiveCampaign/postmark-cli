import { expect } from 'chai'
import 'mocha'
import * as execa from 'execa'
import * as nconf from 'nconf'
import * as fs from 'fs-extra'
import { DirectoryTree } from 'directory-tree'

const dirTree = require('directory-tree')
const testingKeys = nconf
  .env()
  .file({ file: __dirname + '/../config/testing_keys.json' })

describe('Templates command', () => {
  const serverToken: string = testingKeys.get('SERVER_TOKEN')
  const options: execa.CommonOptions = {
    env: { POSTMARK_SERVER_TOKEN: serverToken },
  }
  const CLICommand: string = './dist/index.js'
  const pullFolder: string = './test/data'
  const pushCommandParameters: string[] = [
    'templates',
    'push',
    pullFolder,
    '--force',
  ]
  const pullCommandParameters: string[] = ['templates', 'pull', pullFolder]

  afterEach(() => {
    fs.removeSync(pullFolder)
  })

  describe('Push', () => {
    it('console out', async () => {
      await execa(CLICommand, pullCommandParameters, options)
      const templateFolders = dirTree(pullFolder)
      const files = templateFolders.children[0].children
      const file: DirectoryTree = files.find((f: DirectoryTree) => {
        return f.path.includes('txt')
      })

      fs.writeFileSync(file.path, `test data ${Date.now().toString()}`, 'utf-8')
      const { stdout } = await execa(CLICommand, pushCommandParameters, options)
      expect(stdout).to.include('Pushed 1 template successfully.')
    })
  })
})
