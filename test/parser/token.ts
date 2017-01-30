//
// test/parser/token.ts
// MiniPy2
//
// Created on 1/28/17
//

// NPM modules.
import { expect } from 'chai'

// Module for testing.
import { TokenType, tokenTypeToSymbol } from '../../src/parser/token'

function expectSymbol (typ: TokenType, sym: string) {
  expect(tokenTypeToSymbol(typ)).to.equal(sym)
}

describe('tokenTypeToSymbol', () => {
  it('should convert TokenType to string', () => {
    expectSymbol(TokenType.EOF, 'EOF')
    expectSymbol(TokenType.Indent, 'Indent')
    expectSymbol(TokenType.Dedent, 'Dedent')
    expectSymbol(TokenType.Ident, 'Ident')
    expectSymbol(TokenType.And, 'And')
    expectSymbol(TokenType.Not, 'Not')
    expectSymbol(TokenType.Or, 'Or')
    expectSymbol(TokenType.If, 'If')
    expectSymbol(TokenType.Elif, 'Elif')
    expectSymbol(TokenType.Else, 'Else')
    expectSymbol(TokenType.While, 'While')
    expectSymbol(TokenType.Bool, 'Bool')
    expectSymbol(TokenType.Num, 'Num')
    expectSymbol(TokenType.Str, 'Str')
    expectSymbol(TokenType.Asterisk, '*')
    expectSymbol(TokenType.Colon, ':')
    expectSymbol(TokenType.SemiColon, ';')
    expectSymbol(TokenType.Bang, '!')
    expectSymbol(TokenType.Comma, ',')
    expectSymbol(TokenType.Dash, '-')
    expectSymbol(TokenType.LeftBracket, '[')
    expectSymbol(TokenType.LeftParen, '(')
    expectSymbol(TokenType.Plus, '+')
    expectSymbol(TokenType.RightBracket, ']')
    expectSymbol(TokenType.RightParen, ')')
    expectSymbol(TokenType.Slash, '/')
    expectSymbol(TokenType.Assign, '=')
  })
})
