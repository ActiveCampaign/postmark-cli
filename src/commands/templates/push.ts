import chalk from 'chalk'
import ora from 'ora'
import { find, cloneDeep } from 'lodash'
import { prompt } from 'inquirer'
import { table, getBorderCharacters } from 'table'
import untildify from 'untildify'
import { existsSync } from 'fs-extra'
import { createManifest } from './helpers'
import { ServerClient } from 'postmark'
import {
  TemplateManifest,
  TemplatePushResults,
  TemplatePushReview,
  TemplatePushArguments,
  Templates,
} from '../../types'
import { pluralize, log, validateToken } from '../../utils'

let pushManifest: TemplateManifest[] = []

export const command = 'push <templates directory> [options]'
export const desc =
  'Push templates from <templates directory> to a Postmark server'

export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  'request-host': {
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
  const rootPath: string = untildify(args.templatesdirectory)

  // Check if path exists
  if (!existsSync(rootPath)) {
    log('The provided path does not exist', { error: true })
    return process.exit(1)
  }

  return push(serverToken, args)
}

/**
 * Begin pushing the templates
 */
const push = (serverToken: string, args: TemplatePushArguments) => {
  const { templatesdirectory, force, requestHost } = args
  const spinner = ora('Fetching templates...').start()
  const manifest = createManifest(templatesdirectory)
  const client = new ServerClient(serverToken)

  if (requestHost !== undefined && requestHost !== '') {
    client.clientOptions.requestHost = requestHost
  }

  // Make sure manifest isn't empty
  if (manifest.length > 0) {
    // Get template list from Postmark
    client
      .getTemplates({ count: 300 })
      .then(response => {
        getTemplateContent(client, response).then(newList => {
          compareTemplates(newList, manifest)

          spinner.stop()
          if (pushManifest.length === 0)
            return log('There are no changes to push.')

          // Show which templates are changing
          printReview(review)

          // Push templates if force arg is present
          if (force) {
            spinner.text = 'Pushing templates to Postmark...'
            spinner.start()
            return pushTemplates(spinner, client, pushManifest)
          }

          // Ask for user confirmation
          confirmation().then(answer => {
            if (answer.confirm) {
              spinner.text = 'Pushing templates to Postmark...'
              spinner.start()
              pushTemplates(spinner, client, pushManifest)
            } else {
              log('Canceling push. Have a good day!')
            }
          })
        })
      })
      .catch((error: any) => {
        spinner.stop()
        log(error, { error: true })
        process.exit(1)
      })
  } else {
    spinner.stop()
    log('No templates or layouts were found.', { error: true })
    process.exit(1)
  }
}

/**
 * Gather template content from server to compare against local versions
 */
const getTemplateContent = (
  client: any,
  templateList: Templates
): Promise<any> =>
  new Promise<TemplateManifest[]>(resolve => {
    let newList: any[] = cloneDeep(templateList.Templates)
    let progress = 0

    newList.forEach((template, index) => {
      client
        .getTemplate(template.TemplateId)
        .then((result: TemplateManifest) => {
          newList[index] = {
            ...newList[index],
            HtmlBody: result.HtmlBody,
            TextBody: result.TextBody,
            Subject: result.Subject,
            TemplateType: result.TemplateType,
            LayoutTemplate: result.LayoutTemplate,
          }

          progress++

          if (progress === newList.length) {
            return resolve(newList)
          }
        })
    })
  })

/**
 * Ask user to confirm the push
 */
const confirmation = (): Promise<any> =>
  new Promise<string>((resolve, reject) => {
    prompt([
      {
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: `Would you like to continue?`,
      },
    ])
      .then((answer: any) => resolve(answer))
      .catch((err: any) => reject(err))
  })

/**
 * Compare templates on server against local
 */
const compareTemplates = (
  response: TemplateManifest[],
  manifest: TemplateManifest[]
): void => {
  // Iterate through manifest
  manifest.forEach(template => {
    // See if this local template exists on the server
    const match = find(response, { Alias: template.Alias })
    template.New = !match

    // New template
    if (!match) return pushTemplatePreview(match, template)

    // Check if existing template was modified

    if (wasModified(match, template))
      return pushTemplatePreview(match, template)
  })
}

/**
 * Check if local template is different than server
 */
const wasModified = (
  server: TemplateManifest,
  local: TemplateManifest
): boolean => {
  const htmlModified = server.HtmlBody !== local.HtmlBody
  const textModified = server.TextBody !== local.TextBody
  const subjectModified =
    local.TemplateType === 'Standard' ? server.Subject !== local.Subject : false
  const nameModified = server.Name !== local.Name
  return htmlModified || textModified || subjectModified || nameModified
}

/**
 * Push template details to review table
 */
const pushTemplatePreview = (
  match: any,
  template: TemplateManifest
): number => {
  pushManifest.push(template)

  let reviewData = [
    template.New ? chalk.green('Added') : chalk.yellow('Modified'),
    template.Name,
    template.Alias,
  ]

  // Push layout to review table
  if (template.TemplateType === 'Layout') return review.layouts.push(reviewData)

  // Push template to review table
  // Add layout used column
  reviewData.push(
    layoutUsedLabel(
      template.LayoutTemplate,
      match ? match.LayoutTemplate : template.LayoutTemplate
    )
  )

  return review.templates.push(reviewData)
}

/**
 * Render the "Layout used" column for Standard templates
 */
const layoutUsedLabel = (
  localLayout: string | null | undefined,
  serverLayout: string | null | undefined
): string => {
  let label: string = localLayout ? localLayout : chalk.gray('None')

  // If layout template on server doesn't match local template
  if (localLayout !== serverLayout) {
    serverLayout = serverLayout ? serverLayout : 'None'

    // Append old server layout to label
    label += chalk.red(`  ✘ ${serverLayout}`)
  }

  return label
}

/**
 * Show which templates will change after the publish
 */
const printReview = (review: TemplatePushReview) => {
  const { templates, layouts } = review

  // Table headers
  const header = [chalk.gray('Status'), chalk.gray('Name'), chalk.gray('Alias')]
  const templatesHeader = [...header, chalk.gray('Layout used')]

  // Labels
  const templatesLabel =
    templates.length > 0
      ? `${templates.length} ${pluralize(
          templates.length,
          'template',
          'templates'
        )}`
      : ''
  const layoutsLabel =
    layouts.length > 0
      ? `${layouts.length} ${pluralize(layouts.length, 'layout', 'layouts')}`
      : ''

  // Log template and layout files
  if (templates.length > 0) {
    log(`\n${templatesLabel}`)
    log(
      table([templatesHeader, ...templates], {
        border: getBorderCharacters('norc'),
      })
    )
  }
  if (layouts.length > 0) {
    log(`\n${layoutsLabel}`)
    log(table([header, ...layouts], { border: getBorderCharacters('norc') }))
  }

  // Log summary
  log(
    chalk.yellow(
      `${templatesLabel}${
        templates.length > 0 && layouts.length > 0 ? ' and ' : ''
      }${layoutsLabel} will be pushed to Postmark.`
    )
  )
}

/**
 * Push all local templates
 */
const pushTemplates = (
  spinner: any,
  client: any,
  templates: TemplateManifest[]
) => {
  templates.forEach(template =>
    pushTemplate(spinner, client, template, templates.length)
  )
}

/**
 * Determine whether to create a new template or edit an existing
 */
const pushTemplate = (
  spinner: any,
  client: any,
  template: TemplateManifest,
  total: number
): void => {
  if (template.New) {
    return client
      .createTemplate(template)
      .then((response: object) =>
        pushComplete(true, response, template, spinner, total)
      )
      .catch((response: object) =>
        pushComplete(false, response, template, spinner, total)
      )
  }

  return client
    .editTemplate(template.Alias, template)
    .then((response: object) =>
      pushComplete(true, response, template, spinner, total)
    )
    .catch((response: object) =>
      pushComplete(false, response, template, spinner, total)
    )
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
    log(`\n${template.Alias}: ${response.toString()}`, { error: true })
    spinner.start()
  }

  if (completed === total) {
    spinner.stop()

    log('✅ All finished!', { color: 'green' })

    // Show failures
    if (results.failed) {
      log(
        `⚠️ Failed to push ${results.failed} ${pluralize(
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
  layouts: [],
  templates: [],
}
