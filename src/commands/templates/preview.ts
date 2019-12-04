import chalk from 'chalk'
import { existsSync } from 'fs-extra'
import { filter, find, replace, debounce } from 'lodash'
import untildify from 'untildify'
import express from 'express'
import { createMonitor } from 'watch'
import consolidate from 'consolidate'
import { ServerClient } from 'postmark'
import open from 'open'
import { createManifest } from './helpers'
import { TemplatePreviewArguments } from '../../types'
import { TemplateValidationOptions } from 'postmark/dist/client/models'
import { log, validateToken } from '../../utils'

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
export const handler = (args: TemplatePreviewArguments) => exec(args)

/**
 * Execute the command
 */
const exec = (args: TemplatePreviewArguments) => {
  const { serverToken } = args

  return validateToken(serverToken).then(token => {
    validateDirectory(token, args)
  })
}

const validateDirectory = (
  serverToken: string,
  args: TemplatePreviewArguments
) => {
  const { templatesdirectory } = args
  const rootPath: string = untildify(templatesdirectory)

  // Check if path exists
  if (!existsSync(rootPath)) {
    log('The provided path does not exist', { error: true })
    return process.exit(1)
  }

  return preview(serverToken, args)
}

/**
 * Preview
 */
const preview = (serverToken: string, args: TemplatePreviewArguments) => {
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
  app.use(express.static('preview/assets'))

  const updateEvent = () => {
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
      'preview/index.ejs',
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
      consolidate.ejs('preview/template.ejs', { template }, (err, html) =>
        renderTemplateContents(res, err, html)
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
    const layout: any = find(manifest, { Alias: template.LayoutTemplate })

    if (template && template.HtmlBody) {
      // Render error if layout is specified, but HtmlBody is empty
      if (layout && !layout.HtmlBody)
        return renderTemplateInvalid(res, layoutError)

      const payload = {
        HtmlBody: getSource('html', template, layout),
        TemplateType: template.TemplateType,
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
    const layout: any = find(manifest, { Alias: template.LayoutTemplate })

    if (template && template.TextBody) {
      // Render error if layout is specified, but HtmlBody is empty
      if (layout && !layout.TextBody)
        return renderTemplateInvalid(res, layoutError)

      const payload = {
        TextBody: getSource('text', template, layout),
        TemplateType: template.TemplateType,
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

    open(url)
  })

  const validateTemplateRequest = (
    version: 'html' | 'text',
    payload: TemplateValidationOptions,
    res: express.Response
  ) => {
    const versionKey = version === 'html' ? 'HtmlBody' : 'TextBody'

    // Make request to Postmark
    client
      .validateTemplate(payload)
      .then(result => {
        if (result[versionKey].ContentIsValid) {
          const renderedContent = result[versionKey].RenderedContent

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

const combineTemplate = (layout: string, template: string): string =>
  replace(layout, /({{{)(.?@content.?)(}}})/g, template)

/* Console helpers */

const title = `${chalk.yellow('ﾐ▢ Postmark')}${chalk.gray(':')}`
const divider = chalk.gray('-'.repeat(34))

/* Render Templates */

const getSource = (version: 'html' | 'text', template: any, layout?: any) => {
  const versionKey = version === 'html' ? 'HtmlBody' : 'TextBody'

  if (layout) return combineTemplate(layout[versionKey], template[versionKey])

  return template[versionKey]
}

const renderTemplateText = (res: express.Response, body: string) =>
  consolidate.ejs('preview/templateText.ejs', { body }, (err, html) =>
    renderTemplateContents(res, err, html)
  )

const renderTemplateInvalid = (res: express.Response, errors: any) =>
  consolidate.ejs('preview/templateInvalid.ejs', { errors }, (err, html) =>
    renderTemplateContents(res, err, html)
  )

const renderTemplate404 = (res: express.Response, version: string) =>
  consolidate.ejs('preview/template404.ejs', { version }, (err, html) =>
    renderTemplateContents(res, err, html)
  )

const renderTemplateContents = (
  res: express.Response,
  err: any,
  html: string
) => {
  if (err) return res.send(err)

  return res.send(html)
}

const layoutError = [
  {
    Message:
      'A TemplateLayout is specified, but it is either empty or missing.',
  },
]
