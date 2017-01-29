//
// test/parser/grammar.ts
// MiniPy2
//
// Created on 1/25/17
//

// NPM modules.
import { expect } from 'chai'

// Module for testing.
import * as grammar from '../../src/parser/grammar'

describe('grammar', () => {
  describe('#isEOF', () => {
    it('should accept null characters', () => {
      expect(grammar.isEOF('\0')).to.equal(true)
    })

    it('should reject non-null characters', () => {
      expect(grammar.isEOF('')).to.equal(false)
      expect(grammar.isEOF('a')).to.equal(false)
      expect(grammar.isEOF(' ')).to.equal(false)
      expect(grammar.isEOF('\n')).to.equal(false)
    })
  })

  describe('#isLineBreak', () => {
    it('should accept newline characters', () => {
      expect(grammar.isLineBreak('\n')).to.equal(true)
    })

    it('should reject non-newline characters', () => {
      expect(grammar.isLineBreak('\r')).to.equal(false)
    })
  })

  describe('#isInlineWhitespace', () => {
    it('should accept whitespace characters', () => {
      expect(grammar.isInlineWhitespace('')).to.equal(true)
      expect(grammar.isInlineWhitespace(' ')).to.equal(true)
      expect(grammar.isInlineWhitespace('\r')).to.equal(true)
      expect(grammar.isInlineWhitespace('\t')).to.equal(true)
    })

    it('should reject non-whitespace characters', () => {
      expect(grammar.isInlineWhitespace('\n')).to.equal(false)
      expect(grammar.isInlineWhitespace('\0')).to.equal(false)
      expect(grammar.isInlineWhitespace('a')).to.equal(false)
    })
  })

  describe('#isComment', () => {
    it('should accept hash characters', () => {
      expect(grammar.isComment('#')).to.equal(true)
    })

    it('should reject non-hash characters', () => {
      expect(grammar.isComment(' ')).to.equal(false)
    })
  })

  describe('#isOperatorStart', () => {
    it('should accept operator characters', () => {
      expect(grammar.isOperatorStart('-')).to.equal(true)
      expect(grammar.isOperatorStart(':')).to.equal(true)
      expect(grammar.isOperatorStart('(')).to.equal(true)
      expect(grammar.isOperatorStart(')')).to.equal(true)
      expect(grammar.isOperatorStart('[')).to.equal(true)
      expect(grammar.isOperatorStart(']')).to.equal(true)
      expect(grammar.isOperatorStart('*')).to.equal(true)
      expect(grammar.isOperatorStart('/')).to.equal(true)
      expect(grammar.isOperatorStart('+')).to.equal(true)
    })

    it('should reject non-operator characters', () => {
      expect(grammar.isOperatorStart(' ')).to.equal(false)
      expect(grammar.isOperatorStart('a')).to.equal(false)
      expect(grammar.isOperatorStart('\n')).to.equal(false)
    })
  })

  describe('#isDoubleQuote', () => {
    it('should accept double quotes', () => {
      expect(grammar.isDoubleQuote('"')).to.equal(true)
    })

    it('should reject non-double quotes', () => {
      expect(grammar.isDoubleQuote('\'')).to.equal(false)
    })
  })

  describe('#isLetter', () => {
    it('should accept letters', () => {
      expect(grammar.isLetter('a')).to.equal(true)
      expect(grammar.isLetter('z')).to.equal(true)
      expect(grammar.isLetter('A')).to.equal(true)
      expect(grammar.isLetter('Z')).to.equal(true)
    })

    it('should reject non-letters', () => {
      expect(grammar.isDoubleQuote('@')).to.equal(false)
      expect(grammar.isDoubleQuote('[')).to.equal(false)
      expect(grammar.isDoubleQuote('`')).to.equal(false)
      expect(grammar.isDoubleQuote('{')).to.equal(false)
    })
  })

  describe('#isDigit', () => {
    it('should accept digits', () => {
      expect(grammar.isDigit('0')).to.equal(true)
      expect(grammar.isDigit('9')).to.equal(true)
    })

    it('should reject non-digits', () => {
      expect(grammar.isDigit('/')).to.equal(false)
      expect(grammar.isDigit(':')).to.equal(false)
    })
  })

  describe('#isAlphaNumeric', () => {
    it('should accept letters, digits, and underscores', () => {
      expect(grammar.isAlphaNumeric('a')).to.equal(true)
      expect(grammar.isAlphaNumeric('Z')).to.equal(true)
      expect(grammar.isAlphaNumeric('0')).to.equal(true)
      expect(grammar.isAlphaNumeric('_')).to.equal(true)
    })

    it('should reject characters that aren\'t letters, digits, or underscores', () => {
      expect(grammar.isAlphaNumeric('/')).to.equal(false)
      expect(grammar.isAlphaNumeric('@')).to.equal(false)
      expect(grammar.isAlphaNumeric('{')).to.equal(false)
      expect(grammar.isAlphaNumeric('.')).to.equal(false)
    })
  })
})
