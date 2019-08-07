import nconf from 'nconf'
import * as postmark from "postmark";

export const testingKeys = nconf.env().file({ file: __dirname + '/../config/testing_keys.json' });
export const accountToken: string = testingKeys.get('ACCOUNT_TOKEN');
export const serverToken: string = testingKeys.get('SERVER_TOKEN');
export const fromAddress: string = testingKeys.get('FROM_ADDRESS');
export const toAddress: string = testingKeys.get('TO_ADDRESS');

export const CLICommand: string = './dist/index.js';
export const TestDataFolder: string = './test/data';
export const PackageJson: any = require('../../package.json');

// In order to test template syncing, data needs to be created by postmark.js handler

const templatePrefix: string = "testing-template-cli";

function templateToCreate(templatePrefix: string) {
  return new postmark.Models.CreateTemplateRequest(
    `${templatePrefix}-${Date.now()}`,
    "Subject",
    "Html body",
    "Text body",
    null,
    postmark.Models.TemplateTypes.Standard,
  );
}

function templateLayoutToCreate(templatePrefix: string) {
  return new postmark.Models.CreateTemplateRequest(
    `${templatePrefix}-${Date.now()}`, undefined,
    "Html body {{{@content}}}", "Text body {{{@content}}}",
    null, postmark.Models.TemplateTypes.Layout,
  );
}

export const createTemplateData = async () => {
  const client = new postmark.ServerClient(serverToken);
  await client.createTemplate(templateToCreate(templatePrefix));
  await client.createTemplate(templateLayoutToCreate(templatePrefix));
};

export const deleteTemplateData = async () => {
  const client = new postmark.ServerClient(serverToken);
  const templates = await client.getTemplates({count: 50});

  for (const template of templates.Templates) {
    if (template.Name.includes(templatePrefix)) {
      await client.deleteTemplate(template.TemplateId);
    }
  }
};