const postmark = require('postmark');

exports.command = 'push-server [options]'
exports.desc = 'Push templates from one Postmark server to another'
exports.builder = {
  'source-server': {
    type: 'string',
    describe: '',
    alias: ['s'],
    required: true
  },
  'destination-server': {
    type: 'string',
    describe: '',
    alias: ['d'],
    required: true
  }
}
exports.handler = (argv) => {
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
}


function pushTemplate(template, destClient) {
  destClient.getServer().then(s =>{
    console.log(`Syncing the template '${template.Alias}' to ${s.Name}.`);
    delete template.TemplateId;
    destClient.editTemplate(template.Alias, template)
      .catch(f => destClient.createTemplate(template)
        .catch(e => console.log(e)));
  });
}
