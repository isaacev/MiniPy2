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

  // Word-like tokens.
  Ident,
  KeywordAnd,
  KeywordNot,
  KeywordOr,

  // Literals.
  Bool,
  Num,
  Str,

  // Operators & punctuation.
  Asterisk,
  Colon,
  Dash,
  LeftBracket,
  LeftParen,
  Plus,
  RightBracket,
  RightParen,
  Slash
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
}
