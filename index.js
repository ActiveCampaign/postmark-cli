#!/usr/bin/env node
'use strict';

var program = require('commander');

program
  .version('0.1.0')
  .command('templates', 'Template management.')
  .parse(process.argv);