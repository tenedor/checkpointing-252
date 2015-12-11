tests(O,
  {
    name: 'arithmetic',
    code: '1 + 2 * 3',
    expected: 7
  },
  {
    name: 'var decls + access',
    code: 'var x = 1, y = 2;\n' +
          'x * 10 + y',
    expected: 12
  },
  {
    name: 'var decl + assignment',
    code: 'var x = 1;\n' +
          'x = 2;\n' +
          'x * 3',
    expected: 6
  },
  {
    name: '== jet for literals (1/2)',
    code: '3 == 3',
    expected: true
  },
  {
    name: '== jet for literals (2/2)',
    code: '2 == 3',
    expected: false
  },
  {
    name: 'if (1/2)',
    code: 'if (true) {\n' +
          '  return 1;\n' +
          '}\n' +
          'return 2;',
    expected: 1
  },
  {
    name: 'if (2/2)',
    code: 'if (false) {\n' +
          '  return 1;\n' +
          '}\n' +
          'return 2;',
    expected: 2
  },
  {
    name: 'if else (1/2)',
    code: 'var x = 0;\n' +
          'if (true) {\n' +
          '  x = 1;\n' +
          '} else {\n' +
          '  x = 2;\n' +
          '}\n' +
          'x',
    expected: 1
  },
  {
    name: 'if else (2/2)',
    code: 'var x = 0;\n' +
          'if (false) {\n' +
          '  x = 1;\n' +
          '} else {\n' +
          '  x = 2;\n' +
          '}\n' +
          'x',
    expected: 2
  },
  {
    name: 'if: lexical scope',
    code: 'var x = 1, y = 10;\n' +
          'if (true) {\n' +
          '  var x = 5;\n' +
          '  y = x + y;\n' +
          '}\n' +
          'x + y',
    expected: 16
  },
  {
    name: 'while',
    code: 'var i = 0, x = 1;\n' +
          'while (i < 5) {\n' +
          '  i = i + 1;\n' +
          '  x = x * i;\n' +
          '}\n' +
          'x == 1 * 2 * 3 * 4 * 5',
    expected: true
  },
  {
    name: 'while: lexical scope',
    code: 'var i = 0, x = -100, y = 100;\n' +
          'while (i < 5) {\n' +
          '  i = i + 1;\n' +
          '  var y = 2 * i;\n' +
          '  x = x + y;\n' +
          '}\n' +
          'x + y == 2 * (1 + 2 + 3 + 4 + 5)',
    expected: true
  },
  {
    name: 'method decl, new, and send',
    code: 'def Object.m() { return 42; }\n' +
          'new Object().m()',
    expected: 42
  },
  {
    name: 'method decl (with args), new, and send',
    code: 'def Object.m(x, y) { return x + y; }\n' +
          'new Object().m(1, 2)',
    expected: 3
  },
  {
    name: 'class decl + method decl + inst var ops + new',
    code: 'class RefCell with value;\n' +
          'def RefCell.initialize(value) { this.value = value; }\n' +
          'def RefCell.get() = this.value;\n' +
          'new RefCell(3).get()',
    expected: 3
  },
  {
    name: '== jet for instances (1/2)',
    code: 'var x = new Object();\n' +
          'x == x',
    expected: true
  },
  {
    name: '== jet for instances (2/2)',
    code: 'var x = new Object();\n' +
          'var y = new Object();\n' +
          'x == y',
    expected: false
  },
  {
    name: 'fibonacci',
    code: 'var limit = 1000;\n' +
          'var x = 0;\n' +
          'var y = 1;\n' +
          'while (y < limit) {\n' +
          'var t = x + y;\n' +
          '  x = y;\n' +
          '  y = t;\n' +
          '}\n' +
          'y;',
    expected: 1597
  },
  {
    name: 'adder sim',
    code: 'var x = 2;\n' +
          'var y = 3;\n' +
          'if (x < 0 or (x > 3 or (y < 0 or y > 3))) {\n' +
          '  return -1;\n' +
          '}\n' +
          'var x1;\n' +
          'if (x >= 2) {\n' +
          '  x1 = 1;\n' +
          '}\n' +
          'else {\n' +
          '  x1 = 0;\n' +
          '}\n' +
          'var x0 = x - 2 * x1;\n' +
          'var y1;\n' +
          'if (y >= 2) {\n' +
          '  y1 = 1;\n' +
          '}\n' +
          'else {\n' +
          '  y1 = 0;\n' +
          '}\n' +
          'var y0 = y - 2 * y1;\n' +
          'var s0;\n' +
          'if ((x0 != 0 or y0 != 0) and !(x0 != 0 and y0 != 0)) {\n' +
          '  s0 = 1;\n' +
          '}\n' +
          'else {\n' +
          '  s0 = 0;\n' +
          '}\n' +
          'var c1;\n' +
          'if (x0 != 0 and y0 != 0) {\n' +
          '  c1 = 1;\n' +
          '}\n' +
          'else {\n' +
          '  c1 = 0;\n' +
          '}\n' +
          'var s1;\n' +
          'if ((x1 != 0 and (y1 != 0 and c1 != 0))\n' +
          '    or ((x1 != 0 and (y1 == 0 and c1 == 0))\n' +
          '    or ((x1 == 0 and (y1 != 0 and c1 == 0))\n' +
          '    or (x1 == 0 and (y1 == 0 and c1 != 0))))) {\n' +
          '  s1 = 1;\n' +
          '}\n' +
          'else {\n' +
          '  s1 = 0;\n' +
          '}\n' +
          'var c2;\n' +
          'if ((x1 != 0 and y1 != 0) or ((x1 != 0 and c1 != 0) or (y1 != 0 and c1 != 0))) {\n' +
          '  c2 = 1;\n' +
          '}\n' +
          'else {\n' +
          '  c2 = 0;\n' +
          '}\n' +
          '4 * c2 + 2 * s1 + s0;',
    expected: 5
  },
  {
    name: 'nested if',
    code: 'var a = 2;\n' +
          'var b = 2;\n' +
          'var c = 1;\n' +
          'var x = 0;\n' +
          'if (a == 1) {\n' +
          '  if (b == 1) {\n' +
          '    if (c == 1) { x = 1; } else { x = 2; }\n' +
          '  } else {\n' +
          '    if (c == 1) { x = 3; } else { x = 4; }\n' +
          '  }\n' +
          '} else {\n' +
          '  if (b == 1) {\n' +
          '    if (c == 1) { x = 5; } else { x = 6; }\n' +
          '  } else {\n' +
          '    if (c == 1) { x = 7; } else { x = 8; }\n' +
          '  }\n' +
          '}\n' +
          'return x;',
    expected: 7
  }

);

