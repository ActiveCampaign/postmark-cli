import ora from 'ora'
import untildify from 'untildify'
import invariant from 'ts-invariant'
import { join } from 'path'
import { outputFileSync, existsSync, ensureDirSync } from 'fs-extra'
import { confirm } from '@inquirer/prompts'
import { ServerClient } from 'postmark'
import type { Template, Templates } from 'postmark/dist/client/models'

import { MetaFile } from '../../types'
import {
  log,
  validateToken,
  pluralize,
  logError,
  fatalError,
} from '../../utils'

export const command = 'pull <output directory> [options]'
export const desc = 'Pull templates from a server to <output directory>'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  'request-host': {
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

interface TemplatePullArguments {
  serverToken: string
  requestHost: string
  outputdirectory: string
  overwrite: boolean
}
export async function handler(args: TemplatePullArguments): Promise<void> {
  const serverToken = await validateToken(args.serverToken)
  pull(serverToken, args)
}

/**
 * Begin pulling the templates
 */
async function pull(
  serverToken: string,
  args: TemplatePullArguments,
): Promise<void> {
  const { outputdirectory, overwrite, requestHost } = args

  // Check if directory exists
  if (existsSync(untildify(outputdirectory)) && !overwrite) {
    return overwritePrompt(serverToken, outputdirectory, requestHost)
  }

  return fetchTemplateList({
    sourceServer: serverToken,
    outputDir: outputdirectory,
    requestHost: requestHost,
  })
}

/**
 * Ask user to confirm overwrite
 */
async function overwritePrompt(
  serverToken: string,
  outputdirectory: string,
  requestHost: string,
): Promise<void> {
  const answer = await confirm({
    default: false,
    message: `Overwrite the files in ${outputdirectory}?`,
  })

  if (answer) {
    return fetchTemplateList({
      sourceServer: serverToken,
      outputDir: outputdirectory,
      requestHost: requestHost,
    })
  }
}

interface TemplateListOptions {
  sourceServer: string
  requestHost: string
  outputDir: string
}
/**
 * Fetch template list from PM
 */
async function fetchTemplateList(options: TemplateListOptions) {
  const { sourceServer, outputDir, requestHost } = options
  const spinner = ora('Pulling templates from Postmark...').start()
  const client = new ServerClient(sourceServer)
  if (requestHost !== undefined && requestHost !== '') {
    client.setClientOptions({ requestHost })
  }

  try {
    const templates = await client.getTemplates({ count: 300 })

    if (templates.TotalCount === 0) {
      spinner.stop()
      return fatalError('There are no templates on this server.')
    } else {
      await processTemplates({ spinner, client, outputDir, templates })
    }
  } catch (err) {
    spinner.stop()
    return fatalError(err)
  }
}

interface ProcessTemplatesOptions {
  spinner: ora.Ora
  client: ServerClient
  outputDir: string
  templates: Templates
}
/**
 * Fetch each template’s content from the server
 */
async function processTemplates(options: ProcessTemplatesOptions) {
  const { spinner, client, outputDir, templates } = options

  // Keep track of requests
  let requestCount = 0

  // keep track of templates downloaded
  let totalDownloaded = 0

  // Iterate through each template and fetch content
  for (const template of templates.Templates) {
    spinner.text = `Downloading template: ${template.Alias || template.Name}`

    // Show warning if template doesn't have an alias
    if (!template.Alias) {
      requestCount++
      log(
        `Template named "${template.Name}" will not be downloaded because it is missing an alias.`,
        { warn: true },
      )

      // If this is the last template
      if (requestCount === templates.TotalCount) spinner.stop()
      return
    }

    // Make request to Postmark
    try {
      const response = await client.getTemplate(template.Alias)
      requestCount++

      // Save template to file system
      await saveTemplate(outputDir, response, client)
      totalDownloaded++

      // Show feedback when finished saving templates
      if (requestCount === templates.TotalCount) {
        spinner.stop()

        log(
          `All finished! ${totalDownloaded} ${pluralize(
            totalDownloaded,
            'template has',
            'templates have',
          )} been saved to ${outputDir}.`,
          { color: 'green' },
        )
      }
    } catch (e) {
      spinner.stop()
      logError(e)
    }
  }
}

/**
 * Save template
 * @return An object containing the HTML and Text body
 */
async function saveTemplate(
  outputDir: string,
  template: Template,
  client: ServerClient,
) {
  invariant(
    typeof template.Alias === 'string' && !!template.Alias,
    'Template must have an alias',
  )

  outputDir =
    template.TemplateType === 'Layout' ? join(outputDir, '_layouts') : outputDir

  const path: string = untildify(join(outputDir, template.Alias))

  ensureDirSync(path)

  // Save HTML version
  if (template.HtmlBody !== '') {
    outputFileSync(join(path, 'content.html'), template.HtmlBody)
  }

  // Save Text version
  if (template.TextBody !== null && template.TextBody !== '') {
    outputFileSync(join(path, 'content.txt'), template.TextBody)
  }

  const meta: MetaFile = {
    Name: template.Name,
    Alias: template.Alias,
    ...(template.Subject && { Subject: template.Subject }),
    TemplateType: template.TemplateType,
    ...(template.TemplateType === 'Standard' && {
      LayoutTemplate: template.LayoutTemplate || undefined,
    }),
  }

  // Save suggested template model
  return client
    .validateTemplate({
      ...(template.HtmlBody && { HtmlBody: template.HtmlBody }),
      ...(template.TextBody && { TextBody: template.TextBody }),
      ...meta,
    })
    .then(result => {
      meta.TestRenderModel = result.SuggestedTemplateModel
    })
    .catch(error => {
      logError('Error fetching suggested template model')
      logError(error)
    })
    .then(() => {
      // Save the file regardless of success or error when fetching suggested model
      outputFileSync(join(path, 'meta.json'), JSON.stringify(meta, null, 2))
    })
}
