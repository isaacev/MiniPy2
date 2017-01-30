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
  indentStack: number[]

  constructor (input: string) {
    this.input = input
    this.start = 0
    this.pos = 0
    this.state = lexAny
    this.buffer = []
    this.indentStack = [0]
  }

  clearIndentTo (indentDepth: number) {
    while (indentDepth < this.indentStack[this.indentStack.length - 1]) {
      this.emit(TokenType.Dedent)
      this.indentStack.pop()
    }
  }

  getLineCol (loc: number): [number, number] {
    let line = 1
    let col = 1

    for (let i = 0, l = this.input.length; i < l; i++) {
      if (i === loc) {
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

    return [line, col]
  }

  currentSlice (): string {
    return this.input.slice(this.start, this.pos)
  }

  peekChar (): string {
    if (this.pos < this.input.length) {
      return this.input[this.pos]
    }

    return grammar.EOF
  }

  nextChar (): string {
    if (this.pos < this.input.length) {
      let next = this.input[this.pos]
      this.pos++
      return next
    }

    return grammar.EOF
  }

  accept (valid: string): boolean {
    let c = this.nextChar()
    if (valid.indexOf(c) >= 0) {
      return true
    }

    if (c !== grammar.EOF) {
      this.backupChar()
    }

    return false
  }

  acceptRun (valid: string) {
    let c = this.nextChar()
    while (valid.indexOf(c) >= 0) {
      c = this.nextChar()

      if (c === grammar.EOF) {
        return
      }
    }

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
    this.buffer.push(new Token(t, literal, this.start))
    this.start = this.pos
    return lexAny
  }

  emitError (msg: string): stateFn {
    this.buffer.push(new Token(TokenType.Error, msg, this.start))
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
      case grammar.isInlineWhitespace(r):
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
  l.clearIndentTo(0)

  l.emit(TokenType.EOF)
  return lexEOF
}

function lexLineBreak (l: Lexer): stateFn {
  /**
   * First stage of this lexing function ignores consecutive
   * newline characters.
   */

  // Ignore initial newline.
  l.ignore()

  // Ignore following newlines (if any).
  while (grammar.isLineBreak(l.peekChar())) {
    l.nextChar()
    l.ignore()
  }

  // Quit the lexing function if the next character is EOF.
  if (grammar.isEOF(l.peekChar())) {
    return lexEOF
  }

  /**
   * Second stage checks counts how deeply indented the current line is. If
   * the line has only inline whitespace characters, throw an error since
   * trailing whitespace is an error.
   */

  // Counts number of inline whitespace characters at the start of the line.
  let indentDepth = getIndentDepth(l)

  // Catches lines with only trailing whitespace.
  if (indentDepth > 0 && grammar.isLineBreak(l.peekChar())) {
    throw new Error('no trailing whitespace')
  }

  /**
   * Third stage determines whether the indentaiton on the current line is more
   * or less indentation than was present on the previous line. If there is more
   * indentation, emit an Indent token. If there is less indentation, emit 1 or
   * more Dedent tokens.
   */

  let prevIndentDepth = l.indentStack[l.indentStack.length - 1]

  if (indentDepth > prevIndentDepth) {
    l.indentStack.push(indentDepth)
    l.emit(TokenType.Indent)
  } else if (indentDepth < prevIndentDepth) {
    l.clearIndentTo(indentDepth)
  }

  return lexAny
}

function getIndentDepth (l: Lexer): number {
  l.acceptRun(' ')
  let depth = l.currentSlice().length
  l.ignore()

  return depth
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
    case ',':
      return l.emit(TokenType.Comma)
    case ':':
      return l.emit(TokenType.Colon)
    case ';':
      return l.emit(TokenType.SemiColon)
    case '!':
      return l.emit(TokenType.Bang)
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
    case '<':
      return l.emit(TokenType.LessThan)
    case '=':
      return l.emit(TokenType.Assign)
    case '>':
      return l.emit(TokenType.GreaterThan)
    /* istanbul ignore next */
    default:
      // If execution reaches this point, that constitutes a bug caused by a
      // disagreement between `lexOperator` and `Grammar#isOperatorStart`
      // regarding the set of legal operator symbols.
      return l.emitError(`unexpected symbol: '${r}'`)
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
        if (grammar.isEOF(r) === false) {
          l.backupChar()
        }

        let word = l.currentSlice()

        switch (true) {
          case grammar.isKeyword(word):
            l.emit(grammar.keywords[word])
            break
          case word === 'True' || word === 'False':
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
