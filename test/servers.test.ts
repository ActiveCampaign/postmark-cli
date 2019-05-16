import { expect } from "chai";
import "mocha";
import * as execa from 'execa'

import * as nconf from "nconf";
const testingKeys = nconf.env().file({ file: __dirname + "testing_keys.json" });

describe("Servers", () => {
    const accountToken: string = testingKeys.get("ACCOUNT_TOKEN");
    const options: execa.CommonOptions = { env: {'POSTMARK_ACCOUNT_TOKEN': accountToken} };
    const CLICommand: string = './dist/index.js';

    it('list', async () => {
        const {stdout} = await execa(CLICommand, ['servers', 'list'], options);
        const servers = JSON.parse(stdout);
        expect(servers.TotalCount).to.be.gte(0);
    });

    it('list - invalid token', async () => {
        const invalidOptions: execa.CommonOptions = { env: {'POSTMARK_ACCOUNT_TOKEN': 'test'} };

        const {stderr} = await execa(CLICommand, ['servers', 'list'], invalidOptions)
        expect(stderr).to.include('InvalidAPIKeyError');
    });
});

