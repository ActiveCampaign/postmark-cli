import chalk from 'chalk'
import { join } from 'path'
import { outputFileSync, existsSync, ensureDirSync } from 'fs-extra'
import { prompt } from 'inquirer'
import * as ora from 'ora'
import { ServerClient } from 'postmark'

import {
  ProcessTemplatesOptions,
  Template,
  TemplateListOptions,
} from '../../models'
import { pluralize, untildify } from '../../utils'

export const command = 'pull <output directory>'
export const desc = 'Pull templates from a server to <output directory>'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
}
export const handler = (argv: any) => {
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
        console.error(chalk.red('Invalid server token.'))
      }
    })
  } else {
    execute(argv.serverToken, argv.outputdirectory)
  }
}

/**
 * Execute the command
 * @param  serverToken
 * @param  outputDir
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
 * @param options
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
        console.log('There are no templates on this server.')
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
      console.error(chalk.red(JSON.stringify(error)))
    })
}

/**
 * Fetch each template’s content from the server
 * @param options
 */
const processTemplates = (options: ProcessTemplatesOptions) => {
  const { spinner, client, outputDir, totalCount, templates } = options
  let requestCount = 0

  templates.forEach(template => {
    client
      .getTemplate(template.TemplateId)
      .then((response: Template) => {
        requestCount++
        saveTemplate(outputDir, response)

        // Show feedback when finished saving templates
        if (requestCount === totalCount) {
          spinner.stop()

          console.log(
            chalk.green(
              `All done! ${totalCount} ${pluralize(
                totalCount,
                'template',
                'templates'
              )} have been saved to ${outputDir}.`
            )
          )
        }
      })
      .catch((error: object) => {
        spinner.stop()
        console.error(chalk.red(JSON.stringify(error)))
      })
  })
}

/**
 * Save template
 * @param  outputDir - Write the templates to this directory
 * @param  template
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
 * @param  template
 * @returns the pruned object
 */
const pruneTemplateObject = (template: Template) => {
  delete template.AssociatedServerId
  delete template.Active
  if (template.Alias) delete template.TemplateId

  return template
}
