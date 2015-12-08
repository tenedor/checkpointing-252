{
open Parse
open Lexing

(* definition section *)
let cr='\013'
let nl='\010'
let eol=(cr nl|nl|cr)
let ws=('\012'|'\t'|' '|'"')* (* we ignore " which appears when copypasting constraints *)

let id = digit* ('_' digit*)*
let name = ['A'-'Z''a'-'z']['a'-'z''A'-'Z''0'-'9']* (* variable names in OO don't have _? *)
let var = [('n' id) | ('k' id) | ('B' id name)]

(* rules section *)
rule lexer = parse
| eol { lexer lexbuf } 
| ws+ { lexer lexbuf }
| var { VAR(Lexing.lexeme lexbuf) }
| digit+ { INT(int_of_string(Lexing.lexeme lexbuf)) } 
| '(' { LPAREN }
| ')' { RPAREN }
| '+' { PLUS }
| "=" { EQ }
| '!' { NOT }
| "/2" { HALF }
| "&" { AND }
| "|" { OR }
| eof { EOF }

