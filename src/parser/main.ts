//
// src/parser/main.ts
// MiniPy2
//
// Created on 1/30/17
//

import Parser from './parser'
import * as ast from './ast'

export default function (input: string): ast.Program {
  // Create an abstract syntax tree from source code
  let p = new Parser(input)
  return p.parseProg()
}
