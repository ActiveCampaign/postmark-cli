import chalk from 'chalk'
import ora from 'ora'
import { join, dirname } from 'path'
import { find } from 'lodash'
import { prompt } from 'inquirer'
import traverse from 'traverse'
import { table, getBorderCharacters } from 'table'
import untildify from 'untildify'
import { readJsonSync, readFileSync, existsSync } from 'fs-extra'
import dirTree from 'directory-tree'
import { ServerClient } from 'postmark'
import {
  TemplateManifest,
  TemplatePushResults,
  TemplatePushReview,
  TemplatePushArguments,
  Templates,
  MetaFileTraverse,
  MetaFile,
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
        compareTemplates(response, manifest)

        // Show which templates are changing
        spinner.stop()
        printReview(review)

        // Push templates if force arg is present
        if (force) {
          spinner.text = 'Pushing templates to Postmark...'
          spinner.start()
          return pushTemplates(spinner, client, manifest)
        }

        // Ask for user confirmation
        confirmation().then(answer => {
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
    spinner.stop()
    log('No templates or layouts were found.', { error: true })
    process.exit(1)
  }
}

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
  response: Templates,
  manifest: TemplateManifest[]
): void => {
  // Iterate through manifest
  manifest.forEach(template => {
    // See if this local template exists on the server
    const match = find(response.Templates, { Alias: template.Alias })
    template.New = !match

    let reviewData = [
      template.New ? chalk.green('Added') : chalk.yellow('Modified'),
      template.Name,
      template.Alias,
    ]

    if (template.TemplateType === 'Standard') {
      // Add layout used column
      reviewData.push(
        layoutUsedLabel(
          template.LayoutTemplate,
          match ? match.LayoutTemplate : template.LayoutTemplate
        )
      )

      review.templates.push(reviewData)
    } else {
      review.layouts.push(reviewData)
    }
  })
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
 * Parses templates folder and files
 */
const createManifest = (path: string): TemplateManifest[] => {
  let manifest: TemplateManifest[] = []

  // Return empty array if path does not exist
  if (!existsSync(path)) return manifest

  // Find meta files and flatten into collection
  const list: MetaFileTraverse[] = FindMetaFiles(path)

  // Parse each directory
  list.forEach(file => {
    const item = createManifestItem(file)
    if (item) manifest.push(item)
  })

  return manifest
}

/**
 * Gathers the template's content and metadata based on the metadata file location
 */
const createManifestItem = (file: any): MetaFile | null => {
  const { path } = file // Path to meta file
  const rootPath = dirname(path) // Folder path
  const htmlPath = join(rootPath, 'content.html') // HTML path
  const textPath = join(rootPath, 'content.txt') // Text path

  // Check if meta file exists
  if (existsSync(path)) {
    const metaFile: MetaFile = readJsonSync(path)
    const htmlFile: string = existsSync(htmlPath)
      ? readFileSync(htmlPath, 'utf-8')
      : ''
    const textFile: string = existsSync(textPath)
      ? readFileSync(textPath, 'utf-8')
      : ''

    return {
      HtmlBody: htmlFile,
      TextBody: textFile,
      ...metaFile,
    }
  }

  return null
}

/**
 * Searches for all metadata files and flattens into a collection
 */
const FindMetaFiles = (path: string): MetaFileTraverse[] =>
  traverse(dirTree(path)).reduce((acc, file) => {
    if (file.name === 'meta.json') acc.push(file)
    return acc
  }, [])

/**
 * Show which templates will change after the publish
 */
const printReview = (review: TemplatePushReview) => {
  const { templates, layouts } = review

  // Table headers
  const header = [chalk.gray('Change'), chalk.gray('Name'), chalk.gray('Alias')]
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
