//
// test/parser/parser.ts
// MiniPy2
//
// Created on 1/26/17
//

// NPM modules.
import 'mocha'
import { expect } from 'chai'

// Utility modules.
import { parseTestFile } from './util'

// Module for testing.
import SyntaxError from '../../src/parser/error'
import Lexer from '../../src/parser/lexer'
import Parser from '../../src/parser/parser'

function parserFactory (input: string): Parser {
  return new Parser(input)
}

function expectExprAST (input: string, expected: string) {
  let p = parserFactory(input)
  let t = p.parseProg()
  let s = t.toString()
  expect(s).to.equal(expected)
}

function expectStmtAST (input: string, expected: string) {
  let p = parserFactory(input)
  let t = p.parseProg()
  let s = t.toString()
  expect(s).to.equal(expected.replace(/\) \(/g, ')\n('))
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
        expectExprAST('a + a', '(+ a a)')
        expectExprAST('a - a', '(- a a)')
        expectExprAST('a > a', '(> a a)')
        expectExprAST('a < a', '(< a a)')
      })

      it('should parse infix and prefix operators together', () => {
        expectExprAST('a - -a', '(- a (- a))')
      })

      it('should respect mathematical operator precedence', () => {
        // Native operator precedence.
        expectExprAST('a + b + c', '(+ (+ a b) c)')
        expectExprAST('d + e - f', '(- (+ d e) f)')
        expectExprAST('g - h + i', '(+ (- g h) i)')
        expectExprAST('j * k + l', '(+ (* j k) l)')
        expectExprAST('m + n * o', '(+ m (* n o))')

        // Native precedence overridden by parenthetical groups.
        expectExprAST('(p + q) + r', '(+ (+ p q) r)')
        expectExprAST('s + (t + u)', '(+ s (+ t u))')
        expectExprAST('(v * w) + x', '(+ (* v w) x)')
        expectExprAST('(y + z) * a', '(* (+ y z) a)')
      })
    })

    describe('errors', () => {
      it('should reject unknown unary operators', () => {
        expectSyntaxError('*5', `(1:1) unexpected '*'`)
        expectSyntaxError(']', `(1:1) unexpected ']'`)
      })

      it('should reject unknown binary operators', () => {
        expectSyntaxError('2 , 2', `(1:3) unexpected ','`)
      })

      it('should reject unterminated parentheticals', () => {
        expectSyntaxError('(2 + 2', `(1:7) expected ')', got 'EOF'`)
      })
    })
  })

  describe('#parseBlock', () => {
    let blockTests = parseTestFile('statements/block.txt')

    describe('whitespace', () => {
      it('should compress consecutive newlines', () => {
        blockTests.testTokens('newline compression')
      })

      it('should respect multiple indentation schemes', () => {
        blockTests.testTokens('single space indent')
        blockTests.testTokens('octuple space indent')
        blockTests.testTokens('crazy space indent')
      })
    })

    describe('contents', () => {
      it('should allow blocks only a single comment', () => {
        blockTests.testTokens('comment block')
      })
    })
  })

  describe('#parseStmt', () => {
    describe('expression statements', () => {
      it('should respect semicolon and EOF terminators', () => {
        expectStmtAST('a + b', '(+ a b)')
        expectStmtAST('a + b;', '(+ a b)')
        expectStmtAST('a + b; c - d', '(+ a b) (- c d)')
        expectStmtAST('a + b; c - d;', '(+ a b) (- c d)')
      })

      it('should reject missing terminators', () => {
        expectSyntaxError('a + b c - d', `(1:7) unexpected 'Ident'`)
      })
    })

    describe('assignment statements', () => {
      let assignmentTests = parseTestFile('statements/assign.txt')

      it('should parse identifier assignment', () => {
        assignmentTests.testAST('identifier assignment')
      })

      it('should parse list element assignment', () => {
        assignmentTests.testAST('list element assignment')
      })
    })

    describe('if statements', () => {
      let ifTests = parseTestFile('statements/if.txt')

      it('should parse if conditions', () => {
        ifTests.testAST('if condition')
      })

      it('should parse if-else conditions', () => {
        ifTests.testAST('if-else condition')
      })

      it('should parse if-elif-else conditions', () => {
        ifTests.testAST('if-elif-else condition')
      })
    })

    describe('while statements', () => {
      let whileTests = parseTestFile('statements/while.txt')

      it('should parse while conditions', () => {
        whileTests.testAST('while condition')
      })
    })
  })
})
