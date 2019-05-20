#!/usr/bin/env node

require('yargonaut')
  .style('yellow')
  .errorsStyle('red')

require('yargs')
  .env('POSTMARK')
  .commandDir('commands')
  .demandCommand()
  .help().argv
