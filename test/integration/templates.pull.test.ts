import { expect } from 'chai'
import 'mocha'
import execa from 'execa'
import * as fs from 'fs-extra'
import { join } from 'path'

const dirTree = require('directory-tree')
import {
  serverToken,
  CLICommand,
  TestDataFolder,
  createTemplateData,
  deleteTemplateData,
} from './shared'

describe('Templates command', () => {
  const options: execa.CommonOptions = {
    env: { POSTMARK_SERVER_TOKEN: serverToken },
  }
  const dataFolder: string = TestDataFolder
  const commandParameters: string[] = ['templates', 'pull', dataFolder]

  before(async () => {
    await deleteTemplateData()
    return createTemplateData()
  })

  after(async () => {
    await deleteTemplateData()
  })

  afterEach(() => {
    fs.removeSync(dataFolder)
  })

  describe('Pull', () => {
    function retrieveFiles(path: string, excludeLayouts?: boolean) {
      const folderTree = dirTree(
        path,
        excludeLayouts && {
          exclude: /_layouts$/,
        }
      )
      return folderTree.children[0].children
    }

    it('console out', async () => {
      const { stdout } = await execa(CLICommand, commandParameters, options)
      expect(stdout).to.include('All finished')
    })

    describe('Templates', () => {
      it('templates', async () => {
        await execa(CLICommand, commandParameters, options)
        const folderTree = dirTree(dataFolder, {
          exclude: /_layouts$/,
        })
        expect(folderTree.children.length).to.be.gt(0)
      })

      it('single template - file names', async () => {
        await execa(CLICommand, commandParameters, options)
        const files = retrieveFiles(dataFolder, true)
        const names: string[] = files.map((f: any) => {
          return f.name
        })

        expect(names).to.members(['content.txt', 'content.html', 'meta.json'])
      })

      it('single template files - none empty', async () => {
        await execa(CLICommand, commandParameters, options)
        const files = retrieveFiles(dataFolder)

        let result = files.findIndex((f: any) => {
          return f.size <= 0
        })
        expect(result).to.eq(-1)
      })
    })

    describe('Layouts', () => {
      const filesPath = join(dataFolder, '_layouts')

      it('layouts', async () => {
        await execa(CLICommand, commandParameters, options)
        const folderTree = dirTree(filesPath)
        expect(folderTree.children.length).to.be.gt(0)
      })

      it('single layout - file names', async () => {
        await execa(CLICommand, commandParameters, options)
        const files = retrieveFiles(filesPath)

        const names: string[] = files.map((f: any) => {
          return f.name
        })

        expect(names).to.members(['content.txt', 'content.html', 'meta.json'])
      })

      it('single layout files - none empty', async () => {
        await execa(CLICommand, commandParameters, options)
        const files = retrieveFiles(filesPath)

        let result = files.findIndex((f: any) => {
          return f.size <= 0
        })
        expect(result).to.eq(-1)
      })
    })
  })
})
