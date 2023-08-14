import { TemplateTypes } from "postmark/dist/client/models"

export interface TemplateManifest {
  Name?: string
  Subject?: string
  HtmlBody?: string
  TextBody?: string
  Alias?: string | null
  New?: boolean
  Status?: string
  TemplateType: TemplateTypes
  LayoutTemplate?: string
}

export interface TemplatePushReview {
  layouts: any[]
  templates: any[]
}

export interface MetaFile {
  Name: string
  Alias: string
  TemplateType: TemplateTypes
  Subject?: string
  LayoutTemplate?: string
  HtmlBody?: string
  TextBody?: string
  TestRenderModel?: any
}

export interface MetaFileTraverse {
  path: string
  name: string
  size: number
  extension: string
  type: string
}
