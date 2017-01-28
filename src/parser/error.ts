//
// src/parser/error.ts
// MiniPy2
//
// Created on 1/26/17
//

export default class SyntaxError {
  input: string
  msg: string
  line: number
  col: number

  constructor (input: string, msg: string, line: number, col: number) {
    this.input = input
    this.msg = msg
    this.line = line
    this.col = col
  }

  toString () {
    return `(${this.line}:${this.col}) ${this.msg}`
  }
}
