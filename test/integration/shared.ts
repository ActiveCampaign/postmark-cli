import nconf from "nconf";

export const testingKeys = nconf.env().file({ file: __dirname + "/../config/testing_keys.json" });
export const accountToken: string = testingKeys.get("ACCOUNT_TOKEN");
export const serverToken: string = testingKeys.get("SERVER_TOKEN");
export const fromAddress: string = testingKeys.get("FROM_ADDRESS");
export const toAddress: string = testingKeys.get("TO_ADDRESS");

export const CLICommand: string = './dist/index.js';
export const TestDataFolder: string = './test/data';
export const packageJson: any = require("../../package.json");