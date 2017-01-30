//
// src/parser/token.ts
// MiniPy2
//
// Created on 1/25/17
//

export enum TokenType {
  // Special tokens.
  Error = 0,
  EOF,
  Indent,
  Dedent,

  // Word-like tokens.
  Ident,
  And,
  Not,
  Or,
  If,
  Elif,
  Else,
  While,

  // Literals.
  Bool,
  Num,
  Str,

  // Operators & punctuation.
  Asterisk,
  Colon,
  SemiColon,
  Bang,
  Comma,
  Dash,
  LeftBracket,
  LeftParen,
  Plus,
  RightBracket,
  RightParen,
  Slash,
  Assign
}

export function tokenTypeToSymbol (typ: TokenType): string {
  switch (typ) {
    case TokenType.Asterisk:      return '*'
    case TokenType.Colon:         return ':'
    case TokenType.SemiColon:     return ';'
    case TokenType.Bang:          return '!'
    case TokenType.Comma:         return ','
    case TokenType.Dash:          return '-'
    case TokenType.LeftBracket:   return '['
    case TokenType.LeftParen:     return '('
    case TokenType.Plus:          return '+'
    case TokenType.RightBracket:  return ']'
    case TokenType.RightParen:    return ')'
    case TokenType.Slash:         return '/'
    case TokenType.Assign:        return '='
    default:                      return TokenType[typ]
  }
}

export default class Token {
  type: TokenType
  literal: string
  loc: number

  constructor (type: TokenType, literal: string, loc: number) {
    this.type = type
    this.literal = literal
    this.loc = loc
  }

  toSymbol (): string {
    return tokenTypeToSymbol(this.type)
  }
}
