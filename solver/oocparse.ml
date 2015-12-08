open Ast
open Eval

exception BadArgs

(* This magic is used to glue the generated lexer and parser together.
 * Expect one command-line argument, a file to parse.
 * You do not need to understand this interaction with the system. *)
let parse_file() =
  let argv = Sys.argv in
  let ch = 
    if Array.length argv = 1
    then stdin
    else (if Array.length argv = 2
    then open_in argv.(1)
    else let _ = 
      prerr_string ("usage: " ^ argv.(0) ^ "[file-to-parse]\n") in
    raise BadArgs) in
    prerr_string "asdf";
  Parse.program Lex.lexer (Lexing.from_channel ch)

(* Expect 1 command line argument, the file to parse 
 * in absence of argument, it will default to stdin
 * usage: ps2yacc [file-to-parse] *)
let _ =
  let prog = parse_file() in
  let ans = eval prog in
  print_string ("answer = "^(string_of_int ans)^"\n")
