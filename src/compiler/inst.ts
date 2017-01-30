//
// src/compiler/instruction.ts
// MiniPy2
//
// Created on 1/29/17
//

export enum InstType {
  // Special instructions.
  Error = 0,
  Halt,
  Line,

  // Data instructions.
  Push,
  Pop,
  Store,
  Read,

  // Control flow instructions.
  Branch,
  Goto,
  Label,

  // Function instructions.
  Call,
  Ret,

  // Math & comparison instructions.
  Add,
  Sub,
  Mul,
  Div, // TODO: specialize into integer & float division
  Eq,
  Lt,
  LtEq,
  Gt,
  GtEq,
  And,
  Not,
  Or,
}

function instTypeToString (typ: InstType): string {
  return InstType[typ]
}

export default class Inst {
  type: InstType
  args: string[]

  constructor (typ: InstType, args: string[]) {
    this.type = typ
    this.args = args
  }

  toString () {
    let out = instTypeToString(this.type)

    out += this.args.reduce((out, arg) => {
      return out + '\t' + arg
    }, '')

    return out
  }
}
