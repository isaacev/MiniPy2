//
// src/parser/preprocess.ts
// MiniPy2
//
// Created on 1/30/17
//

// Local modules.
import { isInlineWhitespace } from './grammar'

/**
 * Remove all trailing whitespace from the source code. Loop over string from
 * last character -> first character, removing any spaces or tabs that occur
 * immediately before a newline.
 */
export function removeTrailingWhitespace (input: string): string {
  let out = ''

  // Starts true so that whitespace at the end of the input string is ignored.
  let trailing = true

  for (let i = input.length - 1; i >= 0; i--) {
    let c = input[i]

    // Skip trailing whitespace
    if (trailing && isInlineWhitespace(c)) {
      continue
    }

    trailing = (c === '\n')
    out = c + out
  }

  return out;
}
