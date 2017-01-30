//
// test/parser/preprocess.ts
// MiniPy2
//
// Created on 1/30/17
//

// NPM modules.
import 'mocha'
import { expect } from 'chai'

// Module for testing.
import * as preprocess from '../../src/parser/preprocess'

describe('preprocess', () => {
  describe('#removeTrailingWhitespace', () => {
    it('should return same string if no trailing whitespace', () => {
      let input = 'foo\nbar\n  baz'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(input)
    })

    it('should return empty string if given empty string', () => {
      let input = ''
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(input)
    })

    it('should remove whitespace before newline', () => {
      let input = 'foo \t \nbar'
      let output = 'foo\nbar'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(output)
    })

    it('should remove whitespace before EOF', () => {
      let input = 'foo \t '
      let output = 'foo'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(output)
    })

    it('should not remove whitespace between non-newline characters', () => {
      let input = 'foo \t bar'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(input)
    })

    it('should not remove whitespace after a newline', () => {
      let input = 'foo\n \t bar'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(input)
    })

    it('should not collapse consecutive newlines', () => {
      let input = 'foo\n\nbar'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(input)
    })

    it('should remove whitespace between newlines', () => {
      let input = 'foo\n\t\n  \nbar baz'
      let output = 'foo\n\n\nbar baz'
      expect(preprocess.removeTrailingWhitespace(input)).to.equal(output)
    })
  })
})
