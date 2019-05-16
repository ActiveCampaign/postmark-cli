import { expect } from "chai";
import "mocha";
import * as serversCommand from '../src/commands/servers/list'

describe("Test", () => {

    it("clientVersion", async () => {
        expect(1).to.equal(1);
        await serversCommand.handler({
            accountToken: 'test',
            count: 1,
            offset:0,
            name: 'selenium'})
    });
});
