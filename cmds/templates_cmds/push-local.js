const postmark = require('postmark')
const chalk = require('chalk')
const fs = require('fs-extra')
const pluralize = require('pluralize')
const { find } = require('lodash')
const { table, getBorderCharacters } = require('table')
const spinner = require('../../utils/spinner')

exports.command = 'push-local [options]'
exports.desc = 'Push templates from your local file system to a Postmark server'
exports.builder = {
  'destination-server': {
    type: 'string',
    describe: '',
    alias: ['d'],
    required: true,
  },
  'config-file': {
    type: 'string',
    describe: 'Path to your templates config file',
    alias: ['c'],
    required: true,
  },
  publish: {
    type: 'boolean',
    describe: 'Publish your template changes to the destination server',
    default: false,
    alias: ['p'],
  },
}
exports.handler = async argv => {
  spinner.setSpinnerTitle('%s pushing your templates')
  spinner.start()

  this.results = {
    success: 0,
    failed: 0,
  }
  this.localTemplates = await processTemplates(argv.configFile)

  let review = {
    files: [],
    added: 0,
    modified: 0,
  }

  const destinationServer = new postmark.ServerClient(argv.destinationServer)
  destinationServer
    .getTemplates()
    .then(response => {
      this.localTemplates.forEach(template => {
        template.New = !find(response.Templates, { Alias: template.Alias })
        template.New ? review.added++ : review.modified++
        review.files.push([
          template.New ? chalk.green('Added') : chalk.yellow('Modified'),
          template.Name,
          template.Alias,
        ])
      })

      spinner.stop(true)
      printReview(review)

      if (argv.publish) {
        spinner.setSpinnerTitle('%s Pushing templates to Postmark...')
        spinner.start()
        pushTemplates(destinationServer, this.localTemplates)
      } else {
        console.log('Publish these changes with the "--publish=true" flag')
      }
    })
    .catch(error => {
      spinner.stop(true)
      console.error(chalk.red(error))
    })
}

/**
 * Parse templates and load them into config
 * @param  {String}  configFile
 * @return {Array}
 */
const processTemplates = async configFile => {
  let config = await fs.readJson(configFile)
  let processed = []

  config.forEach(template => {
    if (template.HtmlBody) {
      template.HtmlBody = fs.readFileSync(template.HtmlBody, 'utf-8')
    }

    if (template.TextBody) {
      template.TextBody = fs.readFileSync(template.TextBody, 'utf-8')
    }

    processed.push(template)
  })

  return processed
}

/**
 * Show which templates will change after the publish
 * @param  {Object} results
 */
const printReview = results => {
  const { files, added, modified } = results
  const head = [chalk.gray('Type'), chalk.gray('Name'), chalk.gray('Alias')]

  console.log(table([head, ...files], { border: getBorderCharacters('norc') }))

  if (added > 0) {
    console.log(
      chalk.green(`${added} ${pluralize('templates', added)} will be added.`)
    )
  }

  if (modified > 0) {
    console.log(
      chalk.yellow(
        `${modified} ${pluralize('templates', modified)} will be modified.`
      )
    )
  }
}

/**
 * Push all local templates
 * @param  {Object} destinationServer Postmark server instance
 * @param  {Array} templates
 */
const pushTemplates = (destinationServer, templates) => {
  templates.forEach(template => {
    pushTemplate(destinationServer, template)
  })
}

/**
 * Determine whether to create a new template or edit an existing
 * @param  {Object} destinationServer Postmark server instance
 * @param  {Object} template
 */
const pushTemplate = (destinationServer, template) => {
  if (template.New) {
    destinationServer
      .createTemplate(template)
      .then(response => {
        pushComplete({
          success: true,
          response,
          template,
        })
      })
      .catch(response => {
        pushComplete({
          success: false,
          response,
          template,
        })
      })
  } else {
    destinationServer
      .editTemplate(template.Alias, template)
      .then(response => {
        pushComplete({
          success: true,
          response,
          template,
        })
      })
      .catch(response => {
        pushComplete({
          success: false,
          response,
          template,
        })
      })
  }
}

/**
 * Run each time a push has been completed
 * @param  {Object} result
 */
const pushComplete = result => {
  const { success, response, template } = result

  // Update counters
  this.results[success ? 'success' : 'failed']++
  const completed = this.results.success + this.results.failed

  // Log any errors to the console
  if (!success) {
    console.log(chalk.red(`\n${template.Name}: ${response.toString()}`))
  }

  if (completed === this.localTemplates.length) {
    spinner.stop(true)

    console.log(
      chalk.green(
        `Pushed ${this.results.success} ${pluralize(
          'template',
          this.results.success
        )} successfully.`
      )
    )

    // Show failures
    if (this.results.failed) {
      console.log(
        chalk.red(
          `Failed to push ${this.results.failed} ${pluralize(
            'template',
            this.results.failed
          )}. Please see the output above for more details.`
        )
      )
    }
  }
}
