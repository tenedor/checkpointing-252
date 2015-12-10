# We are not really tracking dependencies because everything is small
# enough to recompile at will.

# change to a different ocamlc if you prefer (e.g., ocamlopt)
COMPILER=ocamlc
TOPLEVEL=ocamlmktop

all: clean yacc test

com:
	$(COMPILER) -c ast.ml
	$(COMPILER) -c ampl.ml

# to debug the parser, export OCAMLRUNPARAM='p'
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
	$(TOPLEVEL) -o topoocparse ast.cmo parse.cmo lex.cmo ampl.cmo test.cmo

test: oocparse
	for i in test/example_*.ooc ; \
  do \
    ./oocparse $$i > `echo $$i | sed -e 's/example/output/;s/ooc/ampl/'` ; \
  done

clean:
	-rm *.cmo *.cmi oocparse topoocparse parse.ml parse.mli lex.ml test/output_*.ampl
