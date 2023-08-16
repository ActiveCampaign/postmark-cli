import { expect } from "chai";
import "mocha";
import { templatesDiff } from "../../../../src/commands/templates/helpers";
import { TemplateManifest } from "../../../../src/types";

function makeTemplateManifest(): TemplateManifest {
  return {
    TemplateType: "Standard",
    HtmlBody: undefined,
    TextBody: undefined,
    Subject: undefined,
    Name: undefined,
    LayoutTemplate: undefined,
  }
}

describe("comparing templates", () => {
  it("detects changes in html body", () => {
    const t1: TemplateManifest = {
      ...makeTemplateManifest()
    };
    const t2: TemplateManifest = {
      ...makeTemplateManifest(),
      HtmlBody: "<p>hello</p>",
    };

    const diff = templatesDiff(t1, t2);

    expect(Array.from(diff)).to.eql(['html']);
  });

  it("detects changes in text body", () => {
    const t1: TemplateManifest = {
      ...makeTemplateManifest()
    };
    const t2: TemplateManifest = {
      ...makeTemplateManifest(),
      TextBody: "hello",
    };

    const diff = templatesDiff(t1, t2);

    expect(Array.from(diff)).to.eql(['text']);
  });

  it("detects changes in subject", () => {
    const t1: TemplateManifest = {
      ...makeTemplateManifest()
    };
    const t2: TemplateManifest = {
      ...makeTemplateManifest(),
      Subject: "hello",
    };

    const diff = templatesDiff(t1, t2);

    expect(Array.from(diff)).to.eql(['subject']);
  });

  it("detects changes in name", () => {
    const t1: TemplateManifest = {
      ...makeTemplateManifest()
    };
    const t2: TemplateManifest = {
      ...makeTemplateManifest(),
      Name: "hello",
    };

    const diff = templatesDiff(t1, t2);

    expect(Array.from(diff)).to.eql(['name']);
  });

  it("detects changes in layout", () => {
    const t1: TemplateManifest = {
      ...makeTemplateManifest()
    };
    const t2: TemplateManifest = {
      ...makeTemplateManifest(),
      LayoutTemplate: "hello",
    };

    const diff = templatesDiff(t1, t2);

    expect(Array.from(diff)).to.eql(['layout']);
  });

  context("when comparing empty strings with undefined values", () => {
    it("doesn't detect changes", () => {
      const t1: TemplateManifest = {
        ...makeTemplateManifest()
      };
      const t2: TemplateManifest = {
        ...makeTemplateManifest(),
        HtmlBody: "",
        TextBody: "",
        Subject: "",
        Name: "",
        LayoutTemplate: "",
      };

      const diff = templatesDiff(t1, t2);

      expect(Array.from(diff)).to.eql([]);
    });
  });
});
