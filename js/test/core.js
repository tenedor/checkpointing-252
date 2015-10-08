// initialize the language
OO.reset();

tests(JS,
  {
    name: 'method declaration and send',
    code: '// def Object.add(x, y) { return x + y; }\n' +
          'OO.core.declareMethod("Object", "add", function(_this, x, y) { return x + y; });\n\n' +
          '// new Object().add(3, 4)\n' +
          'OO.core.send(OO.core.instantiate("Object"), "add", 3, 4);',
    expected: 7
  },
  {
    name: 'Point',
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
          '    OO.core.getInstVar(_this, "x") + OO.core.getInstVar(that, "x"),\n' +
          '    OO.core.getInstVar(_this, "y") + OO.core.getInstVar(that, "y")\n' +
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
    name: 'ThreeDeePoint',
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
          '    OO.core.getInstVar(_this, "x") + OO.core.getInstVar(that, "x"),\n' +
          '    OO.core.getInstVar(_this, "y") + OO.core.getInstVar(that, "y"),\n' +
          '    OO.core.getInstVar(_this, "z") + OO.core.getInstVar(that, "z")\n' +
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
    name: 'OK to have a method and an instance variable with the same name',
    code: '// class C with value;\n' +
          'OO.core.declareClass("C", "Object", ["value"]);\n\n' +
          '// def C.initialize(value) { this.value = value; }\n' +
          'OO.core.declareMethod("C", "initialize", function(_this, value) {\n' +
          '  OO.core.setInstVar(_this, "value", value);\n' +
          '});\n\n' +
          '// def C.value() { return this.value * this.value; }\n' +
          'OO.core.declareMethod("C", "value", function(_this) {\n' +
          '  return OO.core.getInstVar(_this, "value") * OO.core.getInstVar(_this, "value");\n' +
          '});\n\n' +
          '// new C(5).value()\n' +
          'OO.core.send(OO.core.instantiate("C", 5), "value");',
    expected: 25
  }
);

