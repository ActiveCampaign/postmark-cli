import { TemplateInList } from "postmark/dist/client/models"

export interface TemplateManifest {
  Name?: string
  Subject?: string
  HtmlBody?: string
  TextBody?: string
  Alias?: string
  New?: boolean
  Status?: string
  TemplateType: string
  LayoutTemplate?: string | null
}

export interface Template extends TemplateManifest {
  Name: string
  TemplateId: number
  AssociatedServerId?: number
  Active: boolean
  Alias: string
}



export interface TemplatePushResults {
  success: number
  failed: number
}

export interface TemplatePushReview {
  layouts: any[]
  templates: any[]
}

export interface ProcessTemplatesOptions {
  spinner: any
  client: any
  outputDir: string
  totalCount: number
  templates: TemplateInList[]
}

export interface TemplateListOptions {
  sourceServer: string
  requestHost: string
  outputDir: string
}

export interface TemplatePullArguments {
  serverToken: string
  requestHost: string
  outputdirectory: string
  overwrite: boolean
}

export interface TemplatePushArguments {
  serverToken: string
  requestHost: string
  templatesdirectory: string
  force: boolean
  all: boolean
}

export interface TemplatePreviewArguments {
  serverToken: string
  templatesdirectory: string
  port: number
}

export interface MetaFile {
  Name: string
  Alias: string
  TemplateType: string
  Subject?: string
  LayoutTemplate?: string | null
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

export interface TemplateValidationPayload {
  TextBody: string
  TemplateType: 'Standard' | 'Layout'
}

export interface ProcessTemplates {
  newList: TemplateManifest[]
  manifest: TemplateManifest[]
  all: boolean
  force: boolean
  spinner: any
  client: any
}
