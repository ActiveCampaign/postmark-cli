import chalk from 'chalk'
import { existsSync } from 'fs-extra'
import { filter, find } from 'lodash'
import untildify from 'untildify'
import express from 'express'
import { createMonitor } from 'watch'
import consolidate from 'consolidate'
import { createManifest, compileTemplates } from './helpers'
import { TemplatePreviewArguments } from '../../types'
import { log } from '../../utils'

export const command = 'preview  <templates directory> [options]'
export const desc = 'Preview your templates and layouts together'
export const builder = {
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
const exec = (args: TemplatePreviewArguments): void => validateDirectory(args)

const validateDirectory = (args: TemplatePreviewArguments) => {
  const rootPath: string = untildify(args.templatesdirectory)

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
  const { port, templatesdirectory } = args
  console.log(`${title} Starting template preview server...`)
  const app = express()
  const server = require('http').createServer(app)
  const io = require('socket.io')(server)

  // Cache manifest and compiled templates
  let manifest = createManifest(templatesdirectory)
  let compiled = compileTemplates(manifest)

  // Static assets
  app.use(express.static('preview/assets'))

  // Update manifest when files change
  createMonitor(untildify(templatesdirectory), { interval: 2 }, monitor => {
    function eventHandler() {
      // Update manifest and compiled templates
      manifest = createManifest(templatesdirectory)
      compiled = compileTemplates(manifest)

      console.log(`${title} File changed. Reloading browser...`)
      // Trigger reload on client
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
    const compiled = compileTemplates(manifest)
    const template: any = find(compiled, { Alias: req.params.alias })

    if (template && template.HtmlBody) {
      return res.send(template.HtmlBody)
    }

    return res.status(404).send('Not found!')
  })

  /**
   * Get template text version by alias
   */
  app.get('/text/:alias', (req, res) => {
    const template: any = find(compiled, { Alias: req.params.alias })

    if (template && template.TextBody) {
      consolidate.ejs(
        'preview/templateText.ejs',
        { body: template.TextBody },
        (err, html) => {
          if (err) return res.send(err)

          return res.send(html)
        }
      )
    } else {
      return res.status(404).send('Not found!')
    }
  })

  server.listen(port, () => {
    console.log(`${title} Template preview server ready. Happy coding!`)

    console.log(divider)
    console.log(`URL: ${chalk.green(`http://localhost:${port}`)}`)
    console.log(divider)
  })
}

const title = `${chalk.gray('::')}${chalk.yellow('Postmark')}${chalk.gray(
  '::'
)}`
const divider = chalk.gray(':'.repeat(34))
