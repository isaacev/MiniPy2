//
// src/parser/main.ts
// MiniPy2
//
// Created on 1/30/17
//

import { removeTrailingWhitespace } from './preprocess'
import Parser from './parser'
import * as ast from './ast'

export default function (input: string): ast.Program {
  // Remove trailing whitespace from source code
  input = removeTrailingWhitespace(input)

  // Create an abstract syntax tree from source code
  let p = new Parser(input)
  return p.parseProg()
}
