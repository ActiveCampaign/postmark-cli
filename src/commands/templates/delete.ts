// TODO
// - allow deleting all templates without confirmation (-f flag useful for CI)
// - get all templates from server and add to checkbox list so user can choose which ones to delete
// - allow users to choose type of template to delete "Templates", "Layouts" or "both" default to Templates
// - Prettier config?

import { confirm, input, select } from "@inquirer/prompts";
import ora from "ora";
import { ServerClient } from "postmark";
import { TemplateTypes } from "postmark/dist/client/models";

import {
  fatalError,
  log,
  logError,
  pluralize,
  validateToken,
} from "../../utils";

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
 * Ask user a series of questions before deleting templates.
 */

async function deletePrompt(
  serverToken: string,
  requestHost: string
): Promise<void> {
  const choice = await select({
    message: "Choose how you want to delete templates:",
    choices: [
      {
        name: "Delete templates by id",
        value: "byId",
      },
      {
        name: "Delete all templates",
        value: "all",
      },
    ],
  });

  /**
   * if the user has selected to delete templates by id
   */

  if (choice === "byId") {
    // TODO we probably want an actual validation
    // against ids that exist in the server
    const validateUserInput = async (input: string) => {
      // do not allow empty strings
      if (input) return true;
      return false;
    };

    const userInput = await input({
      message: "Enter template id(s) - separated by commas if multiple:",
      validate: validateUserInput,
    });

    const templateIds = userInput.split(",");

    // if user has entered at least one id
    if (templateIds.length) {
      return deleteTemplates(templateIds, {
        sourceServer: serverToken,
        requestHost: requestHost,
      });
    }
  }

  /**
   * if the user has selected to delete all templates
   */

  if (choice === "all") {
    const confirmed = await confirm({
      default: false,
      message: `Delete ALL templates? Are you sure?`,
    });

    const validateInput = async (input: string) =>
      input !== "delete all templates" ? false : true;

    let inputIsValid;

    if (confirmed) {
      inputIsValid = await input({
        message: 'Enter "delete all templates" to confirm:',
        validate: validateInput,
      });
    }

    if (inputIsValid) {
      return deleteTemplates([], {
        sourceServer: serverToken,
        requestHost: requestHost,
      });
    }
  }
}

/**
 * Delete templates from PM
 */

async function deleteTemplates(
  templateIds: string[],
  options: TemplateListOptions
) {
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
    let templates = [];
    let totalCount = 0;

    // if user has provided ids we use them
    if (templateIds.length) {
      for (const id of templateIds) {
        const template = await client.getTemplate(id);
        templates.push(template);
      }
      totalCount = templates.length;
    } else {
      // otherwise fetch all templates from server
      const response = await client.getTemplates({
        count: 300,
        templateType: TemplateTypes.Standard, // NOTE we might add this as an option users select
      });
      templates = response.Templates;
      totalCount = response.TotalCount;
    }

    if (!totalCount) {
      spinner.stop();
      return fatalError("There are no templates on this server.");
    } else {
      spinner.text = `Deleting ${totalCount} templates from Postmark...`;

      for (const template of templates) {
        spinner.text = `Deleting template: ${template.Alias || template.Name}`;

        // TemplateId is always defined so use it instead of Alias
        const id = template.TemplateId;

        try {
          await client.deleteTemplate(id);

          spinner.text = `Template: ${
            template.Alias || template.Name
          } removed.`;

          totalDeleted++;
        } catch (e) {
          spinner.stop();
          logError(e);
        }
      }

      // Show feedback when finished deleting templates
      if (totalDeleted === totalCount) {
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
