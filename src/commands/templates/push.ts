import chalk from 'chalk'
import ora from 'ora'
import untildify from 'untildify'
import invariant from 'ts-invariant'
import { existsSync, statSync } from 'fs-extra'
import { find } from 'lodash'
import { prompt } from 'inquirer'
import { table, getBorderCharacters } from 'table'
import { ServerClient } from 'postmark'
import { Templates } from 'postmark/dist/client/models'

import { TemplateManifest, TemplatePushReview } from '../../types'
import { pluralize, log, validateToken, fatalError, logError } from '../../utils'

import { createManifest, sameContent, templatesDiff } from './helpers'

const debug = require('debug')('postmark-cli:templates:push');

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
  all: {
    type: 'boolean',
    describe:
      'Push all local templates up to Postmark regardless of whether they changed',
    alias: 'a',
  },
}

interface TemplatePushArguments {
  serverToken: string
  requestHost: string
  templatesdirectory: string
  force: boolean
  all: boolean
}
export async function handler(args: TemplatePushArguments): Promise<void> {
  const serverToken = await validateToken(args.serverToken)

  try {
    validatePushDirectory(args.templatesdirectory)
  } catch (e) {
    return fatalError(e)
  }

  return push(serverToken, args)
}

/**
 * Check if directory exists before pushing
 */
export function validatePushDirectory(dir: string): void {
  const fullPath: string = untildify(dir)

  if (!existsSync(fullPath)) {
    throw new Error(`The provided path "${dir}" does not exist`)
  }

  // check if path is a directory
  const stats = statSync(fullPath)
  if (!stats.isDirectory()) {
    throw new Error(`The provided path "${dir}" is not a directory`)
  }
}

/**
 * Begin pushing the templates
 */
async function push(serverToken: string, args: TemplatePushArguments): Promise<void> {
  const { templatesdirectory, force, requestHost, all } = args
  const spinner = ora('Fetching templates...').start()
  const manifest = createManifest(templatesdirectory)
  const client = new ServerClient(serverToken)

  if (requestHost !== undefined && requestHost !== '') {
    client.setClientOptions({ requestHost })
  }

  if (manifest.length > 0) {
    try {
      const response = await client.getTemplates({ count: 300 })

      if (response.TotalCount === 0) {
        return processTemplates({
          newList: [],
          manifest,
          all,
          force,
          spinner,
          client,
        })
      } else {
        const newList = await getTemplateContent(client, response, spinner)
        return processTemplates({
          newList,
          manifest,
          all,
          force,
          spinner,
          client,
        })
      }
    } catch (error) {
      spinner.stop()
      return fatalError(error)
    }
  } else {
    spinner.stop()
    return fatalError('No templates or layouts were found.')
  }
}


interface ProcessTemplates {
  newList: TemplateManifest[]
  manifest: TemplateManifest[]
  all: boolean
  force: boolean
  spinner: ora.Ora
  client: ServerClient
}
/**
 * Compare templates and CLI flow
 */
async function processTemplates({ newList, manifest, all, force, spinner, client }: ProcessTemplates) {
  compareTemplates(newList, manifest, all)

  spinner.stop()
  if (pushManifest.length === 0) return log('There are no changes to push.')

  // Show which templates are changing
  printReview(review)

  // Push templates if force arg is present
  if (force) {
    spinner.text = 'Pushing templates to Postmark...'
    spinner.start()
    return pushTemplates(spinner, client, pushManifest)
  }

  if (await confirmation()) {
    spinner.text = 'Pushing templates to Postmark...'
    spinner.start()
    return pushTemplates(spinner, client, pushManifest)
  } else {
    log('Canceling push. Have a good day!')
  }
}

/**
 * Gather template content from server to compare against local versions
 */
async function getTemplateContent(client: ServerClient, templateList: Templates, spinner: ora.Ora): Promise<TemplateManifest[]> {
  const result: TemplateManifest[] = [];

  for (const template of templateList.Templates) {
    spinner.text = `Comparing template: ${template.Alias}`
    const response = await client.getTemplate(template.TemplateId)
    result.push({
      ...template,
      Alias: response.Alias || undefined,
      HtmlBody: response.HtmlBody || undefined,
      TextBody: response.TextBody || undefined,
      Subject: response.Subject,
      TemplateType: response.TemplateType,
      LayoutTemplate: response.LayoutTemplate || undefined,
    })
  }

  return result;
}

/**
 * Ask user to confirm the push
 */
async function confirmation(message = 'Would you like to continue?', defaultResponse = false): Promise<boolean> {
  const answer = await prompt<{confirm: boolean}>([{
    type: 'confirm',
    name: 'confirm',
    default: defaultResponse,
    message,
  }])
  return answer.confirm
}

/**
 * Compare templates on server against local
 */
function compareTemplates(response: TemplateManifest[], manifest: TemplateManifest[], pushAll: boolean): void {
  // Iterate through manifest
  manifest.forEach(template => {
    // See if this local template exists on the server
    const match = find(response, { Alias: template.Alias })
    template.New = !match

    // New template
    if (!match) {
      template.Status = chalk.green('Added')
      return pushTemplatePreview(match, template)
    }

    // Set modification status
    const modified = wasModified(match, template)
    template.Status = modified
      ? chalk.yellow('Modified')
      : chalk.gray('Unmodified')

    // Push all templates if --all argument is present,
    // regardless of whether templates were modified
    if (pushAll) {
      return pushTemplatePreview(match, template)
    }

    // Only push modified templates
    if (modified) {
      return pushTemplatePreview(match, template)
    }
  })
}

/**
 * Check if local template is different than server
 */
function wasModified(server: TemplateManifest, local: TemplateManifest): boolean {
  const diff = templatesDiff(server, local)
  const result = diff.size > 0

  debug('Template %o was modified: %o. %o', local.Alias, result, diff)

  return result
}

/**
 * Push template details to review table
 */
function pushTemplatePreview(match: TemplateManifest | undefined, template: TemplateManifest): number {
  pushManifest.push(template)

  let reviewData = [template.Status, template.Name, template.Alias]

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
function layoutUsedLabel(localLayout: string | null | undefined, serverLayout: string | null | undefined): string {
  let label = localLayout || chalk.gray('None')

  if (!sameContent(localLayout, serverLayout)) {
    label += chalk.red(`  ✘ ${serverLayout || 'None'}`)
  }

  return label
}

/**
 * Show which templates will change after the publish
 */
function printReview(review: TemplatePushReview) {
  const { templates, layouts } = review

  // Table headers
  const header = [chalk.gray('Status'), chalk.gray('Name'), chalk.gray('Alias')]
  const templatesHeader = [...header, chalk.gray('Layout used')]

  // Labels
  const templatesLabel = templates.length > 0
    ? `${templates.length} ${pluralize(
      templates.length,
      'template',
      'templates'
    )}`
    : ''
  const layoutsLabel = layouts.length > 0
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
      `${templatesLabel}${templates.length > 0 && layouts.length > 0 ? ' and ' : ''}${layoutsLabel} will be pushed to Postmark.`
    )
  )
}

/**
 * Push all local templates
 */
async function pushTemplates(spinner: ora.Ora, client: ServerClient, templates: TemplateManifest[]) {
  for (const template of templates) {
    spinner.color = 'yellow'
    spinner.text = `Pushing template: ${template.Alias}`
    if (template.New) {
      try {
        await client.createTemplate(template)
        pushComplete(true, null, template, spinner, templates.length)
      } catch (error) {
        pushComplete(false, error, template, spinner, templates.length)
      }
    } else {
      invariant(template.Alias, 'Template alias is required')
      try {
        await client.editTemplate(template.Alias, template)
        pushComplete(true, null, template, spinner, templates.length)
      } catch (error) {
        pushComplete(false, error, template, spinner, templates.length)
      }
    }
  }
}

/**
 * Run each time a push has been completed
 */
function pushComplete(success: boolean, error: unknown, template: TemplateManifest, spinner: ora.Ora, total: number) {
  // Update counters
  results[success ? 'success' : 'failed']++
  const completed = results.success + results.failed

  // Log any errors to the console
  if (!success) {
    spinner.stop()
    logError(`\n${template.Alias || template.Name}: ${error}`)
    spinner.start()
  }

  if (completed === total) {
    spinner.stop()

    log('✅ All finished!', { color: 'green' })

    // Show failures
    if (results.failed) {
      logError(
        `⚠️ Failed to push ${results.failed} ${pluralize(
          results.failed,
          'template',
          'templates'
        )}. Please see the output above for more details.`
      )
    }
  }
}


interface TemplatePushResults {
  success: number
  failed: number
}
let results: TemplatePushResults = {
  success: 0,
  failed: 0,
}

let review: TemplatePushReview = {
  layouts: [],
  templates: [],
}
