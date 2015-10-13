tests(O,
  {
    name: 'ifThenElse (1/2)',
    code: '(1 > 2).ifThenElse({111}, {222})',
    expected: 222
  },
  {
    name: 'ifThenElse (2/2)',
    code: '(1 < 2).ifThenElse({111}, {222})',
    expected: 111
  },
  {
    name: 'loop (1/2)',
    code: 'var f = 0;\n' +
          '10.loop({f = f+2;});\n' +
          'f;',
    expected: 20
  },
  {
    name: 'loop (2/2)',
    code: 'var f = 0;\n' +
          '0.loop({f = f+2;});\n' +
          'f;',
    expected: 0
  },
  {
    name: 'non-local return (1/2)',
    code: 'def True then tb else fb = tb.call();\n' +
          'def False then tb else fb = fb.call();\n\n' +
          'def Number.fact() {\n' +
          '  this === 0 then {\n' +
          '    return 1;\n' +
          '  } else {\n' +
          '    return this * (this - 1).fact();\n' +
          '  }\n' +
          '}\n\n' +
          '5.fact()',
    expected: 120
  },
  {
    name: 'non-local return (2/2)',
    code: 'def Object.m() {\n' +
          '  var b = { return 5; };\n' +
          ' return this.n(b) * 2;\n' +
          '}\n\n' +
          'def Object.n(aBlock) {\n' +
          '  aBlock.call();\n' +
          '  return 42;\n' +
          '}\n\n' +
          'new Object().m()',
    expected: 5
  }
);

