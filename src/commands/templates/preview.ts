import chalk from 'chalk'
import { existsSync } from 'fs-extra'
import { filter, find, replace, debounce } from 'lodash'
import untildify from 'untildify'
import express from 'express'
import { createMonitor } from 'watch'
import consolidate from 'consolidate'
import { ServerClient } from 'postmark'
import { createManifest } from './helpers'
import { TemplatePreviewArguments } from '../../types'
import { log, validateToken } from '../../utils'

export const command = 'preview  <templates directory> [options]'
export const desc = 'Preview your templates and layouts together'
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

  return validateToken(serverToken).then(() => {
    validateDirectory(args)
  })
}

const validateDirectory = (args: TemplatePreviewArguments) => {
  const { templatesdirectory } = args
  const rootPath: string = untildify(templatesdirectory)

  // Check if path exists
  if (!existsSync(rootPath)) {
    log('The provided path does not exist', { error: true })
    return process.exit(1)
  }

  return preview(args)
}

/**
 * Preview
 */
const preview = (args: TemplatePreviewArguments) => {
  const { port, templatesdirectory, serverToken } = args
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
    const templates = filter(manifest, { TemplateType: 'Standard' })
    const layouts = filter(manifest, { TemplateType: 'Layout' })
    const path = untildify(templatesdirectory).replace(/\/$/, '')

    consolidate.ejs(
      'preview/index.ejs',
      { templates, layouts, path },
      (err, html) => {
        if (err) return res.send(err)

        return res.send(html)
      }
    )
  })

  /**
   * Get template by alias
   */
  app.get('/:alias', (req, res) => {
    const template = find(manifest, { Alias: req.params.alias })

    if (template) {
      consolidate.ejs('preview/template.ejs', { template }, (err, html) => {
        if (err) return res.send(err)

        return res.send(html)
      })
    } else {
      // Redirect to index
      res.redirect(301, '/')
    }
  })

  /**
   * Get template HTML version by alias
   */
  app.get('/html/:alias', (req, res) => {
    const template: any = find(manifest, { Alias: req.params.alias })
    const layout: any = find(manifest, { Alias: template.LayoutTemplate })

    if (template && template.HtmlBody) {
      const source = layout
        ? combineTemplate(layout.HtmlBody, template.HtmlBody)
        : template.HtmlBody

      const payload = {
        HtmlBody: source,
        TemplateType: template.TemplateType,
      }

      client
        .validateTemplate(payload)
        .then(result => {
          if (result.HtmlBody.ContentIsValid) {
            return res.send(result.HtmlBody.RenderedContent)
          }

          return renderTemplateInvalid(res, result.HtmlBody.ValidationErrors)
        })
        .catch(error => {
          return res.status(500).send(error)
        })
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
      const source = layout
        ? combineTemplate(layout.TextBody, template.TextBody)
        : template.TextBody

      const payload = {
        TextBody: source,
        TemplateType: template.TemplateType,
      }

      client
        .validateTemplate(payload)
        .then(result => {
          if (result.TextBody.ContentIsValid) {
            return renderTemplateText(res, result.TextBody.RenderedContent)
          }

          return renderTemplateInvalid(res, result.TextBody.ValidationErrors)
        })
        .catch(error => {
          return res.status(500).send(error)
        })
    } else {
      return renderTemplate404(res, 'Text')
    }
  })

  server.listen(port, () => {
    log(`${title} Template preview server ready. Happy coding!`)
    log(divider)
    log(`URL: ${chalk.green(`http://localhost:${port}`)}`)
    log(divider)
  })
}

const title = `${chalk.yellow('ﾐ▢ Postmark')}${chalk.gray(':')}`
const divider = chalk.gray('-'.repeat(34))

const combineTemplate = (layout: string, template: string): string =>
  replace(layout, /({{{)(.?@content.?)(}}})/g, template)

/* Render Templates */

const renderTemplateText = (res: express.Response, body: string) =>
  consolidate.ejs('preview/templateText.ejs', { body }, (err, html) => {
    if (err) return res.send(err)

    return res.send(html)
  })

const renderTemplateInvalid = (res: express.Response, errors: any) =>
  consolidate.ejs('preview/templateInvalid.ejs', { errors }, (err, html) => {
    if (err) return res.send(err)

    return res.send(html)
  })

const renderTemplate404 = (res: express.Response, version: string) =>
  consolidate.ejs('preview/template404.ejs', { version }, (err, html) => {
    if (err) return res.send(err)

    return res.status(404).send(html)
  })
