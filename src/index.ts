#!/usr/bin/env node

import chalk from 'chalk'

require('yargonaut')
  .style('yellow')
  .errorsStyle('red')

require('yargs')
  .env('POSTMARK')
  .commandDir('commands')
  .demandCommand()
  .help()
  .usage(
    chalk.yellow(`
              ____           _                        _    
 _________   |  _ \\ ___  ___| |_ _ __ ___   __ _ _ __| | __
| \\     / |  | |_) / _ \\/ __| __| '_ ' _ \\ / _\` | '__| |/ /
|  '...'  |  |  __/ (_) \\__ \\ |_| | | | | | (_| | |  |   < 
|__/___\\__|  |_|   \\___/|___/\\__|_| |_| |_|\\__,_|_|  |_|\\_\\`)
  ).argv
