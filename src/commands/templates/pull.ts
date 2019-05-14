import chalk from 'chalk'
import { join } from 'path'
import { outputFileSync, existsSync, ensureDirSync } from 'fs-extra'
import { prompt } from 'inquirer'
import * as ora from 'ora'
import { ServerClient } from 'postmark'
import { log } from '../../utils'

import {
  ProcessTemplatesOptions,
  Template,
  TemplateListOptions,
} from '../../types'
import { pluralize, untildify } from '../../utils'

interface types {
  serverToken: string
  outputdirectory: string
}

export const command = 'pull <output directory>'
export const desc = 'Pull templates from a server to <output directory>'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
}
export const handler = (argv: types) => {
  if (!argv.serverToken) {
    prompt([
      {
        type: 'password',
        name: 'serverToken',
        message: 'Please enter your server token',
        mask: '•',
      },
    ]).then((answer: any) => {
      if (answer.serverToken) {
        execute(answer.serverToken, argv.outputdirectory)
      } else {
        log('Invalid server token.', { error: true })
      }
    })
  } else {
    execute(argv.serverToken, argv.outputdirectory)
  }
}

/**
 * Execute the command
 */
const execute = (serverToken: string, outputDir: string) => {
  // Check if directory exists
  if (existsSync(untildify(outputDir))) {
    prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        default: false,
        message: `Are you sure you want to overwrite the files in ${outputDir}?`,
      },
    ]).then((answer: any) => {
      if (answer.overwrite) {
        fetchTemplateList({
          sourceServer: serverToken,
          outputDir: outputDir,
        })
      }
    })
  } else {
    fetchTemplateList({
      sourceServer: serverToken,
      outputDir: outputDir,
    })
  }
}

/**
 * Fetch template list from PM
 */
const fetchTemplateList = (options: TemplateListOptions) => {
  const spinner = ora('Pulling templates from Postmark...').start()
  const { sourceServer, outputDir } = options
  const client = new ServerClient(sourceServer)

  client
    .getTemplates()
    .then(response => {
      if (response.TotalCount === 0) {
        spinner.stop()
        log('There are no templates on this server.', { error: true })
      } else {
        processTemplates({
          spinner,
          client,
          outputDir: outputDir,
          totalCount: response.TotalCount,
          templates: response.Templates,
        })
      }
    })
    .catch((error: object) => {
      spinner.stop()
      log(JSON.stringify(error), { error: true })
    })
}

/**
 * Fetch each template’s content from the server
 */
const processTemplates = (options: ProcessTemplatesOptions) => {
  const { spinner, client, outputDir, totalCount, templates } = options

  // Keep track of requests
  let requestCount = 0

  // keep track of templates downloaded
  let totalDownloaded = 0

  // Iterate through each template and fetch content
  templates.forEach(template => {
    requestCount++

    // Show warning if template doesn't have an alias
    if (!template.Alias) {
      log(
        `Template named "${
          template.Name
        }" will not be downloaded because it is missing an alias.`,
        { warn: true }
      )

      // If this is the last template
      if (requestCount === totalCount) spinner.stop()
      return
    }

    client
      .getTemplate(template.TemplateId)
      .then((response: Template) => {
        saveTemplate(outputDir, response)
        totalDownloaded++

        // Show feedback when finished saving templates
        if (requestCount === totalCount) {
          spinner.stop()

          log(
            `All done! ${totalDownloaded} ${pluralize(
              totalDownloaded,
              'template has',
              'templates have'
            )} been saved to ${outputDir}.`,
            { color: 'green' }
          )
        }
      })
      .catch((error: object) => {
        spinner.stop()
        log(JSON.stringify(error), { error: true })
      })
  })
}

/**
 * Save template
 * @return An object containing the HTML and Text body
 */
const saveTemplate = (outputDir: string, template: Template) => {
  template = pruneTemplateObject(template)

  // Create the directory
  const path: string = untildify(join(outputDir, template.Alias))

  ensureDirSync(path)

  // Save HTML version
  if (template.HtmlBody !== '') {
    outputFileSync(join(path, 'content.html'), template.HtmlBody)
  }

  // Save Text version
  if (template.TextBody !== '') {
    outputFileSync(join(path, 'content.txt'), template.TextBody)
  }

  // Create metadata JSON
  delete template.HtmlBody
  delete template.TextBody

  outputFileSync(join(path, 'meta.json'), JSON.stringify(template, null, 2))
}

/**
 * Remove unneeded fields on the template object
 * @returns the pruned object
 */
const pruneTemplateObject = (template: Template) => {
  delete template.AssociatedServerId
  delete template.Active
  delete template.TemplateId

  return template
}
