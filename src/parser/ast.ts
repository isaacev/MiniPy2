//
// src/parser/ast.ts
// MiniPy2
//
// Created on 1/26/17
//

import Token from './token'

export interface Node {
  toString(): string
}

export interface Expr extends Node {
  exprNode(): void
}

export interface Stmt extends Node {
  stmtNode(): void
}

export class Block {
  stmts: Stmt[]

  constructor (stmts: Stmt[]) {
    this.stmts = stmts
  }

  toString () {
    return this.stmts.reduce((str, stmt, i) => {
      if (i === 0) {
        return str + '\n(' + stmt.toString()
      } else {
        return str + '\n ' + stmt.toString()
      }
    }, '') + ')'
  }
}

export class Program {
  stmts: Stmt[]

  constructor (stmts: Stmt[]) {
    this.stmts = stmts
  }

  toString (): string {
    return this.stmts.map(stmt => stmt.toString()).join('\n')
  }
}

export class IfStmt {
  ifCond: Expr
  ifClause: Block
  elifClauses: ElifClause[]
  elseClause: Block

  constructor (ifCond: Expr, ifClause: Block, elifClauses: ElifClause[], elseClause: Block) {
    this.ifCond = ifCond
    this.ifClause = ifClause
    this.elifClauses = elifClauses
    this.elseClause = elseClause
  }

  toString () {
    let ifClauseStr = this.ifClause
      .toString()
      .trim()
      .split('\n')
      .map(line => '\n  ' + line)
      .join('')

    let elifClauseStrs = ''

    if (this.elifClauses !== null && this.elifClauses.length > 0) {
      elifClauseStrs = this.elifClauses
        .map(clause => clause.toString())
        .join('')
        .trim()
        .split('\n')
        .map(line => '\n  ' + line)
        .join('')
    }

    let elseClauseStr = ''

    if (this.elseClause !== null) {
      elseClauseStr = this.elseClause
        .toString()
        .trim()
        .split('\n')
        .map(line => '\n  ' + line)
        .join('')
    }

    return (
      '(if (' + this.ifCond.toString() + ')' +
      ifClauseStr +
      elifClauseStrs +
      elseClauseStr +
      ')'
    )
  }

  /* istanbul ignore next */
  stmtNode () {}
}

export class ElifClause {
  elifCond: Expr
  elifClause: Block

  constructor (elifCond: Expr, elifClause: Block) {
    this.elifCond = elifCond
    this.elifClause = elifClause
  }

  toString () {
    let elifClauseStr = this.elifClause
      .toString()
      .trim()
      .split('\n')
      .map(line => '\n  ' + line)
      .join('')

    return (
      '\n(elif (' + this.elifCond.toString() + ')' +
      elifClauseStr +
      ')'
    )
  }
}

export class ExprStmt {
  expr: Expr

  constructor (expr: Expr) {
    this.expr = expr
  }

  toString (): string {
    return this.expr.toString()
  }

  /* istanbul ignore next */
  stmtNode () {}
}

export class Ident {
  token: Token

  constructor (tok: Token) {
    this.token = tok
  }

  toString (): string {
    return this.token.literal
  }

  /* istanbul ignore next */
  exprNode () {}
}

export class BoolLit {
  token: Token

  constructor (tok: Token) {
    this.token = tok
  }

  toString (): string {
    return this.token.literal
  }

  /* istanbul ignore next */
  exprNode () {}
}

export class NumLit {
  token: Token

  constructor (tok: Token) {
    this.token = tok
  }

  toString (): string {
    return this.token.literal
  }

  /* istanbul ignore next */
  exprNode () {}
}

export class StrLit {
  token: Token

  constructor (tok: Token) {
    this.token = tok
  }

  toString (): string {
    return this.token.literal
  }

  /* istanbul ignore next */
  exprNode () {}
}

export class ArrLit {
  leftBracket: Token
  elems: Expr[]
  rightBracket: Token

  constructor (leftBracket: Token, elems: Expr[], rightBracket: Token) {
    this.leftBracket = leftBracket
    this.elems = elems
    this.rightBracket = rightBracket
  }

  toString (): string {
    return '[' + this.elems.reduce((out, elem) => {
      return out + ' ' + elem.toString()
    }, '') + ' ]'
  }

  /* istanbul ignore next */
  exprNode () {}
}

export class BinaryExpr {
  token: Token
  a: Expr
  b: Expr

  constructor (tok: Token, a: Expr, b: Expr) {
    this.token = tok
    this.a = a
    this.b = b
  }

  toString (): string {
    let oper = this.token.literal
    let a = this.a.toString()
    let b = this.b.toString()

    return `(${oper} ${a} ${b})`
  }

  /* istanbul ignore next */
  exprNode () {}
}

export class UnaryExpr {
  token: Token
  a: Expr

  constructor (tok: Token, a: Expr) {
    this.token = tok
    this.a = a
  }

  toString (): string {
    let oper = this.token.literal
    let a = this.a.toString()

    return `(${oper} ${a})`
  }

  /* istanbul ignore next */
  exprNode () {}
}
