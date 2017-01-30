//
// src/compiler/bytestream.ts
// MiniPy2
//
// Created on 1/29/17
//

import Inst, { InstType } from './inst'

export default class Bytestream {
  insts: Inst[]

  constructor () {
    this.insts = []
  }

  write (typ: InstType, ...args: string[]) {
    this.insts.push(new Inst(typ, args))
  }

  toString () {
    return this.insts
      .map(inst => inst.toString())
      .join('\n')
  }
}
