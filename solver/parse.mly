%{
open Ast
open Lexing
(* use this to get the line number for the n'th token *)
let rhs n =
  let pos = Parsing.rhs_start_pos n in
  pos.pos_lnum
let parse_error s =
  let pos = Parsing.symbol_end_pos () in
  let l = pos.pos_lnum in
  print_string ("line "^(string_of_int l)^": "^s^"\n") 
%}

/* Tells us which non-terminal to start the grammar with. */
%start instance

/* This specifies the non-terminals of the grammar and specifies the
 * types of the values they build. Don't forget to add any new non-
 * terminals here.
 */
%type <Ast.inst> instance
%type <Ast.exp> exp

/* The %token directive gives a definition of all of the terminals
 * (i.e., tokens) in the grammar. This will be used to generate the
 * tokens definition used by the lexer. So this is effectively the
 * interface between the lexer and the parser --- the lexer must
 * build values using this datatype constructor to pass to the parser.
 * You will need to augment this with your own tokens...
 */
%token <int> INT 
%token <string> VAR
%token EOF LPAREN RPAREN LBRACKET RBRACKET PLUS EQ NOT HALF AND OR

/* Boolean not and the halver are unary
 * The comparison operators are non associative, as they don't appear together
 * Finally, the operators increase in precedence as you go down the list */

%left OR
%left AND

%nonassoc EQ
%left PLUS
%left HALF
%right NOT

/* Here's where the real grammar starts! */
%%

instance:
    exp { Clause $1 }
  | exp AND instance { And (Clause $1, $3) }
  | exp OR instance { Or (Clause $1, $3) }
  | LPAREN instance RPAREN { $2 }

exp:
    INT { Int($1) }
  | VAR { Var($1) }
  | LBRACKET exp RBRACKET { $2 }
  | exp PLUS exp { Plus ($1, $3) }
  | exp EQ exp { Eq ($1, $3) }
  | NOT exp { Not $2 }
  | exp HALF { Half $1 }

/*program:
  stmt EOF { $1 }
;

stmt :
    block { $1 }
  | line stmt { (Seq ($1, $2), 0) }
;

block :
    line { $1 }
  | LBRACE stmt RBRACE { $2 }
;

line :
  (* empty *) SEMI { (Ast.skip, 0) }
  | exp SEMI { (Exp $1, 0) }
  | RET exp SEMI { (Return $2, 0) }
  | IF LPAREN exp RPAREN block %prec "dangling" { (If ($3, $5, (Ast.skip, 0)), 0) }
  | IF LPAREN exp RPAREN block ELSE block { (If ($3, $5, $7), 0) }
  | WHILE LPAREN exp RPAREN block { (While ($3, $5), 0) }
  | FOR LPAREN exp SEMI exp SEMI exp RPAREN block { (For ($3, $5, $7, $9), 0) }
;

exp :
    INT { (Int($1), 0) }
  | VAR { (Var($1), 0) }
  | MINUS exp { (Binop ((Int (-1), 0), Times, $2), 0) }
  | LPAREN exp RPAREN { $2 }
  | exp PLUS exp { (Binop ($1,Plus,$3), 0) }
  | exp MINUS exp { (Binop ($1,Minus,$3), 0) }
  | exp TIMES exp { (Binop ($1,Times,$3), 0) }
  | exp DIV exp { (Binop ($1,Div,$3), 0) }
  | exp EQ exp { (Binop ($1,Eq,$3), 0) }
  | exp NEQ exp { (Binop ($1,Neq,$3), 0) }
  | exp LT exp { (Binop ($1,Lt,$3), 0) }
  | exp LTE exp { (Binop ($1,Lte,$3), 0) }
  | exp GT exp { (Binop ($1,Gt,$3), 0) }
  | exp GTE exp { (Binop ($1,Gte,$3), 0) }
  | NOT exp { (Not $2, 0) }
  | exp AND exp { (And ($1,$3), 0) }
  | exp OR exp { (Or ($1,$3), 0) }
  | VAR ASSIGN exp { (Assign ($1, $3), 0) }
;*/

