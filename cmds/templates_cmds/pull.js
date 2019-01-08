const postmark = require('postmark')
const chalk = require('chalk')
const path = require('path')
const fse = require('fs-extra')
const spinner = require('../../utils/spinner')

exports.command = 'pull [options]'
exports.desc = 'Pull templates from a server to your local file system'
exports.builder = {
  'source-server': {
    type: 'string',
    describe: 'The source server from which the templates should be pulled.',
    alias: ['s'],
    required: true,
  },
  'output-dir': {
    type: 'string',
    describe: 'The directory where to pull the templates to.',
    alias: ['o'],
    required: true,
  },
}
exports.handler = argv => {
  spinner.setSpinnerTitle(chalk.gray('%s Pulling templates from Postmark...'))
  spinner.start()

  const sourceServer = postmark(argv.sourceServer)

  // Fetch template List
  sourceServer
    .getTemplates()
    .then(response => {
      processTemplates({
        sourceServer,
        outputDir: argv.outputDir,
        totalCount: response.TotalCount,
        templates: response.Templates,
      })
    })
    .catch(error => {
      spinner.stop(true)
      console.error(chalk.red(JSON.stringify(error)))
    })
}

/**
 * Fetch and save templates
 */
const processTemplates = config => {
  const { sourceServer, outputDir, totalCount, templates } = config
  let requestCount = 0
  let processed = []

  templates.forEach(template => {
    sourceServer
      .getTemplate(template.TemplateId)
      .then(response => {
        requestCount++

        processed.push({
          ...templateObject(template),
          ...saveTemplate(outputDir, response),
        })

        // If this is the last template
        if (requestCount === totalCount) {
          fse.outputFileSync(
            formatFilename(outputDir, 'templates', 'json'),
            JSON.stringify(processed, null, 2)
          )

          spinner.stop(true)
          console.log(
            chalk.green(
              `All done! ${totalCount} have been saved to ${outputDir}.`
            )
          )
        }
      })
      .catch(error => {
        spinner.stop(true)
        console.error(chalk.red(JSON.stringify(error)))
      })
  })
}

/**
 * Save template
 * @param  {String} outputDir
 * @param  {Object} template  [description]
 * @return {Object}           Paths of newly saved files
 */
const saveTemplate = (outputDir, template) => {
  let result = {}

  if (template.HtmlBody) {
    const filename = formatFilename(outputDir, template.Name, 'html')
    result.HtmlBody = filename
    fse.outputFileSync(filename, template.HtmlBody)
  } else {
    result.HtmlBody = ''
  }

  if (template.TextBody) {
    const filename = formatFilename(outputDir, template.Name, 'txt')
    result.TextBody = filename
    fse.outputFileSync(filename, template.HtmlBody)
  } else {
    result.TextBody = ''
  }

  return result
}

/**
 * Generate a template model
 * @param  {Object} template
 * @return {Object}
 */
const templateObject = template => ({
  Name: template.Name,
  Alias: template.Alias ? template.Alias : undefined,
  TemplateId: !template.Alias ? template.TemplateId : undefined,
  Subject: template.Subject,
  HtmlBody: template.HtmlBody,
  TextBody: template.TextBody,
})

/**
 * Format the template's filename
 * @param  {String} dest Destination path
 * @param  {String} name Name to format
 * @param  {String} ext File extension
 * @return {String}
 */
const formatFilename = (dest, name, ext) =>
  path.format({
    dir: dest,
    name: name
      .split(' ')
      .join('_')
      .toLowerCase(),
    ext: `.${ext}`,
  })
