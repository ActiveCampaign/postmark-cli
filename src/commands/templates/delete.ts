/* eslint-disable @typescript-eslint/member-delimiter-style */

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
  requestHost: string;
  sourceServer: string;
  templateType: TemplateTypes | undefined;
}

export async function handler(args: TemplateDeleteArguments): Promise<void> {
  const serverToken = await validateToken(args.serverToken);
  const requestHost = args.requestHost;
  deletePrompts(serverToken, requestHost);
}

/**
 * Ask user a series of questions before deleting templates.
 */

async function deletePrompts(
  serverToken: string,
  requestHost: string
): Promise<void> {
  const choice = await select({
    message: "Choose how you want to delete templates:",
    choices: [
      {
        name: "Delete templates by id or alias",
        description:
          "NOTE: mixing ids and aliases on the same request is NOT supported",
        value: "byIdOrAlias",
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

  if (choice === "byIdOrAlias") {
    // TODO we probably want an actual validation
    // against ids/aliases that exist in the server
    const validateUserInput = async (input: string) => {
      // do not allow empty strings
      if (input) return true;
      return false;
    };

    const userInput = await input({
      message:
        "Enter template id(s)/alias(es) - separate with commas if multiple:",
      validate: validateUserInput,
    });

    const templateIdsOrAliases = userInput.split(",");

    // if user has entered at least one id
    if (templateIdsOrAliases.length) {
      return deleteTemplates(templateIdsOrAliases, {
        requestHost: requestHost,
        sourceServer: serverToken,
        templateType: undefined,
      });
    }
  }

  /**
   * if the user has selected to delete all templates
   */

  if (choice === "all") {
    let templateType, confirmed, inputIsValid;

    templateType = await select({
      message: "Which template type do you want to delete?",
      choices: [
        {
          name: "Templates",
          value: TemplateTypes.Standard,
        },
        {
          description:
            "NOTE: Layouts can only be deleted if not in use by any Templates",
          name: "Layouts",
          value: TemplateTypes.Layout,
        },
      ],
    });

    if (templateType) {
      confirmed = await confirm({
        default: false,
        message: `Delete ALL templates? Are you sure?`,
      });
    }

    // user has to type the exact sentence to proceed
    const validateInput = async (input: string) =>
      input !== "delete all templates" ? false : true;

    if (confirmed) {
      inputIsValid = await input({
        message: 'Enter "delete all templates" to confirm:',
        validate: validateInput,
      });
    }

    if (inputIsValid) {
      return deleteTemplates([], {
        templateType: templateType,
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
  templateIdsOrAliases: string[],
  options: TemplateListOptions
) {
  const { requestHost, sourceServer, templateType } = options;

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

    // if user has provided ids or aliases we use them
    if (templateIdsOrAliases.length) {
      for (const idOrAlias of templateIdsOrAliases) {
        const template = await client.getTemplate(idOrAlias);
        templates.push(template);
      }
      totalCount = templates.length;
    } else {
      // otherwise fetch all templates from server
      const response = await client.getTemplates({
        count: 300,
        templateType,
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
