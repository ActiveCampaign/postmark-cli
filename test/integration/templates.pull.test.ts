import { expect } from 'chai'
import 'mocha'
import execa from 'execa'
import * as fs from 'fs-extra'
import { join } from 'path'

const dirTree = require('directory-tree')
import { serverToken, CLICommand, TestDataFolder } from './shared'

describe('Templates command', () => {
  const options: execa.CommonOptions = {
    env: { POSTMARK_SERVER_TOKEN: serverToken },
  }
  const dataFolder: string = TestDataFolder
  const commandParameters: string[] = ['templates', 'pull', dataFolder]

  afterEach(() => {
    fs.removeSync(dataFolder)
  })

  describe('Pull', () => {
    it('console out', async () => {
      const { stdout } = await execa(CLICommand, commandParameters, options)
      expect(stdout).to.include('All finished')
    })

    describe('Templates folder', () => {
      const path = join(dataFolder, 'templates')

      it('templates', async () => {
        await execa(CLICommand, commandParameters, options)
        const templateFolders = dirTree(path)
        expect(templateFolders.children.length).to.be.gt(0)
      })

      it('single template - file names', async () => {
        await execa(CLICommand, commandParameters, options)
        const templateFolders = dirTree(path)

        const files = templateFolders.children[0].children
        const names: string[] = files.map((f: any) => {
          return f.name
        })

        expect(names).to.members(['content.txt', 'content.html', 'meta.json'])
      })

      it('single template files - none empty', async () => {
        await execa(CLICommand, commandParameters, options)
        const templateFolders = dirTree(path)
        const files = templateFolders.children[0].children

        let result = files.findIndex((f: any) => {
          return f.size <= 0
        })
        expect(result).to.eq(-1)
      })
    })

    describe('Layouts folder', () => {
      const path = join(dataFolder, 'layouts')

      it('layouts empty', async () => {
        await execa(CLICommand, commandParameters, options)
        const templateFolders = dirTree(path)
        expect(templateFolders.children.length).to.be.eq(0)
      })
    })
  })
})
