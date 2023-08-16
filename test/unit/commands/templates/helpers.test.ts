import { expect } from 'chai'
import 'mocha'
import { templatesDiff } from '../../../../src/commands/templates/helpers'
import { TemplateManifest } from '../../../../src/types'

describe('templates diff', () => {
  it('comparing empty strings to undefined', () => {
    const t1: TemplateManifest = {
      TemplateType: "Standard",
      HtmlBody: undefined,
      TextBody: undefined,
      Subject: undefined,
      Name: undefined,
      LayoutTemplate: undefined,
    }
    const t2: TemplateManifest = {
      TemplateType: "Standard",
      HtmlBody: "",
      TextBody: "",
      Subject: "",
      Name: "",
      LayoutTemplate: "",
    }

    const diff = templatesDiff(t1, t2)

    expect(diff.htmlModified).to.equal(false)
    expect(diff.textModified).to.equal(false)
    expect(diff.nameModified).to.equal(false)
    expect(diff.subjectModified).to.equal(false)
    expect(diff.layoutModified).to.equal(false)
  })
})
  