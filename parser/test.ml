let parse_file (fname : string) = Parse.input Lex.lexer (Lexing.from_channel (open_in fname))
