#!/usr/bin/env node

import chalk from 'chalk'
import {logoString} from './logo';

require('yargonaut')
  .style('yellow')
  .errorsStyle('red')

require('yargs')
  .env('POSTMARK')
  .commandDir('commands')
  .demandCommand()
  .help()
  .usage(
    chalk.yellow(logoString)
  ).argv;
