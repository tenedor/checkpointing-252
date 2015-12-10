# We are not really tracking dependencies because everything is small
# enough to recompile at will.

# change to a different ocamlc if you prefer (e.g., ocamlopt)
COMPILER=ocamlc
TOPLEVEL=ocamlmktop

all: toc

# to debug the parser, export OCAMLRUNPARAM='p'
yacc: 
	$(COMPILER) -c ast.ml
	ocamlyacc parse.mly
	$(COMPILER) -c parse.mli
	$(COMPILER) -c parse.ml
	ocamllex lex.mll
	$(COMPILER) -c lex.ml

toampl: yacc
	$(COMPILER) -c ampl.ml
	$(COMPILER) -c toampl.ml
	$(COMPILER) -o toampl ast.cmo parse.cmo lex.cmo ampl.cmo toampl.cmo

testampl: toampl
	for i in test/example_*.ooc ; \
  do \
    ./toampl $$i > `echo $$i | sed -e 's/example/output/;s/ooc/ampl/'` ; \
  done

ampl: clean yacc testampl

toc: yacc
	$(COMPILER) -c c.ml
	$(COMPILER) -c toc.ml
	$(COMPILER) -o toc ast.cmo parse.cmo lex.cmo c.cmo toc.cmo

testc : toc
	for i in test/example_*.ooc ; \
	do \
		name=$$(echo $$i | sed -e 's/example/solve/;s/\.ooc//') ; \
		./toc $$i > $${name}.c ; \
		gcc --std=c11 -O3 -o $$name $${name}.c ; \
	done

c: clean yacc testc

toplevel: com yacc toampl
	$(COMPILER) -c test.ml
	$(TOPLEVEL) -o toptoampl ast.cmo parse.cmo lex.cmo ampl.cmo test.cmo

clean:
	-rm *.cmo *.cmi toampl toptoampl parse.ml parse.mli lex.ml test/output_*.ampl
