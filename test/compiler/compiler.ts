//
// test/compiler/compiler.ts
// MiniPy2
//
// Created on 1/30/17
//

import { parseTestFile } from './util'

describe('compiler', () => {
  describe('#compileExpr', () => {
    let exprTests = parseTestFile('tests/expr.txt')

    it('should compile binary add', () => {
      exprTests.testBytestream('add expression')
    })

    it('should compile compound binary addition', () => {
      exprTests.testBytestream('compound add expression')
    })
  })
})
