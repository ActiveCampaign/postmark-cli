import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { ServerClient } from 'postmark'
import { TemplateTypes } from 'postmark/dist/client/models'
import { pushTemplates } from '../../../../src/commands/templates/push'
import { TemplateManifest } from '../../../../src/types'

describe("pushing templates", () => {
  it("pushes layouts before standard templates", async () => {
    const tm1 = makeStandardTemplateManifest({ Alias: "t1" })
    const tm2 = makeLayoutTemplateManifest({ Alias: "l1" })
    const tm3 = makeStandardTemplateManifest({ Alias: "t2" })

    const client = {
      editTemplate: sinon.stub(),
    }

    await pushTemplates(client as unknown as ServerClient, [tm1, tm2, tm3], sinon.stub(), handleError, sinon.stub())

    expect(client.editTemplate.callCount).to.eql(3)
    expect(client.editTemplate.getCall(0).args[0]).to.eql("l1")
    expect(client.editTemplate.getCall(1).args[0]).to.eql("t1")
    expect(client.editTemplate.getCall(2).args[0]).to.eql("t2")
  })

  it("notifies before pushing each template", async () => {
    const tm1 = makeStandardTemplateManifest({ Alias: "t1" })
    const tm2 = makeLayoutTemplateManifest({ Alias: "l1" })
    const tm3 = makeStandardTemplateManifest({ Alias: "t2" })

    const client = {
      editTemplate: sinon.stub(),
    } 
    const beforePush = sinon.stub()

    await pushTemplates(client as unknown as ServerClient, [tm1, tm2, tm3], beforePush, handleError, sinon.stub())

    expect(beforePush.callCount).to.eql(3)
  })

  it("notifies once after pushing all templates", async () => {
    const tm1 = makeStandardTemplateManifest({ Alias: "t1" })
    const tm2 = makeLayoutTemplateManifest({ Alias: "l1" })
    const tm3 = makeStandardTemplateManifest({ Alias: "t2" })

    const client = {
      editTemplate: sinon.stub(),
    }
    const completePush = sinon.stub()

    await pushTemplates(client as unknown as ServerClient, [tm1, tm2, tm3], sinon.stub(), handleError, completePush)

    expect(completePush.callCount).to.eql(1)
    expect(completePush.getCall(0).args[0]).to.eql(0) // 0 failures
  })

  it("gracefully handles push errors", async () => {
    const tm1 = makeStandardTemplateManifest({ Alias: "t1" })
    const tm2 = makeLayoutTemplateManifest({ Alias: "l1" })
    const tm3 = makeStandardTemplateManifest({ Alias: "t2" })

    let callCount = 0

    const client = {
      editTemplate: sinon.stub().callsFake(() => {
        callCount++
        if (callCount > 1) {
          return Promise.reject(new Error("boom"))
        } else {
          return Promise.resolve()
        }
      }),
    }
    const completePush = sinon.stub()
    const handleError = sinon.stub()

    await pushTemplates(client as unknown as ServerClient, [tm1, tm2, tm3], sinon.stub(), handleError, completePush)

    expect(handleError.callCount).to.eql(2)

    expect(completePush.callCount).to.eql(1)
    expect(completePush.getCall(0).args[0]).to.eql(2) // 2 failures
  })

})

function handleError(template: TemplateManifest, error: unknown): void {
  console.error(`Error pushing template ${template.Alias}: ${error}`)
}

function makeTemplateManifest(): TemplateManifest {
  return {
    TemplateType: TemplateTypes.Standard,
    HtmlBody: undefined,
    TextBody: undefined,
    Subject: undefined,
    Name: undefined,
    LayoutTemplate: undefined,
  }
}

function makeStandardTemplateManifest(props: Partial<TemplateManifest>): TemplateManifest {
  return {
    ...makeTemplateManifest(),
    ...props,
    TemplateType: TemplateTypes.Standard,
  }
}

function makeLayoutTemplateManifest(props: Partial<TemplateManifest>): TemplateManifest {
  return {
    ...makeTemplateManifest(),
    ...props,
    TemplateType: TemplateTypes.Layout,
  }
}
