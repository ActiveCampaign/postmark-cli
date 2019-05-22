import chalk from 'chalk'
import ora from 'ora'
import { join } from 'path'
import { find } from 'lodash'
import { prompt } from 'inquirer'
import { table, getBorderCharacters } from 'table'
import untildify from 'untildify'
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
  TemplatePushArguments,
} from '../../types'
import { pluralize, log, validateToken } from '../../utils'

export const command = 'push <templates directory> [options]'
export const desc =
  'Push templates from <templates directory> to a Postmark server'

export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  force: {
    type: 'boolean',
    describe: 'Disable confirmation before pushing templates',
    alias: 'f',
  },
}
export const handler = (args: TemplatePushArguments) => exec(args)

/**
 * Execute the command
 */
const exec = (args: TemplatePushArguments) => {
  const { serverToken } = args

  return validateToken(serverToken).then(token => {
    validateDirectory(token, args)
  })
}

/**
 * Check if directory exists before pushing
 */
const validateDirectory = (
  serverToken: string,
  args: TemplatePushArguments
) => {
  if (!existsSync(untildify(args.templatesdirectory))) {
    log('Could not find the template directory provided', { error: true })
    return process.exit(1)
  }

  return push(serverToken, args)
}

/**
 * Begin pushing the templates
 */
const push = (serverToken: string, args: TemplatePushArguments) => {
  const { templatesdirectory, force } = args
  const spinner = ora('Fetching templates...').start()
  const manifest = createManifest(templatesdirectory)
  const client = new ServerClient(serverToken)

  // Make sure manifest isn't empty
  if (manifest.length > 0) {
    // Get template list from Postmark
    client
      .getTemplates()
      .then(response => {
        // Compare local templates with server
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

        // Push templates
        if (force) {
          spinner.text = 'Pushing templates to Postmark...'
          spinner.start()
          return pushTemplates(spinner, client, manifest)
        }

        // User confirmation before pushing
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
            log('Canceling push. Have a good day!')
          }
        })
      })
      .catch((error: any) => {
        spinner.stop()
        log(error, { error: true })
        process.exit(1)
      })
  } else {
    log('No templates were found in this directory', { error: true })
    process.exit(1)
  }
}

/**
 * Gather up templates on the file system
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
 */
const printReview = (review: TemplatePushReview) => {
  const { files, added, modified } = review
  const head = [chalk.gray('Type'), chalk.gray('Name'), chalk.gray('Alias')]

  log(table([head, ...files], { border: getBorderCharacters('norc') }))

  if (added > 0) {
    log(
      `${added} ${pluralize(added, 'template', 'templates')} will be added.`,
      { color: 'green' }
    )
  }

  if (modified > 0) {
    log(
      `${modified} ${pluralize(
        modified,
        'template',
        'templates'
      )} will be modified.`,
      { color: 'yellow' }
    )
  }
}

/**
 * Push all local templates
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
    log(`\n${template.Name}: ${response.toString()}`, { error: true })
    spinner.start()
  }

  if (completed === total) {
    spinner.stop()

    log(
      `All finished! ${results.success} ${pluralize(
        results.success,
        'template was',
        'templates were'
      )} pushed to Postmark.`,
      { color: 'green' }
    )

    // Show failures
    if (results.failed) {
      log(
        `Failed to push ${results.failed} ${pluralize(
          results.failed,
          'template',
          'templates'
        )}. Please see the output above for more details.`,
        { error: true }
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
