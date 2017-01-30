//
// src/compiler/compiler.ts
// MiniPy2
//
// Created on 1/29/17
//

// Local modules.
import * as ast from '../parser/ast'
import Bytestream from './bytestream'
import { InstType } from './inst'

export default class Compiler {
  prog: ast.Program

  constructor (prog: ast.Program) {
    this.prog = prog
  }

  compile (): Bytestream {
    let bs = new Bytestream()

    compileProg(this.prog, bs)

    return bs
  }
}

function compileProg (node: ast.Program, bs: Bytestream) {
  for (let i = 0, l = node.stmts.length; i < l; i++) {
    compileStmt(node.stmts[i], bs)
  }

  bs.write(InstType.Halt)
}

function compileStmt (node: ast.Node, bs: Bytestream) {
  switch (true) {
    case (node instanceof ast.IfStmt):
      compileIfStmt(node as ast.IfStmt, bs)
      return
    case (node instanceof ast.WhileStmt):
      compileWhileStmt(node as ast.WhileStmt, bs)
      return
    case (node instanceof ast.AssignStmt):
      compileAssignStmt(node as ast.AssignStmt, bs)
      return
    case (node instanceof ast.ExprStmt):
      compileExpr((node as ast.ExprStmt).expr, bs)
      return
    default:
      throw new Error('unknown statement type')
  }
}

function compileIfStmt (node: ast.IfStmt, bs: Bytestream) {
  // TODO
}

function compileWhileStmt (node: ast.WhileStmt, bs: Bytestream) {
  // TODO
}

function compileExpr (node: ast.Expr, bs: Bytestream) {
  switch (true) {
    case (node instanceof ast.BinaryExpr):
      compileBinaryExpr(node as ast.BinaryExpr, bs)
      return
    case (node instanceof ast.Ident):
      compileIdentExpr(node as ast.Ident, bs)
      return
    case (node instanceof ast.NumLit):
      compileNumLit(node as ast.NumLit, bs)
      return
    default:
      throw new Error('unknown expression type')
  }
}

function compileBinaryExpr (node: ast.BinaryExpr, bs: Bytestream) {
  compileExpr(node.b, bs)
  compileExpr(node.a, bs)

  switch (node.token.toSymbol()) {
    case '+':
      bs.write(InstType.Add)
      return
    case '-':
      bs.write(InstType.Sub)
      return
    case '*':
      bs.write(InstType.Mul)
      return
    case '/':
      bs.write(InstType.Div)
      return
    default:
      throw new Error('unknown binary expression: ' + node.token.toSymbol())
  }
}

function compileAssignStmt (node: ast.AssignStmt, bs: Bytestream) {
  compileExpr(node.expr, bs)
  bs.write(InstType.Store, node.ident.token.literal)
}

function compileIdentExpr (node: ast.Ident, bs: Bytestream) {
  bs.write(InstType.Read, node.token.literal)
}

function compileNumLit (node: ast.NumLit, bs: Bytestream) {
  bs.write(InstType.Push, node.token.literal)
}
