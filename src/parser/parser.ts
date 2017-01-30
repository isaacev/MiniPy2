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
  "Ident" : parseIdent,
  "Bool"  : parseBoolLit,
  "Num"   : parseNumLit,
  "Str"   : parseStrLit,
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
  input: string
  private lexer: Lexer
  private currToken: Token

  constructor (input: string) {
    this.input = input
    this.lexer = new Lexer(input)
    this.currToken = this.lexer.nextToken()
  }

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

  private advanceTokenStream () {
    this.currToken = this.lexer.nextToken()
  }

  currTokenIs (typ: TokenType): boolean {
    return (this.currToken.type === typ)
  }

  useToken (typ: TokenType): Token {
    if (this.currTokenIs(typ)) {
      let tok = this.currToken
      this.advanceTokenStream()
      return tok
    }

    // Throw an error if the token wansn't the expected type.
    let wantedSym = tokenTypeToSymbol(typ)
    let gotSym = this.currToken.toSymbol()
    this.fatalError(this.currToken, `expected '${wantedSym}', got '${gotSym}'`)
  }

  /**
   * Use sparingly and prefer {@link useToken} when its possible to explicitly
   * declare which token type is expected.
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

  lookupPrefixParselet (tok: Token): prefixParseletFn {
    let sym = tok.toSymbol()

    return prefixParselets[sym]
  }

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

    // Apply the appropriate prefix parsing function to the token stream.
    let prefixParselet = this.lookupPrefixParselet(this.currToken)
    let expr = prefixParselet(this)

    /**
     * The following loop handles the parsing of any number of additional
     * infix expressions as long as those expressions have a precedence greater
     * than the minimum precedence level passed into this function.
     */
    while (this.currPrecedence() > minPrecedence) {
      // Apply the appropriate infix parsing function to the token stream.
      let infixParselet = this.lookupInfixParselet(this.currToken)
      expr = infixParselet(this, expr)
    }

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
      case TokenType.If:
        return parseIfStmt(this)
      case TokenType.While:
        return parseWhileStmt(this)
      default:
        return parseExprStmt(this)
    }
  }

  parseBlock (): ast.Block {
    let stmts: ast.Stmt[] = []

    this.useToken(TokenType.Colon)
    this.useToken(TokenType.Indent)

    while (true) {
      if (this.currTokenIs(TokenType.Dedent)) {
        this.useToken(TokenType.Dedent)
        break
      }

      let stmt = parseExprStmt(this)
      stmts.push(stmt)
    }

    return new ast.Block(stmts)
  }
}

function parseIfStmt (p: Parser): ast.IfStmt {
  p.useToken(TokenType.If)

  let ifCond = p.parseExpr(PrecLevel.Lowest)
  let ifClause = p.parseBlock()

  let elifClauses: ast.ElifClause[] = []
  while (p.currTokenIs(TokenType.Elif)) {
    p.useToken(TokenType.Elif)

    let elifCond = p.parseExpr(PrecLevel.Lowest)
    let elifClause = p.parseBlock()

    elifClauses.push(new ast.ElifClause(elifCond, elifClause))
  }

  let elseClause = null
  if (p.currTokenIs(TokenType.Else)) {
    p.useToken(TokenType.Else)
    elseClause = p.parseBlock()
  }

  return new ast.IfStmt(ifCond, ifClause, elifClauses, elseClause)
}

function parseWhileStmt (p: Parser): ast.WhileStmt {
  p.useToken(TokenType.While)

  let cond = p.parseExpr(PrecLevel.Lowest)
  let clause = p.parseBlock()

  return new ast.WhileStmt(cond, clause)
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

function parseIdent (p: Parser): ast.Ident {
  return new ast.Ident(p.useToken(TokenType.Ident))
}

function parseBoolLit (p: Parser): ast.BoolLit {
  return new ast.BoolLit(p.useToken(TokenType.Bool))
}

function parseNumLit (p: Parser): ast.NumLit {
  return new ast.NumLit(p.useToken(TokenType.Num))
}

function parseStrLit (p: Parser): ast.StrLit {
  return new ast.StrLit(p.useToken(TokenType.Str))
}

function parseArrLit (p: Parser): ast.ArrLit {
  let leftBracket = p.useToken(TokenType.LeftBracket)
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

  let rightBracket = p.useToken(TokenType.RightBracket)

  return new ast.ArrLit(leftBracket, elems, rightBracket)
}

/**
 * parseExprGroup parses a single expression wrapped in parentheses and returns
 * the inner expression.
 */
function parseExprGroup (p: Parser): ast.Expr {
  p.useToken(TokenType.LeftParen)
  let expr = p.parseExpr(PrecLevel.Lowest)
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
  let precedence = p.currPrecedence()
  let oper = p.useAnyToken()
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
  let oper = p.useAnyToken()
  let right = p.parseExpr(PrecLevel.Prefix)

  return new ast.UnaryExpr(oper, right)
}
