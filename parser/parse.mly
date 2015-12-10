%{
open Ast
open Lexing
(* to debug this file, export OCAMLRUNPARAM='p' *)
%}

/* Tells us which non-terminal to start the grammar with. */
%start input

/* This specifies the non-terminals of the grammar and specifies the
 * types of the values they build. Don't forget to add any new non-
 * terminals here.
 */
%type <Ast.inst> input
%type <Ast.inst> instance
%type <Ast.exp> exp

/* The %token directive gives a definition of all of the terminals
 * (i.e., tokens) in the grammar. This will be used to generate the
 * tokens definition used by the lexer. So this is effectively the
 * interface between the lexer and the parser --- the lexer must
 * build values using this datatype constructor to pass to the parser.
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

input:
  instance EOF { $1 }

instance:
  | VAR EQ exp { Assign ($1, $3) }
  | VAR { True $1 }
  | NOT VAR { False $2 }
  | instance AND instance { And ($1, $3) }
  | instance OR instance { Or ($1, $3) }
  | LPAREN instance RPAREN { $2 }
;

exp:
    INT { Int($1) }
  | VAR { Var($1) }
  | LBRACKET exp RBRACKET { $2 }
  | exp PLUS exp { Plus ($1, $3) }
  | exp HALF { Half $1 }
;

