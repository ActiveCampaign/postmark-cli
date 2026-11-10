<h1 align="center">
  <img src="./media/header@2x.png" width="100%" style="max-width:1230px;" alt="Postmark CLI">
</h1>
<p align="center">A CLI tool for managing templates, sending emails, and fetching servers on <a href="https://postmarkapp.com">Postmark</a>. <br/>Nifty for integrating with a CI/CD pipeline.</p>

<p align="center">
  <a href="https://circleci.com/gh/ActiveCampaign/postmark-cli/tree/main"><img src="https://circleci.com/gh/ActiveCampaign/postmark-cli/tree/main.svg?style=svg" alt="CircleCI"></a>
  <a href="http://www.opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License: MIT"></a>
  <a href="https://badge.fury.io/js/postmark-cli"><img src="https://badge.fury.io/js/postmark-cli.svg" alt="npm version"></a>
</p>

## Usage

After installation, type `postmark` in your command line to see a list of available commands. Check out the [wiki](https://github.com/activecampaign/postmark-cli/wiki) for instructions on how to [send emails](https://github.com/activecampaign/postmark-cli/wiki/email-command), [manage templates](https://github.com/activecampaign/postmark-cli/wiki/templates-command), or [list servers](https://github.com/activecampaign/postmark-cli/wiki/servers-command).

```bash
$ postmark

  Commands:
    postmark email <command> [options]      Send an email
    postmark servers <command> [options]    Manage your servers
    postmark templates <command> [options]  Pull and push your templates

  Options:
    --version  Show version number
    --help     Show help
```

## Installation

- Install [Node.js](https://nodejs.org/en/) 22.23.4+, 24.22.1+ or 26.12.1+ (official builds; Node 20, 23 and 25 never got the fix). Earlier releases ship a Brotli decoder affected by
  [CVE-2026-111497](https://www.cve.org/CVERecord?id=CVE-2026-111497) ([Node.js security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)), and the `postmark`
  4.x client the CLI depends on requests and decodes Brotli responses. Builds linked against the system Brotli library
  (`node_shared_brotli`, for example Homebrew's) also need that library updated.
- `$ npm i postmark-cli -g`
- `$ postmark` 🌈

## Issues & Comments

Feel free to contact us if you encounter any issues with the library.
Please leave all comments, bugs, requests and issues on the Issues page.

## License

Postmark CLI library is licensed under the **MIT** license. Please refer to the [LICENSE](https://github.com/activecampaign/postmark-cli/blob/master/LICENSE.md) for more information.
