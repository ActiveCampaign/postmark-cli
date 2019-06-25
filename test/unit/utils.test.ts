import { expect } from 'chai'
import 'mocha'
import * as utils from '../../src/utils'

describe('Utilities', () => {
  describe('cmd', () => {
    const name = 'Test'
    const desc = 'Description'
    const result = utils.cmd(name, desc)

    it('should return yargs keys', () => {
      expect(result).to.include.all.keys('name', 'command', 'desc', 'builder')
    })

    it('should contain proper values', () => {
      expect(result.name).to.eq(name)
      expect(result.command).to.eq(`${name} <command> [options]`)
      expect(result.desc).to.eq(desc)
      expect(result.builder).to.be.a('function')
    })
  })

  describe('pluralize', () => {
    const singular = 'template'
    const plural = 'templates'

    it('should return plural', () => {
      expect(utils.pluralize(0, singular, plural)).to.eq(plural)
      expect(utils.pluralize(2, singular, plural)).to.eq(plural)
      expect(utils.pluralize(5, singular, plural)).to.eq(plural)
      expect(utils.pluralize(10, singular, plural)).to.eq(plural)
      expect(utils.pluralize(100, singular, plural)).to.eq(plural)
    })

    it('should return singular', () => {
      expect(utils.pluralize(1, singular, plural)).to.eq(singular)
      expect(utils.pluralize(-1, singular, plural)).to.eq(singular)
    })
  })
})
