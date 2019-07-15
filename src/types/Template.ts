export interface TemplateManifest {
  Name?: string
  Subject?: string
  HtmlBody?: string
  TextBody?: string
  Alias?: string
  New?: boolean
  TemplateType: string
  LayoutTemplate?: string | null
}

export interface ListTemplate {
  Active: boolean
  TemplateId: number
  Name: string
  Alias?: string | null
  TemplateType: string
  LayoutTemplate: string | null
}

export interface Templates {
  TotalCount: number
  Templates: ListTemplate[]
}

export interface TemplatePushReview {
  layouts: any[]
  templates: any[]
}

export interface TemplatePullArguments {
  serverToken: string
  outputdirectory: string
  overwrite: boolean
}

export interface TemplatePushArguments {
  serverToken: string
  templatesdirectory: string
  force: boolean
}

export interface TemplateMetaFile {
  Name: string
  Alias: string
  TemplateType: string
  Subject?: string
  LayoutTemplate?: string | null
  HtmlBody?: string
  TextBody?: string
}

export interface FileDetails {
  path: string
  name: string
  size: number
  extension: string
  type: string
}
