import { expect } from "chai";
import "mocha";
import * as execa from 'execa'
import {CLICommand, PackageJson} from "./shared";

describe("Default command", () => {
    describe("parameters", () => {
        it('help', async () => {
            const {stdout} = await execa(CLICommand, ['--help']);
            expect(stdout).to.include('Commands:');
            expect(stdout).to.include('Options:')
        });

        it('version', async () => {
            const {stdout} = await execa(CLICommand, ['--version']);
            expect(stdout).to.include(PackageJson.version);
        });

        it('no parameters', async () => {
            execa(CLICommand).catch(error => {
                expect(error.message).to.include('Not enough non-option arguments');
            })
        });
    });
});

