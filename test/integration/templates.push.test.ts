import {expect} from "chai";
import "mocha";
import execa from 'execa'
import * as fs from 'fs-extra';
import {DirectoryTree} from "directory-tree";

const dirTree = require("directory-tree");
import {serverToken, CLICommand, TestDataFolder} from "./shared";

describe("Templates command", () => {
    const options: execa.CommonOptions = {env: {'POSTMARK_SERVER_TOKEN': serverToken}};
    const dataFolder: string = TestDataFolder;
    const pushCommandParameters: string[] = ['templates', 'push', dataFolder, '--force'];
    const pullCommandParameters: string[] = ['templates', 'pull', dataFolder];

    afterEach(() => {
        fs.removeSync(dataFolder);
    });

    describe("Push", () => {
        beforeEach(async () => {
            await execa(CLICommand, pullCommandParameters, options);
        });

        it('console out', async () => {
            const templateFolders = dirTree(dataFolder);
            const files = templateFolders.children[0].children;
            const file: DirectoryTree = files.find((f:DirectoryTree) => { return f.path.includes("txt") });

            fs.writeFileSync(file.path, `test data ${Date.now().toString()}`, 'utf-8')
            const {stdout} = await execa(CLICommand, pushCommandParameters, options);
            expect(stdout).to.include("All finished! 1 template was pushed to Postmark.")
        });

        it('file content', async () => {
            let templateFolders = dirTree(dataFolder);
            let files = templateFolders.children[0].children;
            let file: DirectoryTree = files.find((f:DirectoryTree) => { return f.path.includes("txt") });
            const contentToPush: string = `test data ${Date.now().toString()}`;

            fs.writeFileSync(file.path, contentToPush, 'utf-8')
            await execa(CLICommand, pushCommandParameters, options);

            fs.removeSync(dataFolder);
            await execa(CLICommand, pullCommandParameters, options);

            templateFolders = dirTree(dataFolder);
            files = templateFolders.children[0].children;
            file = files.find((f:DirectoryTree) => { return f.path.includes("txt") });
            const content: string = fs.readFileSync(file.path).toString('utf-8')

            expect(content).to.equal(contentToPush)
        });
    });
});

