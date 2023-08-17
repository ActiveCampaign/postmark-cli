import chalk from 'chalk'
import ora from 'ora'
import untildify from 'untildify'
import invariant from 'ts-invariant'
import { existsSync, statSync } from 'fs-extra'
import { find } from 'lodash'
import { confirm } from '@inquirer/prompts'
import { table, getBorderCharacters } from 'table'
import { ServerClient } from 'postmark'
import { TemplateTypes, Templates } from 'postmark/dist/client/models'

import { TemplateManifest } from '../../types'
import { pluralize, log, validateToken, fatalError, logError } from '../../utils'

import { createManifest, sameContent, templatesDiff } from './helpers'

const debug = require('debug')('postmark-cli:templates:push');

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

type MaybeString = string | null | undefined

type ReviewItem = [string?, string?, string?, string?]
interface TemplatePushReview {
  layouts: ReviewItem[]
  templates: ReviewItem[]
}

const STATUS_ADDED = chalk.green('Added')
const STATUS_MODIFIED = chalk.yellow('Modified')
const STATUS_UNMODIFIED = chalk.gray('Unmodified')

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
 * Push local templates to Postmark
 */
async function push(serverToken: string, args: TemplatePushArguments): Promise<void> {
  const { templatesdirectory, force, requestHost, all } = args;

  const client = new ServerClient(serverToken);
  if (requestHost !== undefined && requestHost !== "") {
    client.setClientOptions({ requestHost });
  }

  const spinner = ora("Fetching templates...").start();
  try {
    const manifest = createManifest(templatesdirectory);

    if (manifest.length === 0) {
      return fatalError("No templates or layouts were found.");
    }

    try {
      const templateList = await client.getTemplates({ count: 300 });
      const newList = templateList.TotalCount === 0
        ? []
        : await getTemplateContent(client, templateList, spinner);

      return await processTemplates({
        newList,
        manifest,
        all,
        force,
        spinner,
        client,
      });
    } catch (error) {
      return fatalError(error);
    }
  } finally {
    spinner.stop();
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
async function processTemplates({ newList, manifest, all, force, spinner, client }: ProcessTemplates): Promise<void> {
  const pushManifest = compareTemplates(newList, manifest, all)

  spinner.stop()
  if (pushManifest.length === 0) return log('There are no changes to push.')

  // Show which templates are changing
  printReview(prepareReview(pushManifest))

  // Push templates if force arg is present
  if (force || await confirmation()) {
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
  return confirm({ default: defaultResponse, message })
}

/**
 * Compare templates on server against local
 */
function compareTemplates(remote: TemplateManifest[], local: TemplateManifest[], pushAll: boolean): TemplateManifest[] {
  const result: TemplateManifest[] = []

  for (const template of local) {
    const match = find(remote, { Alias: template.Alias })
    template.New = !match

    if (!match) {
      template.Status = STATUS_ADDED
      result.push(template)
    } else {
      const modified = wasModified(match, template)
      template.Status = modified ? STATUS_MODIFIED : STATUS_UNMODIFIED

      // Push all templates if --all argument is present,
      // regardless of whether templates were modified
      if (pushAll || modified) {
        result.push(template)
      }
    }
  }

  return result;
}

/**
 * Check if local template is different than server
 */
function wasModified(remote: TemplateManifest, local: TemplateManifest): boolean {
  const diff = templatesDiff(remote, local)
  const result = diff.size > 0

  debug('Template %o was modified: %o. %o', local.Alias, result, diff)

  return result
}

function prepareReview(pushManifest: TemplateManifest[]): TemplatePushReview {
  const templates: ReviewItem[] = []
  const layouts: ReviewItem[] = []

  for (const template of pushManifest) {
    if (template.TemplateType === TemplateTypes.Layout) {
      layouts.push([template.Status, template.Name, template.Alias || undefined])
      continue
    } else {
      templates.push([
        template.Status,
        template.Name,
        template.Alias || undefined,
        layoutUsedLabel(template.LayoutTemplate, template.LayoutTemplate),
      ])
    }
  }

  return {
    templates,
    layouts,
  }

  function layoutUsedLabel(localLayout: MaybeString, remoteLayout: MaybeString): string {
    let label = localLayout || chalk.gray('None')

    if (!sameContent(localLayout, remoteLayout)) {
      label += chalk.red(`  ✘ ${remoteLayout || 'None'}`)
    }

    return label
  }
}

/**
 * Show which templates will change after the publish
 */
function printReview({ templates, layouts }: TemplatePushReview) {
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
  let failed = 0

  for (const template of templates) {
    spinner.color = 'yellow'
    spinner.text = `Pushing template: ${template.Alias}`
    if (template.New) {
      try {
        await client.createTemplate(template)
      } catch (error) {
        handleError(error, template)
        failed++
      }
    } else {
      invariant(template.Alias, 'Template alias is required')
      try {
        await client.editTemplate(template.Alias, template)
      } catch (error) {
        handleError(error, template)
        failed++
      }
    }
  }

  spinner.stop()

  log('✅ All finished!', { color: 'green' })

  if (failed > 0) {
    logError(
      `⚠️ Failed to push ${failed} ${pluralize(failed, 'template', 'templates')}. Please see the output above for more details.`
    )
  }

  function handleError(error: unknown, template: TemplateManifest) {
    spinner.stop()
    logError(`\n${template.Alias || template.Name}: ${error}`)
    spinner.start()
  }
}