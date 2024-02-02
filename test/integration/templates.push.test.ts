import { expect } from 'chai'
import 'mocha'
import execa from 'execa'
import * as fs from 'fs-extra'
import { DirectoryTree } from 'directory-tree'
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
  const pushCommandParameters: string[] = [
    'templates',
    'push',
    dataFolder,
    '--force',
  ]
  const pullCommandParameters: string[] = ['templates', 'pull', dataFolder]

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

  describe('Push', () => {
    function retrieveFiles(path: string, excludeLayouts?: boolean) {
      const folderTree = dirTree(
        path,
        excludeLayouts && {
          exclude: /_layouts$/,
        },
      )
      return folderTree.children[0].children
    }

    beforeEach(async () => {
      await execa(CLICommand, pullCommandParameters, options)
    })

    describe('Templates', () => {
      it('console out', async () => {
        const files = retrieveFiles(dataFolder, true)
        const file: DirectoryTree = files.find((f: DirectoryTree) => {
          return f.path.includes('txt')
        })

        fs.writeFileSync(
          file.path,
          `test data ${Date.now().toString()}`,
          'utf-8',
        )
        const { stdout } = await execa(
          CLICommand,
          pushCommandParameters,
          options,
        )
        expect(stdout).to.include('All finished!')
      })

      it('file content', async () => {
        let files = retrieveFiles(dataFolder, true)
        let file: DirectoryTree = files.find((f: DirectoryTree) => {
          return f.path.includes('txt')
        })
        const contentToPush: string = `test data ${Date.now().toString()}`

        fs.writeFileSync(file.path, contentToPush, 'utf-8')
        await execa(CLICommand, pushCommandParameters, options)

        fs.removeSync(dataFolder)
        await execa(CLICommand, pullCommandParameters, options)

        files = retrieveFiles(dataFolder, true)
        file = files.find((f: DirectoryTree) => {
          return f.path.includes('txt')
        })

        const content: string = fs.readFileSync(file.path).toString('utf-8')
        expect(content).to.equal(contentToPush)
      })
    })

    describe('Layouts', () => {
      const filesPath = join(dataFolder, '_layouts')

      it('console out', async () => {
        const files = retrieveFiles(filesPath)
        const file: DirectoryTree = files.find((f: DirectoryTree) => {
          return f.path.includes('txt')
        })

        fs.writeFileSync(
          file.path,
          `test data ${Date.now().toString()} {{{@content}}}`,
          'utf-8',
        )
        const { stdout } = await execa(
          CLICommand,
          pushCommandParameters,
          options,
        )
        expect(stdout).to.include('All finished!')
      })

      it('file content', async () => {
        let files = retrieveFiles(filesPath)
        let file: DirectoryTree = files.find((f: DirectoryTree) => {
          return f.path.includes('txt')
        })
        const contentToPush: string = `test data ${Date.now().toString()} {{{@content}}}`

        fs.writeFileSync(file.path, contentToPush, 'utf-8')
        await execa(CLICommand, pushCommandParameters, options)

        fs.removeSync(dataFolder)
        await execa(CLICommand, pullCommandParameters, options)

        files = retrieveFiles(filesPath)
        file = files.find((f: DirectoryTree) => {
          return f.path.includes('txt')
        })

        const content: string = fs.readFileSync(file.path).toString('utf-8')
        expect(content).to.equal(contentToPush)
      })
    })
  })
})
