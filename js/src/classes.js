(function() {

var util = OO.util;
var core = OO.core;

var classes = OO.classes = {};

classes.setupNativeClasses = function() {
  this.setupObjectClass();
  this.declareJSPrimitiveClasses();
  this.declareBlockClass();
};

classes.setupObjectClass = function() {
  core.declareMethod("Object", "initialize", function(self) {});

  core.declareMethod("Object", "===", function(self, x) {
    return x === self;
  });

  core.declareMethod("Object", "!==", function(self, x) {
    return x !== self;
  });

  core.declareMethod("Object", "isNumber", function(self) {
    return false;
  });

  core.declareMethod("Object", "hasProperty", function(self, selector, defType) {
    util.assertTypes("Object::hasProperty", [
      {value: selector, varName: "selector", type: "string"},
      {value: defType, varName: "defType", type: "string"}
    ]);

    var Constructor = core.getClass(self);
    return core.sendToClass(Constructor, "hasProperty", selector, defType);
  });

  core.declareMethod("Object", "getClass", function(self) {
    return core.getClassName(self);
  });

  core.declareClassMethod("Object", "getSuperClass", function(Self) {
    return util.isObjectClass(Self) ? null : Self.superClass;
  });

  core.declareClassMethod("Object", "getDefiningClass", function(Self, selector,
      defType) {
    util.assertTypes("Object::getDefiningClass", [
      {value: selector, varName: "selector", type: "string"},
      {value: defType, varName: "defType", type: "string"}
    ]);

    return core.getDefiningClass(Self, selector, defType);
  });

  core.declareClassMethod("Object", "hasProperty", function(Self, selector,
      defType) {
    util.assertTypes("Object::hasProperty", [
      {value: selector, varName: "selector", type: "string"},
      {value: defType, varName: "defType", type: "string"}
    ]);

    return !!core.getDefiningClass(Self, selector, defType);
  });
};

classes.declareJSPrimitiveClasses = function() {
  // create js primitive abstract class
  this.declareJSPrimitiveClass();

  // create classes for each js primitive
  this.declareNumberClass();
  this.declareBooleanClasses();
  this.declareStringClass();
  this.declareNullClass();
};

classes.declareJSPrimitiveClass = function() {
  core.declareClass("JSPrimitive", "Object", [], [], true);

  core.declareMethod("JSPrimitive", "initialize", function(self) {
    throw new Error("cannot call initialize on a JS primitive class - use " +
        "direct primitives or the newPrimitiveInstance class method instead");
  });

  core.declareClassMethod("JSPrimitive", "newPrimitiveInstance", function(Self)
      {
    throw new Error("cannot call newPrimitiveInstance on abstract JS " +
        "primitive " + Self.name);
  });
};

classes.declareNumberClass = function() {
  core.declareClass("Number", "JSPrimitive");

  core.declareClassMethod("Number", "newPrimitiveInstance",
      function(Self, value) {
    (util.isString(value)) && (value = parseFloat(value));
    util.assertType(value, "number", "Number.newPrimitiveInstance", "value");
    return value;
  });

  core.declareMethod("Number", "isNumber", function(self) {
    return true;
  });

  core.declareMethod("Number", "+", function(self, number) {
    util.assertType(number, "number", "Number::+", "number");
    return self + number;
  });

  core.declareMethod("Number", "-", function(self, number) {
    util.assertType(number, "number", "Number::-", "number");
    return self - number;
  });

  core.declareMethod("Number", "*", function(self, number) {
    util.assertType(number, "number", "Number::*", "number");
    return self * number;
  });

  core.declareMethod("Number", "/", function(self, number) {
    util.assertType(number, "number", "Number::/", "number");
    return self / number;
  });

  core.declareMethod("Number", "%", function(self, number) {
    util.assertType(number, "number", "Number::%", "number");
    return self % number;
  });

  core.declareMethod("Number", "<", function(self, number) {
    util.assertType(number, "number", "Number::<", "number");
    return self < number;
  });

  core.declareMethod("Number", "<=", function(self, number) {
    util.assertType(number, "number", "Number::<=", "number");
    return self <= number;
  });

  core.declareMethod("Number", ">", function(self, number) {
    util.assertType(number, "number", "Number::>", "number");
    return self > number;
  });

  core.declareMethod("Number", ">=", function(self, number) {
    util.assertType(number, "number", "Number::>=", "number");
    return self >= number;
  });
};

classes.declareBooleanClasses = function() {
  // create boolean abstract class
  this.declareBooleanClass();

  // create classes for true and false
  this.declareTrueClass();
  this.declareFalseClass();
}

classes.declareBooleanClass = function() {
  core.declareClass("Boolean", "JSPrimitive");

  core.declareClassMethod("Boolean", "newPrimitiveInstance",
      function(Self, value) {
    if (arguments.length < 2) {
      throw new Error("function Boolean.newPrimitiveInstance may not be " +
          "called with zero arguments");
    };
    return !!value;
  });
};

classes.declareTrueClass = function() {
  core.declareClass("True", "Boolean");

  core.declareClassMethod("True", "newPrimitiveInstance", function(Self) {
    return true;
  });
};

classes.declareFalseClass = function() {
  core.declareClass("False", "Boolean");

  core.declareClassMethod("False", "newPrimitiveInstance", function(Self) {
    return false;
  });
};

classes.declareStringClass = function() {
  core.declareClass("String", "JSPrimitive");

  core.declareClassMethod("String", "newPrimitiveInstance",
      function(Self, value) {
    if (arguments.length < 2) {
      throw new Error("function String.newPrimitiveInstance may not be called" +
          " with zero arguments");
    };
    return util.toString(value);
  });
};

classes.declareNullClass = function() {
  core.declareClass("Null", "JSPrimitive");

  core.declareClassMethod("Null", "newPrimitiveInstance", function(Self, value) {
    return null;
  });
};

classes.declareBlockClass = function() {
  core.declareClass("Block", "Object", ["block"]);

  core.declareMethod("Block", "initialize", function(self, block) {
    util.assertType(block, "function", "Block::initialize", "block");
    core.setInstVar(self, "block", block);
  });

  core.declareMethod("Block", "call", function(self /* , arg1, arg2, ... */) {
    var args = Array.prototype.slice.call(arguments, 1);
    return core.getInstVar(self, "block").apply(core, args);
  });
};

})();
