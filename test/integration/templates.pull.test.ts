import {expect} from "chai";
import "mocha";
import * as execa from 'execa'
import * as fs from 'fs-extra';

const dirTree = require("directory-tree");
import {serverToken, CLICommand, TestDataFolder} from "./shared";

describe("Templates command", () => {
    const options: execa.CommonOptions = {env: {'POSTMARK_SERVER_TOKEN': serverToken}};
    const pullFolder: string = TestDataFolder;
    const commandParameters: string[] = ['templates', 'pull', pullFolder];

    afterEach(() => {
        fs.removeSync(pullFolder);
    });


    describe("Pull", () => {
        it('console out', async () => {
            const {stdout} = await execa(CLICommand, commandParameters, options);
            expect(stdout).to.include('All done');
        });

        describe("Folder", () => {
            it('templates', async () => {
                await execa(CLICommand, commandParameters, options);
                const templateFolders = dirTree(pullFolder);
                expect(templateFolders.children.length).to.be.gt(0);
            });

            it('single template - file names', async () => {
                await execa(CLICommand, commandParameters, options);
                const templateFolders = dirTree(pullFolder);

                const files = templateFolders.children[0].children;
                const names: string[] = files.map((f: any) => {
                    return f.name;
                });

                expect(names).to.members(['content.txt', 'content.html', 'meta.json']);
            });

            it('single template files - not zero size', async () => {
                await execa(CLICommand, commandParameters, options);
                const templateFolders = dirTree(pullFolder);

                const files = templateFolders.children[0].children;
                const sizes: string[] = files.map((f: any) => { return f.size; });

                let result = files.findIndex( (f:any) => { return f.size <= 0})
                expect(result).to.eq(-1);
            });
        });
    });
});

