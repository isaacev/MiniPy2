//
// test/parser/lexer.ts
// MiniPy2
//
// Created on 1/25/17
//

// NPM modules.
import 'mocha'
import { expect } from 'chai'

// Module for testing.
import * as grammar from '../../src/parser/grammar'
import Token, {TokenType} from '../../src/parser/token'
import Lexer from '../../src/parser/lexer'

function lexerFactory (input: string): Lexer {
  return new Lexer(input)
}

function expectToken (tok: Token, typ: TokenType, lit: string) {
  expect(tok).to.be.instanceof(Token)
  expect(tok.type).to.equal(typ)
  expect(tok.literal).to.equal(lit)
}

function expectErrorToken (l: Lexer, tok: Token, lit: string, line: number, col: number) {
  expectToken(tok, TokenType.Error, lit)
  const pos = l.getLineCol(tok.loc)
  expect(pos[0]).to.equal(line)
  expect(pos[1]).to.equal(col)
}

describe('lexer', () => {
  describe('#constructor', () => {
    it('should initialize to starting values', () => {
      let l = lexerFactory('xyz')
      expect(l.input).to.be.a('string')
      expect(l.input).to.equal('xyz')
      expect(l.start).to.be.a('number')
      expect(l.start).to.equal(0)
      expect(l.pos).to.be.a('number')
      expect(l.pos).to.equal(0)
    })

    it('should start with an empty buffer', () => {
      let l = lexerFactory('xyz')
      expect(l.buffer).to.be.an('array')
      expect(l.buffer).to.have.lengthOf(0)
    })
  })

  describe('#peekChar', () => {
    it('should not advance input stream', () => {
      let l = lexerFactory('xy')
      expect(l.peekChar()).to.equal('x')
      expect(l.peekChar()).to.equal('x')
      l.nextChar() // 'x'
      expect(l.peekChar()).to.equal('y')
      expect(l.peekChar()).to.equal('y')
    })

    it('should return null string after EOF', () => {
      let l = lexerFactory('x')
      expect(l.peekChar()).to.equal('x')
      l.nextChar() // 'x'
      expect(l.peekChar()).to.equal(grammar.EOF)
      expect(l.peekChar()).to.equal(grammar.EOF)
    })
  })

  describe('#nextChar', () => {
    it('should advance the input stream', () => {
      let l = lexerFactory('xyz')
      expect(l.nextChar()).to.equal('x')
      expect(l.nextChar()).to.equal('y')
      expect(l.nextChar()).to.equal('z')
    })

    it('should return null string after EOF', () => {
      let l = lexerFactory('xyz')
      l.nextChar() // 'x'
      l.nextChar() // 'y'
      l.nextChar() // 'z'
      expect(l.nextChar()).to.equal(grammar.EOF)
      expect(l.nextChar()).to.equal(grammar.EOF)
    })
  })

  describe('#accept', () => {
    it('should accept a single matching char', () => {
      let l = lexerFactory('xyz')
      expect(l.accept('x')).to.equal(true)
    })

    it('should advance stream past matching char', () => {
      let l = lexerFactory('xyz')
      expect(l.peekChar()).to.equal('x')
      l.accept('x')
      expect(l.peekChar()).to.equal('y')
    })

    it('should reject a single unmatched char', () => {
      let l = lexerFactory('xyz')
      expect(l.accept('abc')).to.equal(false)
      expect(l.accept('')).to.equal(false)
    })

    it('should not advance past unmatched char', () => {
      let l = lexerFactory('xyz')
      expect(l.peekChar()).to.equal('x')
      l.accept('a')
      expect(l.peekChar()).to.equal('x')
    })
  })

  describe('#acceptRun', () => {
    it('should greedily accept matching sequential chars', () => {
      let l = lexerFactory('xxxyyyxxxxzzzz')
      l.acceptRun('xy')
      expect(l.currentSlice()).to.equal('xxxyyyxxxx')
    })

    it('should not start collecting until matching char found', () => {
      let l = lexerFactory('xaaabbbaaa')
      l.acceptRun('ab')
      expect(l.currentSlice()).to.equal('')
    })
  })

  describe('#ignore', () => {
    it('should ignore chars between `Lexer.start` and `Lexer.pos`', () => {
      let l = lexerFactory('aaaxxxaaa')
      l.acceptRun('a')
      expect(l.currentSlice()).to.equal('aaa')
      l.ignore()
      expect(l.currentSlice()).to.equal('')
    })
  })

  describe('#backupChar', () => {
    it('should back up the input stream by 1 char', () => {
      let l = lexerFactory('abc')
      expect(l.pos).to.equal(0)
      l.nextChar()
      expect(l.pos).to.equal(1)
      l.backupChar()
      expect(l.pos).to.equal(0)
    })
  })

  describe('#nextToken', () => {
    describe('legal syntax', () => {
      it('should lex boolean literals', () => {
        const l = lexerFactory('True False')
        expectToken(l.nextToken(), TokenType.Bool, 'True')
        expectToken(l.nextToken(), TokenType.Bool, 'False')
      })

      it('should lex number literals', () => {
        const l = lexerFactory('123 456 1.23 45.6e+123')
        expectToken(l.nextToken(), TokenType.Num, '123')
        expectToken(l.nextToken(), TokenType.Num, '456')
        expectToken(l.nextToken(), TokenType.Num, '1.23')
        expectToken(l.nextToken(), TokenType.Num, '45.6e+123')
      })

      it('should lex string literals', () => {
        const l = lexerFactory('"abc" "def"')
        expectToken(l.nextToken(), TokenType.Str, '"abc"')
        expectToken(l.nextToken(), TokenType.Str, '"def"')
      })

      it('should lex operators', () => {
        const l = lexerFactory('- : ( ) [ ] * / + < = >')
        expectToken(l.nextToken(), TokenType.Dash, '-')
        expectToken(l.nextToken(), TokenType.Colon, ':')
        expectToken(l.nextToken(), TokenType.LeftParen, '(')
        expectToken(l.nextToken(), TokenType.RightParen, ')')
        expectToken(l.nextToken(), TokenType.LeftBracket, '[')
        expectToken(l.nextToken(), TokenType.RightBracket, ']')
        expectToken(l.nextToken(), TokenType.Asterisk, '*')
        expectToken(l.nextToken(), TokenType.Slash, '/')
        expectToken(l.nextToken(), TokenType.Plus, '+')
        expectToken(l.nextToken(), TokenType.LessThan, '<')
        expectToken(l.nextToken(), TokenType.Assign, '=')
        expectToken(l.nextToken(), TokenType.GreaterThan, '>')
      })

      it('should lex keywords', () => {
        const l = lexerFactory('if while')
        expectToken(l.nextToken(), TokenType.If, 'if')
        expectToken(l.nextToken(), TokenType.While, 'while')
      })

      it('should lex identifiers', () => {
        const l = lexerFactory('abc _def')
        expectToken(l.nextToken(), TokenType.Ident, 'abc')
        expectToken(l.nextToken(), TokenType.Ident, '_def')
      })

      it('should lex EOF tokens', () => {
        const l = lexerFactory('')
        expectToken(l.nextToken(), TokenType.EOF, '')
        expectToken(l.nextToken(), TokenType.EOF, '')
        expectToken(l.nextToken(), TokenType.EOF, '')
      })
    })

    describe('illegal syntax', () => {
      it('should reject unknown operators', () => {
        const l = lexerFactory('foo\n@ bar')
        expectToken(l.nextToken(), TokenType.Ident, 'foo')
        expectErrorToken(l, l.nextToken(), `unexpected symbol: '@'`, 2, 1)
      })

      it('should reject unterminated strings', () => {
        const l = lexerFactory('"abc')
        expectErrorToken(l, l.nextToken(), 'unterminated string', 1, 1)
      })

      it('should reject malformed number literals', () => {
        const l = lexerFactory('123a')
        expectErrorToken(l, l.nextToken(), `bad number syntax: '123a'`, 1, 1)
      })
    })

    it('should ignore comments', () => {
      const l1 = lexerFactory('# foo bar')
      expectToken(l1.nextToken(), TokenType.EOF, '')

      const l2 = lexerFactory('\n# foo bar\n')
      expectToken(l2.nextToken(), TokenType.EOF, '')
    })
  })
})
