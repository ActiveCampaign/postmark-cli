export class TemplateManifest {
  constructor(
    Name?: string,
    Subject?: string,
    HtmlBody?: string,
    TextBody?: string,
    Alias?: string | null
  ) {
    this.Name = Name
    this.Subject = Subject
    this.HtmlBody = HtmlBody
    this.TextBody = TextBody
    this.Alias = Alias
  }

  Name?: string
  Subject?: string
  HtmlBody?: string
  TextBody?: string
  Alias?: string | null
  New?: boolean
}

export interface Template extends TemplateManifest {
  Name: string
  TemplateId: number
  AssociatedServerId?: number
  Active: boolean
}

export interface ListTemplate {
  Active: boolean
  TemplateId: number
  Name: string
  Alias?: string | null
}

export interface Templates {
  TotalCount: number
  Templates: ListTemplate[]
}

export interface TemplatePushResults {
  success: number
  failed: number
}

export interface TemplatePushReview {
  files: Array<any>
  added: number
  modified: number
}

export interface ProcessTemplatesOptions {
  spinner: any
  client: any
  outputDir: string
  totalCount: number
  templates: Array<ListTemplate>
}

export interface TemplateListOptions {
  sourceServer: string
  outputDir: string
}
