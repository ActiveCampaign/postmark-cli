import chalk from 'chalk'
import path from 'path'
import untildify from 'untildify'
import express from 'express'
import consolidate from 'consolidate'
import { filter, find, replace, debounce } from 'lodash'
import { createMonitor } from 'watch'
import { ServerClient } from 'postmark'
import { TemplateValidationOptions } from 'postmark/dist/client/models'

import { fatalError, log, validateToken } from '../../utils'

import { validatePushDirectory } from './push'
import { createManifest } from './helpers'

const previewPath = path.join(__dirname, 'preview')
const templateLinks = '<base target="_blank" />'

export const command = 'preview  <templates directory> [options]'
export const desc = 'Preview your templates and layouts'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  port: {
    type: 'number',
    describe: 'The port to open up the preview server on',
    default: 3005,
    alias: 'p',
  },
}

interface TemplatePreviewArguments {
  serverToken: string
  templatesdirectory: string
  port: number
}
export async function handler(args: TemplatePreviewArguments): Promise<void> {
  const serverToken = await validateToken(args.serverToken)

  try {
    validatePushDirectory(args.templatesdirectory)
  } catch (e) {
    return fatalError(e)
  }

  return preview(serverToken, args)
}


/**
 * Preview
 */
async function preview(serverToken: string, args: TemplatePreviewArguments): Promise<void> {
  const { port, templatesdirectory } = args
  log(`${title} Starting template preview server...`)

  // Start server
  const app = express()
  const server = require('http').createServer(app)
  const io = require('socket.io')(server)

  // Cache manifest and Postmark server
  const client = new ServerClient(serverToken)
  let manifest = createManifest(templatesdirectory)

  // Static assets
  app.use(express.static(`${previewPath}/assets`))

  function updateEvent() {
    // Generate new manifest
    manifest = createManifest(templatesdirectory)

    // Trigger reload on client
    log(`${title} File changed. Reloading browser...`)
    io.emit('change')
  }

  // Watch for file changes
  createMonitor(untildify(templatesdirectory), { interval: 2 }, monitor => {
    monitor.on('created', debounce(updateEvent, 1000))
    monitor.on('changed', debounce(updateEvent, 1000))
    monitor.on('removed', debounce(updateEvent, 1000))
  })

  // Template listing
  app.get('/', (req, res) => {
    manifest = createManifest(templatesdirectory)
    const templates = filter(manifest, { TemplateType: 'Standard' })
    const layouts = filter(manifest, { TemplateType: 'Layout' })
    const path = untildify(templatesdirectory).replace(/\/$/, '')

    consolidate.ejs(
      `${previewPath}/index.ejs`,
      { templates, layouts, path },
      (err, html) => renderTemplateContents(res, err, html)
    )
  })

  /**
   * Get template by alias
   */
  app.get('/:alias', (req, res) => {
    const template = find(manifest, { Alias: req.params.alias })

    if (template) {
      consolidate.ejs(
        `${previewPath}/template.ejs`,
        { template },
        (err, html) => renderTemplateContents(res, err, html)
      )
    } else {
      // Redirect to index
      return res.redirect(301, '/')
    }
  })

  /**
   * Get template HTML version by alias
   */
  app.get('/html/:alias', (req, res) => {
    const template: any = find(manifest, { Alias: req.params.alias })

    if (template && template.HtmlBody) {
      const layout: any = find(manifest, { Alias: template.LayoutTemplate })

      // Render error if layout is specified, but HtmlBody is empty
      if (layout && !layout.HtmlBody)
        return renderTemplateInvalid(res, layoutError)

      const { TemplateType, TestRenderModel } = template
      const payload = {
        HtmlBody: getSource('html', template, layout),
        TemplateType,
        TestRenderModel,
        Subject: template.Subject,
      }

      return validateTemplateRequest('html', payload, res)
    } else {
      return renderTemplate404(res, 'HTML')
    }
  })

  /**
   * Get template text version by alias
   */
  app.get('/text/:alias', (req, res) => {
    const template: any = find(manifest, { Alias: req.params.alias })

    if (template && template.TextBody) {
      const layout: any = find(manifest, { Alias: template.LayoutTemplate })

      // Render error if layout is specified, but HtmlBody is empty
      if (layout && !layout.TextBody)
        return renderTemplateInvalid(res, layoutError)

      const { TemplateType, TestRenderModel } = template
      const payload = {
        TextBody: getSource('text', template, layout),
        TemplateType,
        TestRenderModel,
      }

      return validateTemplateRequest('text', payload, res)
    } else {
      return renderTemplate404(res, 'Text')
    }
  })

  server.listen(port, () => {
    const url = `http://localhost:${port}`

    log(`${title} Template preview server ready. Happy coding!`)
    log(divider)
    log(`URL: ${chalk.green(url)}`)
    log(divider)
  })

  function validateTemplateRequest(version: 'html' | 'text',
    payload: TemplateValidationOptions,
    res: express.Response) {
    const versionKey = version === 'html' ? 'HtmlBody' : 'TextBody'

    // Make request to Postmark
    client
      .validateTemplate(payload)
      .then(result => {
        if (result[versionKey].ContentIsValid) {
          const renderedContent = result[versionKey].RenderedContent + templateLinks
          io.emit('subject', { ...result.Subject, rawSubject: payload.Subject })

          // Render raw source if HTML
          if (version === 'html') {
            return res.send(renderedContent)
          } else {
            // Render specific EJS with text content
            return renderTemplateText(res, renderedContent)
          }
        }

        return renderTemplateInvalid(res, result[versionKey].ValidationErrors)
      })
      .catch(error => {
        return res.status(500).send(error)
      })
  }
}

function combineTemplate(layout: string, template: string): string {
  return replace(layout, /({{{)(.?@content.?)(}}})/g, template)
}

/* Console helpers */

const title = `${chalk.yellow('ﾐ▢ Postmark')}${chalk.gray(':')}`
const divider = chalk.gray('-'.repeat(34))

/* Render Templates */

function getSource(version: 'html' | 'text', template: any, layout?: any) {
  const versionKey = version === 'html' ? 'HtmlBody' : 'TextBody'

  if (layout) return combineTemplate(layout[versionKey], template[versionKey])

  return template[versionKey]
}

function renderTemplateText(res: express.Response, body: string) {
  return consolidate.ejs(
    `${previewPath}/templateText.ejs`, 
    { body }, 
    (err, html) => renderTemplateContents(res, err, html)
  )
}

function renderTemplateInvalid(res: express.Response, errors: any) {
  return consolidate.ejs(
    `${previewPath}/templateInvalid.ejs`,
    { errors },
    (err, html) => renderTemplateContents(res, err, html)
  )
}

function renderTemplate404(res: express.Response, version: string) {
  return consolidate.ejs(
    `${previewPath}/template404.ejs`, 
    { version }, 
    (err, html) => renderTemplateContents(res, err, html)
  )
}

function renderTemplateContents(res: express.Response, err: any, html: string) {
  if (err) return res.send(err)

  return res.send(html)
}

const layoutError = [
  {
    Message:
      'A TemplateLayout is specified, but it is either empty or missing.',
  },
]
