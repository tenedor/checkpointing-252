{
open Parse
open Lexing

let incr_lineno lexbuf =
  let pos = lexbuf.lex_curr_p in
  lexbuf.lex_curr_p <- { pos with
    pos_lnum = pos.pos_lnum + 1;
    pos_bol = pos.pos_cnum;
  }
}

(* definition section *)
let cr='\013'
let nl='\010'
let eol=(cr nl|nl|cr)
let ws=('\012'|'\t'|' ')*
let digit=['0'-'9'] 
let var=['a'-'z' 'A'-'Z'] (['a'-'z' 'A'-'Z' '0'-'9' '_'])*

(* rules section *)
rule lexer = parse
| eol { incr_lineno lexbuf; lexer lexbuf } 
| ws+ { lexer lexbuf }
| "/*" { comment lexbuf }
| digit+ { INT(int_of_string(Lexing.lexeme lexbuf)) } 
| "if" { IF }
| "else" { ELSE }
| "while" { WHILE }
| "for" { FOR }
| "return" { RET }
| var { VAR(Lexing.lexeme lexbuf) }
| '(' { LPAREN }
| ')' { RPAREN }
| '{' { LBRACE }
| '}' { RBRACE }
| '+' { PLUS }
| '-' { MINUS }
| '*' { TIMES }
| '/' { DIV }
| "=" { ASSIGN }
| "==" { EQ }
| "!=" { NEQ }
| '<' { LT }
| "<=" { LTE }
| '>' { GT }
| ">=" { GTE }
| '!' { NOT }
| "&&" { AND }
| "||" { OR }
| ';' { SEMI }
| eof { EOF }

and comment = parse
| "*/" { lexer lexbuf }
| _ { comment lexbuf }
