//
// test/parser/parser.ts
// MiniPy2
//
// Created on 1/26/17
//

// NPM modules.
import 'mocha'
import { expect } from 'chai'

// Module for testing.
import SyntaxError from '../../src/parser/error'
import Lexer from '../../src/parser/lexer'
import Parser from '../../src/parser/parser'

function parserFactory (input: string): Parser {
  return new Parser(input)
}

function expectExprAST (input: string, expected: string) {
  let p = parserFactory(input)
  let t = p.parseExpr(0)
  let s = t.toString()
  expect(s).to.equal(s)
}

function expectSyntaxError (input: string, errMsg: string) {
  function run () {
    let p = parserFactory(input)
    let t = p.parseProg()
  }

  expect(run).to.throw(errMsg)
}

describe('parser', () => {
  describe('#constructor', () => {
    it('should initialize to starting values', () => {
      let p = parserFactory('foo')
      expect(p.input).to.equal('foo')
    })
  })

  describe('#parseExpr', () => {
    describe('simple expressions', () => {
      it('should parse identifiers', () => {
        expectExprAST('A', 'A')
        expectExprAST('_', '_')
        expectExprAST('abc', 'abc')
      })

      it('should parse boolean literals', () => {
        expectExprAST('true', 'true')
        expectExprAST('false', 'false')
      })

      it('should parse number literals', () => {
        expectExprAST('123', '123')
      })

      it('should parse string literals', () => {
        expectExprAST('"abc"', '"abc"')
      })

      it('should parse array literals', () => {
        expectExprAST('[]', '[ ]')
        expectExprAST('[1,2,3]', '[ 1 2 3 ]')
        expectExprAST('[1,2,3,]', '[ 1 2 3 ]')
      })
    })

    describe('compound expressions', () => {
      it('should parse unary prefix operators', () => {
        expectExprAST('-a', '(- a)')
        expectExprAST('!a', '(! a)')
      })

      it('should parse binary infix operators', () => {
        expectExprAST('a + a', '(- a)')
        expectExprAST('a - a', '(- a)')
      })

      it('should parse infix and prefix operators together', () => {
        expectExprAST('a - -a', '(- a (- a))')
      })

      it('should respect mathematical operator precedence', () => {
        // Native operator precedence.
        expectExprAST('a + b + c', '(+ a (+ b c))')
        expectExprAST('a + b - c', '(+ a (- b c))')
        expectExprAST('a - b + c', '(- a (+ b c))')
        expectExprAST('a * b + c', '(+ (* a b) c)')
        expectExprAST('a + b * c', '(+ a (* b c))')

        // Native precedence overridden by parenthetical groups.
        expectExprAST('(a + b) + c', '(+ (+ a b) c)')
        expectExprAST('a + (b + c)', '(+ a (+ b c))')
        expectExprAST('(a * b) + c', '(+ (* a b) c)')
        expectExprAST('(a + b) * c', '(* (+ a b) c)')
      })
    })

    describe('errors', () => {
      it('should reject unknown unary operators', () => {
        expectSyntaxError('*5', `(1:1) unable to use '*' as the start of an expression`)
        expectSyntaxError(']', `(1:1) unable to use ']' as the start of an expression`)
      })

      it('should reject unknown binary operators', () => {
        expectSyntaxError('2 , 2', `(1:3) unable to use ',' as the start of an expression`)
      })

      it('should reject unterminated parentheticals', () => {
        expectSyntaxError('(2 + 2', `(1:7) expected token to be ')', got 'EOF'`)
      })
    })
  })
})
