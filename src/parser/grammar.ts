//
// src/parser/grammar.ts
// MiniPy2
//
// Created on 1/25/17
//

import {TokenType} from './token'

/**
 * Since using an empty string to represent the end of a file can cause
 * unpredictable behavior, a null character is used instead.
 */
export const EOF = '\0'

export function isEOF (c: string): boolean {
  return (c === EOF)
}

export function isLineBreak (c: string): boolean {
  return (c === '\n')
}

export function isInlineWhitespace (c: string): boolean {
  return (c <= ' ') && (isLineBreak(c) === false) && (isEOF(c) === false)
}

export function isComment (c: string): boolean {
  return (c === '#')
}

export function isOperatorStart (c: string): boolean {
  const ops = [
    '-',
    ',',
    ';',
    ':',
    '!',
    '(',
    ')',
    '[',
    ']',
    '*',
    '/',
    '+',
    '='
  ]

  return (ops.indexOf(c) >= 0)
}

export function isDoubleQuote (c: string): boolean {
  return (c === '"')
}

export function isDigit (c: string): boolean {
  return ('0' <= c) && (c <= '9')
}

export function isLetter (c: string): boolean {
  return (('a' <= c) && (c <= 'z')) || (('A' <= c) && (c <= 'Z'))
}

export function isAlphaNumeric (c: string): boolean {
  return (c === '_') || isLetter(c) || isDigit(c)
}

export function isKeyword (word: string): boolean {
  return (keywords[word] !== undefined)
}

export const keywords: { [key: string]: TokenType } = {
  'if': TokenType.KeywordIf,
  'elif': TokenType.KeywordElif,
  'else': TokenType.KeywordElse,
  'while': TokenType.KeywordWhile,
}
