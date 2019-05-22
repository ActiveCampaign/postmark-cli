import { expect } from 'chai'
import 'mocha'
import chalk from 'chalk'
import * as list from '../../src/commands/servers/list'

describe('Servers', () => {
  describe('list', () => {
    describe('stateLabel', () => {
      it('should return enabled', () => {
        const result = list.stateLabel(true)
        expect(result).to.eq(chalk.green('Enabled'))
      })
      it('should return disabled', () => {
        const result = list.stateLabel(false)
        expect(result).to.eq(chalk.grey('Disabled'))
      })
    })

    describe('linkTrackingStateLabel', () => {
      it('should return HTML', () => {
        const result = list.linkTrackingStateLabel('HtmlOnly')
        expect(result).to.eq(chalk.green('HTML'))
      })
      it('should return Text', () => {
        const result = list.linkTrackingStateLabel('TextOnly')
        expect(result).to.eq(chalk.green('Text'))
      })
      it('should return HTML and Text', () => {
        const result = list.linkTrackingStateLabel('HtmlAndText')
        expect(result).to.eq(chalk.green('HTML and Text'))
      })
      it('should return Disabled', () => {
        const result = list.linkTrackingStateLabel('None')
        const result2 = list.linkTrackingStateLabel('')
        const result3 = list.linkTrackingStateLabel(':(')
        const expected = chalk.gray('Disabled')
        expect(result).to.eq(expected)
        expect(result2).to.eq(expected)
        expect(result3).to.eq(expected)
      })
    })
  })
})
