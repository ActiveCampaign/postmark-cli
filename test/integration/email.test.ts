import {expect} from "chai";
import "mocha";
import * as execa from 'execa'
import {serverToken, fromAddress, toAddress, CLICommand} from "./shared";

describe("Email send command", () => {
    const options: execa.CommonOptions = {env: {'POSTMARK_SERVER_TOKEN': serverToken}};
    const textBodyParameter = '--text="test text body"';
    const htmlBodyParameter = '--html="test html body"';
    const toParameter = `--to=${toAddress}`;
    const fromParameter = `--from=${fromAddress}`;
    const defaultParameters = [ 'email', 'raw', toParameter, fromParameter, '--subject="test sending"'];

    describe("not valid", () => {
        it('no arguments', () => {
            return execa(CLICommand, [], options).then((result) => {
                expect(result).to.equal(null);
            }, (error) => {
                expect(error.message).to.include('Not enough non-option arguments: got 0, need at least 1');
            });
        });

        describe("no mandatory arguments", () => {
            it("missing :to, :from, :subject", () => {
                return execa(CLICommand, ['email','raw'], options).then((result) => {
                    expect(result).to.equal(null);
                }, (error) => {
                    expect(error.message).to.include('Missing required arguments:');
                })
            });

            it("missing :to", () => {
                return execa(CLICommand, ['email','raw', '--subject="test"', fromParameter], options).then((result) => {
                    expect(result).to.equal(null);
                }, (error) => {
                    expect(error.message).to.include('Missing required argument: to');
                })
            });

            it("missing :subject", () => {
                return execa(CLICommand, ['email','raw', fromParameter, toParameter], options).then((result) => {
                    expect(result).to.equal(null);
                }, (error) => {
                    expect(error.message).to.include('Missing required argument: subject');
                })
            });

            it("missing :from", () => {
                return execa(CLICommand, ['email','raw', '--subject="hey"', toParameter], options).then((result) => {
                    expect(result).to.equal(null);
                }, (error) => {
                    expect(error.message).to.include('Missing required argument: from');
                })
            });
        });

        it('no body', () => {
            return execa(CLICommand, defaultParameters, options).then((result) => {
                expect(result).to.equal(null);
            }, (error) => {
                expect(error.message).to.include('Provide');
            })
        });
    });


    describe("valid", () => {
        it('html message', async () => {
            const parameters: string[] = defaultParameters.concat(htmlBodyParameter);
            const {stdout} = await execa(CLICommand, parameters, options);

            expect(stdout).to.include("\"Message\":\"OK\"");
        });

        it('text message', async () => {
            const parameters: string[] = defaultParameters.concat(textBodyParameter);
            const {stdout} = await execa(CLICommand, parameters, options);

            expect(stdout).to.include("\"Message\":\"OK\"");
        });

        it('multipart message', async () => {
            const parameters: string[] = defaultParameters.concat([textBodyParameter, htmlBodyParameter]);
            const {stdout} = await execa(CLICommand, parameters, options);

            expect(stdout).to.include("\"Message\":\"OK\"");
        });
    });
});

