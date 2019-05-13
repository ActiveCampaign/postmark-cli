import chalk from 'chalk'
import * as ora from 'ora'
import { join } from 'path'
import { find } from 'lodash'
import { prompt } from 'inquirer'
import { table, getBorderCharacters } from 'table'
import {
  readJsonSync,
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
} from 'fs-extra'

import { ServerClient } from 'postmark'
import {
  TemplateManifest,
  TemplatePushResults,
  TemplatePushReview,
} from '../../types'
import { pluralize, untildify } from '../../utils'

export const command = 'push <templates directory> [options]'
export const desc =
  'Push templates from <templates directory> to a Postmark server'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  confirmation: {
    type: 'boolean',
    describe: 'Require user confirmation before pushing the templates',
    default: true,
    alias: ['c'],
  },
}
export const handler = (argv: any) => {
  const templateDir = untildify(argv.templatesdirectory)

  // Check if directory exists
  if (!existsSync(templateDir))
    return console.error(chalk.red('Error: Could not find this directory.'))

  // Ask for server token
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
        execute(answer.serverToken, templateDir, argv.confirmation)
      } else {
        console.error(chalk.red('Invalid server token.'))
      }
    })
  } else {
    // Execute command if server token was found in environment vars
    execute(argv.serverToken, templateDir, argv.confirmation)
  }
}

/**
 * Execute the command
 * @param  serverToken
 * @param  templateDir
 * @param  confirmation
 */
const execute = (
  serverToken: string,
  templateDir: string,
  confirmation: boolean
) => {
  const spinner = ora('Fetching templates...').start()
  const manifest = createManifest(templateDir)
  const client = new ServerClient(serverToken)

  if (manifest.length > 0) {
    client
      .getTemplates()
      .then(response => {
        manifest.forEach(template => {
          template.New = !find(response.Templates, { Alias: template.Alias })
          template.New ? review.added++ : review.modified++
          review.files.push([
            template.New ? chalk.green('Added') : chalk.yellow('Modified'),
            template.Name,
            template.Alias,
          ])
        })

        spinner.stop()
        printReview(review)

        if (confirmation) {
          prompt([
            {
              type: 'confirm',
              name: 'confirm',
              default: false,
              message: `Are you sure you want to push these templates to Postmark?`,
            },
          ]).then((answer: any) => {
            if (answer.confirm) {
              spinner.text = 'Pushing templates to Postmark...'
              spinner.start()
              pushTemplates(spinner, client, manifest)
            } else {
              console.log('Canceling push. Have a good day!')
            }
          })
        } else {
          spinner.text = 'Pushing templates to Postmark...'
          spinner.start()
          pushTemplates(spinner, client, manifest)
        }
      })
      .catch((error: object) => {
        spinner.stop()
        console.error(chalk.red(JSON.stringify(error)))
      })
  } else {
    console.log(chalk.red('Error: No templates were found in this directory'))
  }
}

/**
 * Gather up templates on the file system
 * @param  path
 * @returns An object containing all locally stored templates
 */
const createManifest = (path: string) => {
  let manifest: TemplateManifest[] = []
  const dirs = readdirSync(path).filter(f =>
    statSync(join(path, f)).isDirectory()
  )

  dirs.forEach(dir => {
    const metaPath = join(path, join(dir, 'meta.json'))
    const htmlPath = join(path, join(dir, 'content.html'))
    const textPath = join(path, join(dir, 'content.txt'))
    let template: TemplateManifest = {}

    if (existsSync(metaPath)) {
      template.HtmlBody = existsSync(htmlPath)
        ? readFileSync(htmlPath, 'utf-8')
        : ''
      template.TextBody = existsSync(textPath)
        ? readFileSync(textPath, 'utf-8')
        : ''

      if (template.HtmlBody !== '' || template.TextBody !== '') {
        template = Object.assign(template, readJsonSync(metaPath))
        manifest.push(template)
      }
    }
  })

  return manifest
}

/**
 * Show which templates will change after the publish
 * @param  results
 */
const printReview = (review: TemplatePushReview) => {
  const { files, added, modified } = review
  const head = [chalk.gray('Type'), chalk.gray('Name'), chalk.gray('Alias')]

  console.log(table([head, ...files], { border: getBorderCharacters('norc') }))

  if (added > 0) {
    console.log(
      chalk.green(
        `${added} ${pluralize(added, 'template', 'templates')} will be added.`
      )
    )
  }

  if (modified > 0) {
    console.log(
      chalk.yellow(
        `${modified} ${pluralize(
          modified,
          'template',
          'templates'
        )} will be modified.`
      )
    )
  }
}

/**
 * Push all local templates
 * @param  spinner - Reference to CLI spinner
 * @param  client - Postmark server instance
 * @param  templates
 */
const pushTemplates = (
  spinner: any,
  client: any,
  templates: TemplateManifest[]
) => {
  templates.forEach(template => {
    pushTemplate(spinner, client, template, templates.length)
  })
}

/**
 * Determine whether to create a new template or edit an existing
 * @param  spinner - Reference to CLI spinner
 * @param  client - Postmark server instance
 * @param  template
 * @param  total number of templates
 */
const pushTemplate = (
  spinner: any,
  client: any,
  template: TemplateManifest,
  total: number
) => {
  if (template.New) {
    client
      .createTemplate(template)
      .then((response: object) =>
        pushComplete(true, response, template, spinner, total)
      )
      .catch((response: object) =>
        pushComplete(false, response, template, spinner, total)
      )
  } else {
    client
      .editTemplate(template.Alias, template)
      .then((response: object) =>
        pushComplete(true, response, template, spinner, total)
      )
      .catch((response: object) =>
        pushComplete(false, response, template, spinner, total)
      )
  }
}

/**
 * Run each time a push has been completed
 * @param  success - Whether or not the response was successful
 * @param  response - API response
 * @param  template - Local template info
 * @param  spinner - Reference to CLI spinner
 */
const pushComplete = (
  success: boolean,
  response: object,
  template: TemplateManifest,
  spinner: any,
  total: number
) => {
  // Update counters
  results[success ? 'success' : 'failed']++
  const completed = results.success + results.failed

  // Log any errors to the console
  if (!success) {
    spinner.stop()
    console.log(chalk.red(`\n${template.Name}: ${response.toString()}`))
    spinner.start()
  }

  if (completed === total) {
    spinner.stop()

    console.log(
      chalk.green(
        `Pushed ${results.success} ${pluralize(
          results.success,
          'template',
          'templates'
        )} successfully.`
      )
    )

    // Show failures
    if (results.failed) {
      console.log(
        chalk.red(
          `Failed to push ${results.failed} ${pluralize(
            results.failed,
            'template',
            'templates'
          )}. Please see the output above for more details.`
        )
      )
    }
  }
}

let results: TemplatePushResults = {
  success: 0,
  failed: 0,
}

let review: TemplatePushReview = {
  files: [],
  added: 0,
  modified: 0,
}
