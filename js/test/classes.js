// initialize the language
OO.reset();

tests(JS,
  {
    name: 'times',
    code: '// 6 * 7\n' +
          'OO.core.send(6, "*", 7);',
    expected: 42
  },
  {
    name: 'a number is a Number',
    code: '// 123.isNumber()\n' +
          'OO.core.send(123, "isNumber");',
    expected: true
  },
  {
    name: 'an Object is not a Number',
    code: '// new Object().isNumber()\n' +
          'OO.core.send(OO.core.instantiate("Object"), "isNumber");',
    expected: false
  },
  {
    name: 'Point, sending messages to Numbers',
    code: '// class Point with x, y;\n' +
          'OO.core.declareClass("Point", "Object", ["x", "y"]);\n\n' +
          '// def Point.initialize(x, y) {\n' +
          '//   super.initialize();\n' +
          '//   this.x = x;\n' +
          '//   this.y = y;\n' +
          '// }\n' +
          'OO.core.declareMethod("Point", "initialize", function(_this, x, y) {\n' +
          '  OO.core.superSend("Object", _this, "initialize");\n' +
          '  OO.core.setInstVar(_this, "x", x);\n' +
          '  OO.core.setInstVar(_this, "y", y);\n' +
          '});\n\n' +
          '// def Point + that {\n' +
          '//   return new Point(this.x + that.x, this.y + that.y);\n' +
          '// }\n' +
          'OO.core.declareMethod("Point", "+", function(_this, that) {\n' +
          '  return OO.core.instantiate(\n' +
          '    "Point",\n' +
          '    OO.core.send(OO.core.getInstVar(_this, "x"), "+", OO.core.getInstVar(that, "x")),\n' +
          '    OO.core.send(OO.core.getInstVar(_this, "y"), "+", OO.core.getInstVar(that, "y"))\n' +
          '  );\n' +
          '});\n\n' +
          '// def Point.toString() {\n' +
          '//   return "Point(" + this.x + ", " + this.y + ")";\n' +
          '// }\n' +
          'OO.core.declareMethod("Point", "toString", function(_this) {\n' +
          '  return "Point(" + OO.core.getInstVar(_this, "x") + ", " + OO.core.getInstVar(_this, "y") + ")";\n' +
          '});\n\n' +
          '// var p = new Point(1, 2) + new Point(3, 4);\n' +
          '// p.toString()\n' +
          'var p = OO.core.send(OO.core.instantiate("Point", 1, 2), "+", OO.core.instantiate("Point", 3, 4));\n' +
          'OO.core.send(p, "toString");',
    expected: 'Point(4, 6)'
  },
  {
    name: 'ThreeDeePoint, sending messages to Numbers',
    code: '// class ThreeDeePoint extends Point with z;\n' +
          'OO.core.declareClass("ThreeDeePoint", "Point", ["z"]);\n\n' +
          '// def ThreeDeePoint.initialize(x, y, z) {\n' +
          '//   super.initialize(x, y);\n' +
          '//   this.z = z;\n' +
          '// }\n' +
          'OO.core.declareMethod("ThreeDeePoint", "initialize", function(_this, x, y, z) {\n' +
          '  OO.core.superSend("Point", _this, "initialize", x, y);\n' +
          '  OO.core.setInstVar(_this, "z", z);\n' +
          '});\n\n' +
          '// def ThreeDeePoint + that {\n' +
          '//   return new ThreeDeePoint(this.x + that.x, this.y + that.y, this.z + that.z);\n' +
          '// }\n' +
          'OO.core.declareMethod("ThreeDeePoint", "+", function(_this, that) {\n' +
          '  return OO.core.instantiate(\n' +
          '    "ThreeDeePoint",\n' +
          '    OO.core.send(OO.core.getInstVar(_this, "x"), "+", OO.core.getInstVar(that, "x")),\n' +
          '    OO.core.send(OO.core.getInstVar(_this, "y"), "+", OO.core.getInstVar(that, "y")),\n' +
          '    OO.core.send(OO.core.getInstVar(_this, "z"), "+", OO.core.getInstVar(that, "z"))\n' +
          '  );\n' +
          '});\n\n' +
          '// def ThreeDeePoint.toString() {\n' +
          '//   return "ThreeDeePoint(" + this.x + ", " + this.y + ", " + this.z + ")";\n' +
          '// }\n' +
          'OO.core.declareMethod("ThreeDeePoint", "toString", function(_this) {\n' +
          '  return "ThreeDeePoint(" +\n' +
          '         OO.core.getInstVar(_this, "x") + ", " +\n' +
          '         OO.core.getInstVar(_this, "y") + ", " +\n' +
          '         OO.core.getInstVar(_this, "z") + ")";\n' +
          '});\n\n' +
          '// var p = new ThreeDeePoint(1, 2, 3) + new Point(4, 5, 6);\n' +
          '// p.toString()\n' +
          'var p = OO.core.send(OO.core.instantiate("ThreeDeePoint", 1, 2, 3), "+", OO.core.instantiate("ThreeDeePoint", 4, 5, 6));\n' +
          'OO.core.send(p, "toString");',
    expected: 'ThreeDeePoint(5, 7, 9)'
  },
  {
    name: 'factorial',
    code: '// def Number.factorial {\n' +
          '//   if (this === 0) {\n' +
          '//     return 1;\n' +
          '//   } else {\n' +
          '//     return this * (this - 1).factorial();\n' +
          '//   }\n' +
          '// }\n' +
          'OO.core.declareMethod("Number", "factorial", function(_this) {\n' +
          '  if (OO.core.send(_this, "===", 0)) {\n' +
          '    return 1;\n' +
          '  } else {\n' +
          '    return OO.core.send(\n' +
          '      _this,\n' +
          '      "*",\n' +
          '      OO.core.send(\n' +
          '        OO.core.send(_this, "-", 1),\n' +
          '        "factorial"));\n' +
          '  }\n' +
          '});\n\n' +
          '// 5.factorial()\n' +
          'OO.core.send(5, "factorial");',
    expected: 120
  },
  {
    name: 'Number.<',
    code: 'OO.core.send(5, "<", 4)',
    expected: false
  },
  {
    name: 'Number.<=',
    code: 'OO.core.send(4, "<=", 4)',
    expected: true
  },
  {
    name: 'Number.>',
    code: 'OO.core.send(5, ">", 4)',
    expected: true
  },
  {
    name: 'Number.>=',
    code: 'OO.core.send(2, ">=", 4)',
    expected: false
  },
  {
    name: 'methods on null, true, and false',
    code: 'OO.core.declareMethod("Null", "m", function(_this) { return 100; });\n' +
          'OO.core.declareMethod("True", "m", function(_this) { return 10; });\n' +
          'OO.core.declareMethod("False", "m", function(_this) { return 1; });\n' +
          'OO.core.send(null, "m") + OO.core.send(true, "m") * 2 + OO.core.send(false, "m") * 3',
    expected: 123
  }
);

