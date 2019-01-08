#!/usr/bin/env node
'use strict';

require('yargs')
  .commandDir('cmds')
  .demandCommand()
  .help()
  .argv
