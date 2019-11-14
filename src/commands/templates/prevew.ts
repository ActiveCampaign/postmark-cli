import { join, dirname } from 'path'
import { readJsonSync, readFileSync, existsSync } from 'fs-extra'
import traverse from 'traverse'
import { filter, find, replace } from 'lodash'
import untildify from 'untildify'
import dirTree from 'directory-tree'
import express from 'express'
import consolidate from 'consolidate'
import {
  TemplatePreviewArguments,
  TemplateManifest,
  MetaFileTraverse,
  MetaFile,
} from '../../types'
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

// TODO: we can probably reuse this with push.ts
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
  const app = express()
  const port = args.port

  app.use(express.static('preview/assets'))

  app.get('/', (req, res) => {
    const manifest = createManifest(args.templatesdirectory)
    const templates = compileTemplates(manifest)

    consolidate.ejs(
      'preview/index.html',
      {
        templates: filter(templates, { TemplateType: 'Standard' }),
        layouts: filter(templates, { TemplateType: 'Layout' }),
        path: untildify(args.templatesdirectory),
      },
      (err, html) => {
        if (err) res.send(err)

        return res.send(html)
      }
    )
  })

  app.get('/:alias', (req, res) => {
    const manifest = createManifest(args.templatesdirectory)
    const compiled = compileTemplates(manifest)
    const template: any = find(compiled, { Alias: req.params.alias })

    consolidate.ejs(
      'preview/template.html',
      { template: template },
      (err, html) => {
        if (err) res.send(err)

        return res.send(html)
      }
    )
  })

  app.get('/html/:alias', (req, res) => {
    const manifest = createManifest(args.templatesdirectory)
    const compiled = compileTemplates(manifest)
    const template: any = find(compiled, { Alias: req.params.alias })

    if (template && template.HtmlBody) {
      return res.send(template.HtmlBody)
    }

    return res.status(404)
  })

  app.get('/text/:alias', (req, res) => {
    const manifest = createManifest(args.templatesdirectory)
    const compiled = compileTemplates(manifest)
    const template: any = find(compiled, { Alias: req.params.alias })

    if (template && template.TextBody) {
      res.set('Content-Type', 'text/plain')
      res.write(template.TextBody)
      return res.end()
    }

    return res.status(404)
  })

  app.listen(port, () =>
    console.log(`Previews available at http://localhost:${port}!`)
  )
}

const compileTemplates = (manifest: TemplateManifest[]) => {
  let compiled: any = []
  const layouts = filter(manifest, { TemplateType: 'Layout' })
  const templates = filter(manifest, { TemplateType: 'Standard' })

  templates.forEach(template => {
    const layout = find(layouts, { Alias: template.LayoutTemplate || '' })

    if (!layout) return
    if (!layout.HtmlBody && !layout.TextBody) return

    compiled.push({
      ...template,
      HtmlBody: compileTemplate(layout.HtmlBody || '', template.HtmlBody || ''),
      TextBody: compileTemplate(layout.TextBody || '', template.TextBody || ''),
    })
  })

  layouts.forEach(layout => {
    if (!layout.HtmlBody && !layout.TextBody) return
    const content = 'Template content is inserted here.'

    compiled.push({
      ...layout,
      HtmlBody: compileTemplate(layout.HtmlBody || '', content),
      TextBody: compileTemplate(layout.TextBody || '', content),
    })
  })

  return compiled
}

const compileTemplate = (layout: string, template: string): string =>
  replace(layout, /({{{)(.?@content.?)(}}})/g, template)

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
