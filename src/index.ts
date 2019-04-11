#!/usr/bin/env node
'use strict'

require('yargonaut')
  .style('yellow')
  .errorsStyle('red')

require('yargs')
  .env('POSTMARK')
  .commandDir('commands')
  .demandCommand()
  .help().argv
