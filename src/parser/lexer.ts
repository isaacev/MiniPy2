//
// src/parser/lexer.ts
// MiniPy2
//
// Created on 1/25/17
//

// Local modules.
import Token, {TokenType} from './token'
import * as grammar from './grammar'

/**
 * stateFn describes a lexer state function that emits some type and number of
 * tokens to the lexer token stream.
 */
type stateFn = (l: Lexer) => stateFn

export default class Lexer {
  input: string
  start: number
  pos: number
  state: stateFn
  buffer: Token[]

  constructor (input: string) {
    this.input = input
    this.start = 0
    this.pos = 0
    this.state = lexAny
    this.buffer = []
  }

  getLineCol (): [number, number] {
    let line = 1
    let col = 1

    for (let i = 0, l = this.input.length; i < l; i++) {
      if (i === this.start) {
        return [line, col]
      }

      let c = this.input[i]
      if (grammar.isLineBreak(c)) {
        line++
        col = 1
      } else {
        col++
      }
    }
  }

  currentSlice (): string {
    return this.input.slice(this.start, this.pos)
  }

  peekChar (): string {
    if (this.pos < this.input.length) {
      return this.input[this.pos]
    }

    return ''
  }

  nextChar (): string {
    if (this.pos < this.input.length) {
      let next = this.input[this.pos]
      this.pos++
      return next
    }

    return ''
  }

  accept (valid: string): boolean {
    if (valid.indexOf(this.nextChar()) >= 0) {
      return true
    }

    this.backupChar()
    return false
  }

  acceptRun (valid: string) {
    while (valid.indexOf(this.nextChar()) >= 0) {}

    this.backupChar()
  }

  ignore () {
    this.start = this.pos
  }

  backupChar () {
    this.pos--
  }

  emit (t: TokenType) {
    let literal = this.currentSlice()
    this.buffer.push(new Token(t, literal))
    this.start = this.pos
    return lexAny
  }

  emitError (msg: string): stateFn {
    this.buffer.push(new Token(TokenType.Error, msg))
    this.backupChar()
    return null
  }

  nextToken (): Token {
    while (true) {
      if (this.state !== null) {
        this.state = this.state(this)
      }

      if (this.buffer.length >= 1) {
        let tok = this.buffer.shift()

        /**
         * Special handling for error tokens. Error tokens aren't removed
         * from the token buffer so that once an error token is detected,
         * any subsequent calls to #nextToken() will also return the error
         * token.
         */
        if (tok.type === TokenType.Error) {
          this.buffer.unshift(tok)
          return tok
        }

        return tok
      }
    }
  }
}

function lexAny (l: Lexer): stateFn {
  while (true) {
    let r = l.nextChar()
    switch (true) {
      case grammar.isEOF(r):
        return lexEOF
      case grammar.isLineBreak(r):
        return lexLineBreak
      case grammar.isWhitespace(r):
        l.ignore()
        break
      case grammar.isComment(r):
        return lexComment
      case grammar.isOperatorStart(r):
        l.backupChar()
        return lexOperator
      case grammar.isDoubleQuote(r):
        return lexString
      case grammar.isDigit(r):
        l.backupChar()
        return lexNumber
      case grammar.isAlphaNumeric(r):
        l.backupChar()
        return lexIdentifier
      default:
        return l.emitError(`unexpected symbol: '${r}'`)
    }
  }
}

function lexEOF (l: Lexer): stateFn {
  l.emit(TokenType.EOF)
  return lexEOF
}

function lexLineBreak (l: Lexer): stateFn {
  l.ignore()
  return lexAny
}

function lexComment (l: Lexer): stateFn {
  loop:
  while (true) {
    let r = l.nextChar()
    switch (true) {
      case grammar.isEOF(r):
      case grammar.isLineBreak(r):
        break loop
    }
  }

  l.ignore()
  return lexAny
}

function lexOperator (l: Lexer): stateFn {
  let r = l.nextChar()
  switch (r) {
    case '-':
      return l.emit(TokenType.Dash)
    case ':':
      return l.emit(TokenType.Colon)
    case '(':
      return l.emit(TokenType.LeftParen)
    case ')':
      return l.emit(TokenType.RightParen)
    case '[':
      return l.emit(TokenType.LeftBracket)
    case ']':
      return l.emit(TokenType.RightBracket)
    case '*':
      return l.emit(TokenType.Asterisk)
    case '/':
      return l.emit(TokenType.Slash)
    case '+':
      return l.emit(TokenType.Plus)
  }
}

function lexString (l: Lexer): stateFn {
  loop:
  while (true) {
    let r = l.nextChar()
    switch (true) {
      case grammar.isEOF(r):
      case grammar.isLineBreak(r):
        return l.emitError('unterminated string')
      case grammar.isDoubleQuote(r):
        break loop
    }
  }

  return l.emit(TokenType.Str)
}

function lexNumber (l: Lexer): stateFn {
  l.acceptRun('0123456789')

  if (l.peekChar() === '.') {
    l.nextChar()
    l.acceptRun('0123456789')
  }

  if (l.accept('eE')) {
    l.accept('+-')
    l.acceptRun('0123456789')
  }

  if (grammar.isAlphaNumeric(l.peekChar())) {
    l.nextChar()
    return l.emitError(`bad number syntax: '${l.currentSlice()}'`)
  }

  return l.emit(TokenType.Num)
}

function lexIdentifier (l: Lexer): stateFn {
  loop:
  while (true) {
    let r = l.nextChar()
    switch (true) {
      case grammar.isAlphaNumeric(r):
        // absorb
        continue loop
      default:
        if (r !== '') {
          l.backupChar()
        }

        let word = l.currentSlice()

        switch (true) {
          // case grammar.keywords[word] !== undefined:
          //   l.emit(grammar.keywords[word])
          //   break
          case word === 'true' || word === 'false':
            l.emit(TokenType.Bool)
            break
          default:
            l.emit(TokenType.Ident)
        }

        break loop
    }
  }

  return lexAny
}
