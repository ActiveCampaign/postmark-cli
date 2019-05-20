import { join } from 'path'
import { outputFileSync, existsSync, ensureDirSync } from 'fs-extra'
import { prompt } from 'inquirer'
import * as ora from 'ora'
import { ServerClient } from 'postmark'

import {
  ProcessTemplatesOptions,
  Template,
  TemplateListOptions,
} from '../../types'
import { log, validateToken, pluralize, untildify } from '../../utils'

interface Types {
  serverToken: string
  outputdirectory: string
  overwrite: boolean
}

export const command = 'pull <output directory> [options]'
export const desc = 'Pull templates from a server to <output directory>'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  overwrite: {
    type: 'boolean',
    alias: 'o',
    default: false,
    describe: 'Overwrite templates if they already exist',
  },
}
export const handler = (args: Types) => exec(args)

/**
 * Execute the command
 */
const exec = (args: Types) => {
  const { serverToken } = args

  return validateToken(serverToken).then(token => {
    pull(token, args)
  })
}

/**
 * Begin pulling the templates
 */
const pull = (serverToken: string, args: Types) => {
  const { outputdirectory, overwrite } = args

  // Check if directory exists
  if (existsSync(untildify(outputdirectory)) && !overwrite) {
    return overwritePrompt(serverToken, outputdirectory)
  }

  return fetchTemplateList({
    sourceServer: serverToken,
    outputDir: outputdirectory,
  })
}

/**
 * Ask user to confirm overwrite
 */
const overwritePrompt = (serverToken: string, outputdirectory: string) => {
  return prompt([
    {
      type: 'confirm',
      name: 'overwrite',
      default: false,
      message: `Are you sure you want to overwrite the files in ${outputdirectory}?`,
    },
  ]).then((answer: { overwrite?: boolean }) => {
    if (answer.overwrite) {
      return fetchTemplateList({
        sourceServer: serverToken,
        outputDir: outputdirectory,
      })
    }
  })
}

/**
 * Fetch template list from PM
 */
const fetchTemplateList = (options: TemplateListOptions) => {
  const { sourceServer, outputDir } = options
  const spinner = ora('Pulling templates from Postmark...').start()
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
    .catch((error: any) => {
      spinner.stop()
      log(error, { error: true })
      process.exit(1)
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
    // Show warning if template doesn't have an alias
    if (!template.Alias) {
      requestCount++
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
        requestCount++

        // Save template to file system
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
      .catch((error: any) => {
        spinner.stop()
        log(error, { error: true })
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
