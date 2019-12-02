import chalk from 'chalk'
import { existsSync } from 'fs-extra'
import { filter, find } from 'lodash'
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

  // Update manifest when files change
  createMonitor(untildify(templatesdirectory), { interval: 2 }, monitor => {
    function eventHandler() {
      manifest = createManifest(templatesdirectory)

      // Trigger reload on client
      log(`${title} File changed. Reloading browser...`)
      io.emit('change')
    }

    // Monitor all events
    monitor.on('created', eventHandler)
    monitor.on('changed', eventHandler)
    monitor.on('removed', eventHandler)
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
    const template: any = find(manifest, { Alias: req.params.alias })

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

    if (template && template.HtmlBody) {
      client
        .validateTemplate({
          Subject: template.Subject || '',
          HtmlBody: template.HtmlBody,
          LayoutTemplate: template.LayoutTemplate || '',
        })
        .then(result => {
          return res.send(result.HtmlBody.RenderedContent)
        })
        .catch(error => {
          return res.send(500).send(error)
        })
    } else {
      consolidate.ejs(
        'preview/template404.ejs',
        { version: 'HTML' },
        (err, html) => {
          if (err) return res.send(err)

          return res.status(404).send(html)
        }
      )
    }
  })

  /**
   * Get template text version by alias
   */
  app.get('/text/:alias', (req, res) => {
    const template: any = find(manifest, { Alias: req.params.alias })

    if (template && template.TextBody) {
      client
        .validateTemplate({
          Subject: template.Subject || '',
          TextBody: template.TextBody,
          LayoutTemplate: template.LayoutTemplate || '',
        })
        .then(result => {
          consolidate.ejs(
            'preview/templateText.ejs',
            { body: result.TextBody.RenderedContent },
            (err, html) => {
              if (err) return res.send(err)

              return res.send(html)
            }
          )
        })
        .catch(error => {
          return res.send(500).send(error)
        })
    } else {
      consolidate.ejs(
        'preview/template404.ejs',
        { version: 'Text' },
        (err, html) => {
          if (err) return res.send(err)

          return res.status(404).send(html)
        }
      )
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
