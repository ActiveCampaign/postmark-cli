#!/usr/bin/env node
'use strict'

require('yargs')
  .env('POSTMARK')
  .commandDir('cmds')
  .demandCommand()
  .help().argv
