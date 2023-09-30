// TODO
// - allow deleting template by id
// - allow deleting a list of ids (template1, template2, template3, etc.)
// - allow deleting all templates without confirmation (-f flag useful for CI)
// - allow specifying template type to delete

import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { ServerClient } from "postmark";

import {
  fatalError,
  log,
  logError,
  pluralize,
  validateToken,
} from "../../utils";
import { template } from "lodash";

interface TemplateDeleteArguments {
  serverToken: string;
  requestHost: string;
}

export interface TemplateListOptions {
  sourceServer: string;
  requestHost: string;
}

export async function handler(args: TemplateDeleteArguments): Promise<void> {
  const serverToken = await validateToken(args.serverToken);
  const requestHost = args.requestHost;
  deletePrompt(serverToken, requestHost);
}

/**
 * Begin deleting the templates
 */
async function _delete(
  serverToken: string,
  args: TemplateDeleteArguments
): Promise<void> {
  const { requestHost } = args;
  return fetchTemplateList({
    sourceServer: serverToken,
    requestHost: requestHost,
  });
}

/**
 * Ask user to confirm delete
 */

async function deletePrompt(
  serverToken: string,
  requestHost: string
): Promise<void> {
  const answer = await confirm({
    default: false,
    message: `Delete ALL templates? Are you sure?`,
  });

  if (answer) {
    return fetchTemplateList({
      sourceServer: serverToken,
      requestHost: requestHost,
    });
  }
}

/**
 * Fetch template list from PM
 */

async function fetchTemplateList(options: TemplateListOptions) {
  const { sourceServer, requestHost } = options;

  // keep track of templates deleted
  let totalDeleted = 0;

  const spinner = ora("Deleting templates from Postmark...");
  spinner.start();

  const client = new ServerClient(sourceServer);

  if (requestHost !== undefined && requestHost !== "") {
    client.setClientOptions({ requestHost });
  }

  try {
    const templates = await client.getTemplates({ count: 300 });

    const totalTemplates = templates.Templates.filter(
      (template) => template.TemplateType !== "Layout"
    ).length;

    if (!templates.TotalCount) {
      spinner.stop();
      return fatalError("There are no templates on this server.");
    } else {
      spinner.text = `Deleting ${totalTemplates} templates from Postmark...`;

      for (const template of templates.Templates) {
        spinner.text = `Deleting template: ${template.Alias || template.Name}`;

        // TemplateId is always defined so use it instead of Alias
        const id = template.TemplateId;

        // NOTE we do not want to delete "Layouts"
        if (template.TemplateType !== "Layout") {
          try {
            const response = await client.deleteTemplate(id);

            spinner.text = `Template: ${
              template.Alias || template.Name
            } removed.`;

            totalDeleted++;
          } catch (e) {
            spinner.stop();
            logError(e);
          }
        }
      }

      // Show feedback when finished deleting templates
      if (totalDeleted === totalTemplates) {
        spinner.stop();
        log(
          `All finished! ${totalDeleted} ${pluralize(
            totalDeleted,
            "template has",
            "templates have"
          )} been deleted.`,
          { color: "green" }
        );
      }
    }
  } catch (err) {
    spinner.stop();
    return fatalError(err);
  }
}
