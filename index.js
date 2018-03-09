#!/usr/bin/env node
'use strict';
let postmark = require('postmark');

require('yargs')
  .env('POSTMARK')
  .usage('$0 <cmd> [args]')
  .command('templates sync', 'Sync templates between servers', (yargs) => {
    yargs.option('source-server', {
      type: 'string',
      describe: 'The source server from which the templates should be copied.',
      alias: ['s']
    });
    yargs.option('destination-server', {
      type: 'string',
      describe: 'The destination server to which the templates should be copied.',
      alias: ['d']
    });
  }, function (argv) {
    let sourceServer = postmark(argv.sourceServer);
    let destServer = postmark(argv.destinationServer);
    sourceServer.getTemplates().then(t => {
      t.Templates.forEach(f => {
        if (!f.Alias) {
          f.Alias = f.Name.replace(/[^a-z0-9_\-.]+/i, '_').toLowerCase();
          sourceServer.editTemplate(f.TemplateId, f)
            .then(t => pushTemplate(t, destServer))
            .catch(err => console.log(err));
        }
        else {
          sourceServer.getTemplate(f.Alias).then(k => pushTemplate(k, destServer));
        }
      })
    });
  })
  .require('source-server')
  .require('destination-server')
  
  .help()
  .argv;

function pushTemplate(template, destClient) {
  destClient.getServer().then(s =>{
    console.log(`Syncing the template '${template.Alias}' to ${s.Name}.`);
    delete template.TemplateId;
    destClient.editTemplate(template.Alias, template)
      .catch(f => destClient.createTemplate(template)
        .catch(e => console.log(e)));
  });
}