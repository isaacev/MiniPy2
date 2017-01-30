//
// test/parser/util.ts
// MiniPy2
//
// Created on 1/28/17
//

// NPM modules.
import { readFileSync } from 'fs'
import * as path from 'path'
import 'mocha'
import { expect } from 'chai'

// Local modules.
import { TokenType } from '../../src/parser/token'
import Lexer from '../../src/parser/lexer'
import Parser from '../../src/parser/parser'

class TestPair {
  input: string
  output: string

  constructor (input: string, output: string) {
    this.input = input
    this.output = output
  }
}

type TestHash = { [name: string]: TestPair }

class TestFileRunner {
  tests: TestHash

  constructor (tests: TestHash) {
    this.tests = tests
  }

  testTokens (name: string) {
    if (this.tests[name] !== undefined) {
      let t = this.tests[name]
      let l = new Lexer(t.input)

      let expectedSymbols = t.output.trim().split('\n')
      let nextSymbol = 0

      while (true) {
        let sym = expectedSymbols[nextSymbol++] || 'EOF'
        let tok = l.nextToken()
        expect(tok.toSymbol()).to.equal(sym)

        if (tok.type === TokenType.EOF) {
          break
        }
      }
    } else {
      throw new Error(`no test named '${name}'`)
    }
  }

  testAST (name: string) {
    if (this.tests[name] !== undefined) {
      let t = this.tests[name]
      let p = new Parser(t.input)
      let a = p.parseProg()
      let s = a.toString()

      expect(s).to.equal(t.output)
      return
    }

    throw new Error(`no test named '${name}'`)
  }
}

export function parseTestFile (filename: string): TestFileRunner {
  let filepath =path.join(__dirname, filename)
  let contents = readFileSync(filepath, 'utf8')

  const startTest = '+++'
  const segmentTest = '---'

  let lines = contents.split('\n')
  let tests: TestHash = {}

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (line.slice(0, 3) === startTest) {
      let name = line.slice(4)
      let input: string[] = []
      let output: string[] = []
      i++

      // Get test input.
      while (true) {
        line = lines[i++]

        if (line.slice(0, 3) === segmentTest) {
          break
        } else {
          input.push(line)
        }
      }

      // Get test output.
      while (true) {
        line = lines[i++]

        if (line.slice(0, 3) === segmentTest) {
          break
        } else {
          output.push(line)
        }
      }

      tests[name] = new TestPair(input.join('\n'), output.join('\n'))
    }
  }

  return new TestFileRunner(tests)
}
