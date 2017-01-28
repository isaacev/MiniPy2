//
// src/parser/parser.ts
// MiniPy2
//
// Created on 1/26/17
//

import SyntaxError from './error'
import * as ast from './ast'
import Token, { TokenType, tokenTypeToSymbol } from './token'
import Lexer from './lexer'

/**
 * Two types of parsing functions for unary and binary expressions.
 */
type prefixParseletFn = (p: Parser) => ast.Expr
type infixParseletFn = (p: Parser, left: ast.Expr) => ast.Expr

/**
 * The precedence levels for different types of expressions.
 * See https://docs.python.org/3/reference/expressions.html#operator-precedence
 */
enum PrecLevel {
  Lowest = 0,
  Assignment, // =
  Equals,     // == !=
  Relative,   // >
  Sum,        // + -
  Product,    // * /
  Prefix,     // -X !X
  Attribute,  // thing.prop thing[X] thing()
}

/**
 * A mapping of operators to the appropriate precedence. Any operators,
 * keywords or symbols not included in this mapping are assigned the
 * lowest precedence.
 */
const precTable: { [sym: string]: PrecLevel } = {
  "="  : PrecLevel.Assignment,
  "==" : PrecLevel.Equals,
  "!=" : PrecLevel.Equals,
  "<"  : PrecLevel.Relative,
  ">"  : PrecLevel.Relative,
  "<=" : PrecLevel.Relative,
  ">=" : PrecLevel.Relative,
  "+"  : PrecLevel.Sum,
  "-"  : PrecLevel.Sum,
  "*"  : PrecLevel.Product,
  "/"  : PrecLevel.Product,
  "("  : PrecLevel.Attribute,
  "["  : PrecLevel.Attribute,
  "."  : PrecLevel.Attribute,
}

/**
 * The following two structures map syntax symbols (operators, keywords, and
 * other significant tokens) to the appropriate functions for converting the
 * surrounding tokens into an abstract-syntax-tree (AST) node. These mappings
 * are fundamental to the top-down-operator-precedence (TDOP) parsing algorithm.
 *
 * The first mapping is for prefix expressions. This includes both unary-prefix
 * operators (like `-x` and `!y`), statements that start with a keyword
 * (like `if` and `def`), literals (like `123` and `"foo"`), and variable
 * names (like `x` or `abs`).
 *
 * The second mapping is for infix expressions. This includes mathematical
 * operators (like `2 / 2` and `true || false`), assignment statements
 * (like `x = 5` and `y += 1`), function calls, property accessors, and
 * subscripts. The last three types of expressions may not seem to have a
 * similar syntactic to mathematical and logical operations but if you consider
 * the operant binary operators to be `(` for function calls, `.` for property
 * accessors, and `[` for subscripts the can be parsed in a similar fasion.
 *
 * The same symbol can be mapped to both a prefix parselet function and an
 * infix parselet function. The distinction is made within the `parseExpr`
 * method based on the relative precedence of the surrounding expressions
 * and syntactic clues.
 *
 * More information about the theory behind the TDOP parsing algorithm and
 * its implementation can be found here:
 *
 * @see http://javascript.crockford.com/tdop/tdop.html
 * @see http://eli.thegreenplace.net/2010/01/02/top-down-operator-precedence-parsing
 * @see http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy
 */

/**
 * A mapping of operators and symbols to the appropriate PREFIX parsing
 * function. Each parsing function returns an AST node.
 */
const prefixParselets: { [sym: string]: prefixParseletFn } = {
  "IDENT" : parseIdent,
  "BOOL"  : parseBoolLit,
  "NUM"   : parseNumLit,
  "STR"   : parseStrLit,
  "["     : parseArrLit,
  "("     : parseExprGroup,
  "-"     : parseUnaryPrefixExpr,
  "!"     : parseUnaryPrefixExpr,
}

/**
 * A mapping of operators and symbols to the appropriate INFIX parsing
 * function. Each parsing function returns an AST node.
 */
const infixParselets: { [sym: string]: infixParseletFn } = {
  "+"  : parseBinaryInfixExpr,
  "-"  : parseBinaryInfixExpr,
  "*"  : parseBinaryInfixExpr,
  "/"  : parseBinaryInfixExpr,
  "==" : parseBinaryInfixExpr,
  "!=" : parseBinaryInfixExpr,
  "<"  : parseBinaryInfixExpr,
  ">"  : parseBinaryInfixExpr,
  "<=" : parseBinaryInfixExpr,
  ">=" : parseBinaryInfixExpr,
  "="  : parseBinaryInfixExpr,
}

/**
 * Parser converts a given string of source code into an abstract syntax tree.
 * The AST can then be used for analysis, further code generation, or other
 * tasks.
 */
export default class Parser {
  /**
   * A string of raw source code to be lexed and parsed. When syntax errors are
   * detected this string is used to produce more revealing error messages.
   */
  input: string

  /**
   * A token lexer that emits a stream of tokens from the source code input
   * passed to the parser upon construction.
   */
  private lexer: Lexer

  /**
   * The token currently in the process of being assigned to an expression. See
   * {@link Parser#parseExpr} for an example of how this parameter is used
   * during expression parsing.
   */
  private currToken: Token

  /**
   * Creates an instance of Parser.
   */
  constructor (input: string) {
    this.input = input
    this.lexer = new Lexer(input)
    this.currToken = this.lexer.nextToken()
  }

  /**
   * Parse the source code as a full program with a list of 0+ statements at the
   * top of the AST.
   */
  parseProg (): ast.Program {
    let stmts = []
    while (true) {
      let stmt = this.parseStmt()
      stmts.push(stmt)

      if (this.currTokenIs(TokenType.EOF)) {
        break
      }
    }

    return new ast.Program(stmts)
  }

  /**
   * A private method for advancing the token stream by 1 token and setting the
   * {@link Parser#currToken} property to the next token returned by the lexer.
   */
  private advanceTokenStream () {
    this.currToken = this.lexer.nextToken()
  }

  /**
   * Return true if {@link Parser#currToken} matches the given token type.
   */
  currTokenIs (typ: TokenType): boolean {
    return (this.currToken.type === typ)
  }

  /**
   * Return {@link Parser#currToken} and advance the token stream if the
   * token matches the given token type. Throw an error if the
   * {@link Parser#currToken} doesn't match the given {@link TokenType}.
   */
  useToken (typ: TokenType): Token {
    if (this.currTokenIs(typ)) {
      let tok = this.currToken
      this.advanceTokenStream()
      return tok
    }

    let wantedSym = tokenTypeToSymbol(typ)
    let gotSym = this.currToken.toSymbol()
    this.fatalError(this.currToken, `expected '${wantedSym}', got '${gotSym}'`)
  }

  /**
   * Return the {@link Parser#currToken} and advance the token stream. No token
   * type checks are applied. Use sparingly and prefer {@link useToken} whenever
   * possible.
   */
  useAnyToken (): Token {
    let tok = this.currToken
    this.advanceTokenStream()
    return tok
  }

  isStmtTerminator (): boolean {
    switch (true) {
      case this.currTokenIs(TokenType.SemiColon):
      case this.currTokenIs(TokenType.EOF):
        return true
      default:
        return false
    }
  }

  expectStmtTerminator () {
    switch (true) {
      case this.isStmtTerminator():
        return
      default:
        this.throwMissingTerminator()
    }
  }

  /**
   * TODO
   */
  expectExprTerminator () {
    switch (true) {
      case this.isStmtTerminator():
      case this.currTokenIs(TokenType.RightBracket):
      case this.currTokenIs(TokenType.RightParen):
      case this.currTokenIs(TokenType.Comma):
        return
      default:
        this.throwInfixParsingError(this.currToken)
    }
  }

  /**
   * Throw a {@link SyntaxError} with the current line number, column number,
   * and with the given error message.
   */
  fatalError (tok: Token, msg: string) {
    let pos = this.lexer.getLineCol(tok.loc)
    throw new SyntaxError(this.input, msg, pos[0], pos[1])
  }

  /**
   * Create a fatal error when no matching prefix parsing function can be found.
   */
  throwPrefixParsingError (tok: Token) {
    let sym = tok.toSymbol()
    this.fatalError(tok, `unexpected '${sym}'`)
  }

  /**
   * Create a fatal error when no matching infix parsing function can be found.
   */
  throwInfixParsingError (tok: Token) {
    let sym = tok.toSymbol()
    this.fatalError(tok, `unexpected '${sym}'`)
  }

  throwMissingTerminator () {
    let sym = this.currToken.toSymbol()
    this.fatalError(this.currToken, `unexpected '${sym}'`)
  }

  /**
   * Lookup a given token in the prefix parselet table using the token's symbol.
   * Return `undefined` if the token's symbol isn't in the table.
   */
  lookupPrefixParselet (tok: Token): prefixParseletFn {
    let sym = tok.toSymbol()

    return prefixParselets[sym]
  }

  /**
   * Lookup a given token in the infix parselet table using the token's symbol.
   * Return `undefined` if the token's symbol isn't in the table.
   */
  lookupInfixParselet (tok: Token): infixParseletFn {
    let sym = tok.toSymbol()

    return infixParselets[sym]
  }

  /**
   * Return true if a given token is NOT allowed to begin an expression. Only
   * token symbols recognized by the prefix parselet lookup table are allowed
   * to begin an expression.
   */
  noPrefixParseletExists (tok: Token): boolean {
    if (this.lookupPrefixParselet(tok) === undefined) {
      return true
    }

    return false
  }

  /**
   * Return true if a given token is NOT allowed to be an infix operator. Only
   * token symbols recogniezd by the infix parselet lookup table are allowed to
   * act as infix operators.
   */
  noInfixParseletExists (tok: Token): boolean {
    if (this.lookupInfixParselet(tok) === undefined) {
      return true
    }

    return false
  }

  /**
   * currPrecedence determintes the precedence level for the current token in
   * the precedence lookup table. If the token's symbol is not in the table,
   * return the lowest possible precedence which equates to a non-binding
   * precedence of 0.
   *
   * The precedence value returned by this function is used in expression
   * parsing algorithm to determine whether a given token should be bound
   * to the expression on its left or to the expression on its right.
   */
  currPrecedence (): PrecLevel {
    // Lookup the current token in the precedence table.
    const prec = precTable[this.currToken.toSymbol()]

    // If the token isn't registered in the table, assign it the lowest
    // possible precedence. Otherwise return the precedence found in the table.
    if (prec === undefined) {
      return PrecLevel.Lowest
    } else {
      return prec
    }
  }

  /**
   * parseExpr represents the core of the parsing module's expression parsing
   * logic. Each run of the parseExpr function will parse one expression
   * (including any sub-expressions) from the token stream and return the
   * corresponding AST node.
   */
  parseExpr (minPrecedence: PrecLevel): ast.Expr {
    /**
     * In order for parsing to continue, the current token must be allowed to
     * begin an expression (according to the syntax described in the prefix
     * parselet lookup table). If the current token isn't allowed to start an
     * expression, emit a syntax error.
     */
    if (this.noPrefixParseletExists(this.currToken)) {
      this.throwPrefixParsingError(this.currToken)
    }

    // Once it's known that the token is legal, get the appropriate parsing
    // function from the prefix parselet lookup table.
    let prefixParselet = this.lookupPrefixParselet(this.currToken)

    // Apply the prefix parselet to the stream of tokens to begin generating
    // an AST node for this expression.
    let expr = prefixParselet(this)

    /**
     * The following loop handles the parsing of any number of additional
     * infix expressions as long as those expressions have a precedence greater
     * than the minimum precedence level passed into this function.
     */
    while (this.currPrecedence() > minPrecedence) {
      /**
       * In order for parsing to continue, the current token must be allowed to
       * act as an infix operator within an expression (according to the syntax
       * described in the infix parselet lookup table). If the current token
       * isn't allowed to act as an infix operator, that doesn't _necessarily_
       * represent an error but is means that the current expression can't be
       * parsed any further so the expression can be returned.
       */
      if (this.noInfixParseletExists(this.currToken)) {
        // Check that whatever token comes after this expression and was unable
        // to be included in the expression is still legally allowed to come
        // after an expression.
        this.expectExprTerminator()
        return expr
      }

      // Once it's known that the token is legal, get the appropriate parsing
      // function from the infix parselet lookup table.
      let infixParselet = this.lookupInfixParselet(this.currToken)

      // Apply the infix parselet to the stream of tokens to expand the current
      // expression and AST node.
      expr = infixParselet(this, expr)
    }

    // Return the parsed AST node once the expression can't be expanded any
    // further because of precedence limits or an exhaustion of the lexer.
    return expr
  }

  /**
   * parseStmt is responsible for parsing statements from the token stream. The
   * statement parsing function to use is determined based on the first token of
   * the statement since most statements can be identified by their leading
   * keyword. If the statement can't be easily identified, assume parse it as an
   * expression-statement. A description of expression-statements accompanies
   * the `parseExprStmt` function.
   */
  parseStmt (): ast.Stmt {
    switch (this.currToken.type) {
      default:
        return parseExprStmt(this)
    }
  }
}

/**
 * parseExprStmt parses the next expression and wraps to make it look like any
 * other statement.
 *
 * Exactly which expression are allowed to function as statements can depend on
 * the language or a linter. In many languages it may be perfectly legal to
 * allow strings, numbers and other literals to exist outside of any expression.
 * However the existence of literals outside of other expressions poses the
 * question: if these side-effect free literals are not being used, why are they
 * included in the program? It may therefore be considered by many as good
 * practice to forbid side-effect free expression from existing ouside of other
 * expressions since more often than not these cases are caused by accident
 * rather than intention and may signal the existence of a bug or some other
 * unexpected behavior.
 */
function parseExprStmt (p: Parser): ast.ExprStmt {
  let expr = p.parseExpr(PrecLevel.Lowest)

  p.expectExprTerminator()
  p.expectStmtTerminator()
  p.useAnyToken()

  return new ast.ExprStmt(expr)
}

/**
 * parseIdent parses a single variable identifier token.
 */
function parseIdent (p: Parser): ast.Ident {
  return new ast.Ident(p.useToken(TokenType.Ident))
}

/**
 * parseBoolLit parses a single boolean literal token.
 */
function parseBoolLit (p: Parser): ast.BoolLit {
  return new ast.BoolLit(p.useToken(TokenType.Bool))
}

/**
 * parseNumLit parses a single number literal token.
 */
function parseNumLit (p: Parser): ast.NumLit {
  return new ast.NumLit(p.useToken(TokenType.Num))
}

/**
 * parseStrLit parses a single string literal token.
 */
function parseStrLit (p: Parser): ast.StrLit {
  return new ast.StrLit(p.useToken(TokenType.Str))
}

/**
 * parseArrLit parses an array literal which is 0 or more expressions between
 * square brackets. Trailing commas are permitted.
 */
function parseArrLit (p: Parser): ast.ArrLit {
  // Consume left bracket.
  let leftBracket = p.useToken(TokenType.LeftBracket)

  // Initialize container for parsed elements.
  let elems: ast.Expr[] = []

  // Parse all literal elements.
  while (true) {
    // Exit the loop if a right bracket is detected.
    if (p.currTokenIs(TokenType.RightBracket)) {
      break
    }

    // Parse expression.
    let expr = p.parseExpr(PrecLevel.Lowest)
    elems.push(expr)

    if (p.currTokenIs(TokenType.Comma)) {
      // Consume the comma. The comma could be between expressions or after the
      // last expression as a "trailing comma".
      p.useToken(TokenType.Comma)
      continue
    } else {
      // If the next token is NOT a comma, assume the array literal is ending
      // and exit the loop.
      break
    }
  }

  // Expect a right bracket to exist at the end of the array.
  let rightBracket = p.useToken(TokenType.RightBracket)

  return new ast.ArrLit(leftBracket, elems, rightBracket)
}

/**
 * parseExprGroup parses a single expression wrapped in parentheses and returns
 * the inner expression.
 */
function parseExprGroup (p: Parser): ast.Expr {
  // Consume left paren.
  p.useToken(TokenType.LeftParen)

  // Parse inner expression.
  let expr = p.parseExpr(PrecLevel.Lowest)

  // Consume right paren.
  p.useToken(TokenType.RightParen)

  return expr
}

/**
 * parseInfixExpr parses a generic binary infix expression which is an
 * expression of the form:
 *
 * <left expression> <operator token> <right expression>
 *
 * Examples of these kinds of expressions include binary mathematical and
 * logical operations.
 */
function parseBinaryInfixExpr (p: Parser, left: ast.Expr): ast.BinaryExpr {
  // Determine precedence of current token so that the right-hand expression.
  let precedence = p.currPrecedence()

  // Parse the infix operator token.
  let oper = p.useAnyToken()

  // Parse right-hand operand expression.
  let right = p.parseExpr(precedence)

  return new ast.BinaryExpr(oper, left, right)
}

/**
 * parsePrefixExpr parses a generic unary prefix expression which is an
 * expression of the form:
 *
 * <operator token> <expression>
 *
 * Examples of these kinds of expressions include numeric negation (`-`) and
 * logical not (`not` and `!`).
 */
function parseUnaryPrefixExpr (p: Parser): ast.UnaryExpr {
  // Parse the prefix operator token.
  let oper = p.useAnyToken()

  // Parse the right-hand operand
  let right = p.parseExpr(PrecLevel.Prefix)

  return new ast.UnaryExpr(oper, right)
}
