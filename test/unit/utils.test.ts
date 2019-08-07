import {expect} from 'chai'
import 'mocha'
import * as utils from '../../src/handler/utils/Various'

describe('Utilities', () => {
  describe('pluralize', () => {
    const singular = 'template';
    const plural = 'templates';

    describe('plural', () => {
      it('number: 0', () => {
        expect(utils.pluralize(0, singular, plural)).to.eq(plural);
      });

      it('number: 2', () => {
        expect(utils.pluralize(2, singular, plural)).to.eq(plural);
      });

      it('number: 5', () => {
        expect(utils.pluralize(5, singular, plural)).to.eq(plural);
      });

      it('number: 100', () => {
        expect(utils.pluralize(100, singular, plural)).to.eq(plural);
      });
    });

    describe('singular', () => {
      it('number: 1', () => {
        expect(utils.pluralize(1, singular, plural)).to.eq(singular);
      });

      it('number: -1', () => {
        expect(utils.pluralize(-1, singular, plural)).to.eq(singular);
      });
    });
  });

  describe('pluralize with number', () => {
    const singular = 'template';
    const plural = 'templates';

    describe('plural', () => {
      it('number: 0', () => {
        expect(utils.pluralizeWithNumber(0, singular, plural)).to.eq(`0 ${plural}`);
      });

      it('number: 2', () => {
        expect(utils.pluralizeWithNumber(2, singular, plural)).to.eq(`2 ${plural}`);
      });
    });

    describe('singular', () => {
      it('number: 1', () => {
        expect(utils.pluralize(1, singular, plural)).to.eq(singular);
      });

      it('number: -1', () => {
        expect(utils.pluralize(-1, singular, plural)).to.eq(singular);
      });
    });
  });
});
