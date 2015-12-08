# We are not really tracking dependencies because everything is small
# enough to recompile at will.

# change to a different ocamlc if you prefer (e.g., ocamlopt)
COMPILER=ocamlc
TOPLEVEL=ocamlmktop

all: clean yacc

com:
	$(COMPILER) -c ast.ml
	#$(COMPILER) -c ampl.ml

yacc: com
	ocamlyacc parse.mly
	$(COMPILER) -c parse.mli
	$(COMPILER) -c parse.ml
	ocamllex lex.mll
	$(COMPILER) -c lex.ml
	$(COMPILER) -c oocparse.ml
	$(COMPILER) -o oocparse ast.cmo parse.cmo lex.cmo ampl.cmo oocparse.cmo

toplevel: com yacc
	$(COMPILER) -c test.ml
	$(TOPLEVEL) -o ps1toplevel ast.cmo parse.cmo lex.cmo eval.cmo test.cmo

clean:
	-rm *.cmo *.cmi oocparse parse.ml parse.mli lex.ml
