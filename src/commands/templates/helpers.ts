import { join, dirname } from 'path'
import { readJsonSync, readFileSync, existsSync } from 'fs-extra'
import traverse from 'traverse'
import dirTree from 'directory-tree'
import { TemplateManifest, MetaFileTraverse, MetaFile } from '../../types'

/**
 * Parses templates folder and files
 */

export const createManifest = (path: string): TemplateManifest[] => {
  let manifest: TemplateManifest[] = []

  // Return empty array if path does not exist
  if (!existsSync(path)) return manifest

  // Find meta files and flatten into collection
  const list: MetaFileTraverse[] = findMetaFiles(path)

  // Parse each directory
  list.forEach(file => {
    const item = createManifestItem(file)
    if (item) manifest.push(item)
  })

  return manifest
}

/**
 * Searches for all metadata files and flattens into a collection
 */
export const findMetaFiles = (path: string): MetaFileTraverse[] =>
  traverse(dirTree(path)).reduce((acc, file) => {
    if (file.name === 'meta.json') acc.push(file)
    return acc
  }, [])

/**
 * Gathers the template's content and metadata based on the metadata file location
 */
export const createManifestItem = (file: any): MetaFile | null => {
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
