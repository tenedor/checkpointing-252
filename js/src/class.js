(function() {

OO.initializeCT = function() {
  this.classTable = {};
  this.declareNativeClasses();
};

OO.declareNativeClasses = function() {
  this.declareObjectClass();
  this.declareJSPrimitiveClasses();
  this.declareBlockClass();
};

OO.declareObjectClass = function() {
  this.ObjectClass = {
    name: "Object",
    superClass: null,
    instVarNames: {},
    instMethods: {},
    classVarNames: {},
    classVars: {},
    classMethods: {},
    isJSPrimitiveWrapper: false
  };

  this.classTable["Object"] = this.ObjectClass;

  this.declareMethod("Object", "initialize", function(self) {});

  this.declareMethod("Object", "===", function(self, x) {
    return x === self;
  });

  this.declareMethod("Object", "!==", function(self, x) {
    return x !== self;
  });

  this.declareMethod("Object", "isNumber", function(self) {
    return false;
  });

  this.declareMethod("Object", "hasProperty", function(self, selector, defType) {
    this.assertTypes("Object::hasProperty", [
      {value: selector, varName: "selector", type: "string"},
      {value: defType, varName: "defType", type: "string"}
    ]);

    var Constructor = this.classTable[this.getClassName(self)];
    return this.sendToClass(Constructor, "hasProperty", selector, defType);
  });

  this.declareMethod("Object", "getClass", function(self) {
    return this.getClassName(self);
  });

  this.declareClassMethod("Object", "getSuperClass", function(Self) {
    return this.isObjectClass(Self) ? null : Self.superClass;
  });

  this.declareClassMethod("Object", "getDefiningClass", function(Self, selector,
      defType) {
    this.assertTypes("Object::getDefiningClass", [
      {value: selector, varName: "selector", type: "string"},
      {value: defType, varName: "defType", type: "string"}
    ]);

    return this.getDefiningClass(Self, selector, defType);
  });

  this.declareClassMethod("Object", "hasProperty", function(Self, selector,
      defType) {
    this.assertTypes("Object::hasProperty", [
      {value: selector, varName: "selector", type: "string"},
      {value: defType, varName: "defType", type: "string"}
    ]);

    return !!this.getDefiningClass(Self, selector, defType);
  });
};

OO.declareJSPrimitiveClasses = function() {
  // create js primitive abstract class
  this.declareJSPrimitiveClass();

  // create classes for each js primitive
  this.declareNumberClass();
  this.declareBooleanClasses();
  this.declareStringClass();
  this.declareNullClass();
};

OO.declareJSPrimitiveClass = function() {
  this.declareClass("JSPrimitive", "Object", [], [], true);

  this.declareMethod("JSPrimitive", "initialize", function(self) {
    throw new Error("cannot call initialize on a JS primitive class - use " +
        "direct primitives or the newPrimitiveInstance class method instead");
  });

  this.declareClassMethod("JSPrimitive", "newPrimitiveInstance", function(Self)
      {
    throw new Error("cannot call newPrimitiveInstance on abstract JS " +
        "primitive " + Self.name);
  });
};

OO.declareNumberClass = function() {
  this.declareClass("Number", "JSPrimitive");

  this.declareClassMethod("Number", "newPrimitiveInstance",
      function(Self, value) {
    (this.isString(value)) && (value = parseFloat(value));
    this.assertType(value, "number", "Number.newPrimitiveInstance", "value");
    return value;
  });

  this.declareMethod("Number", "isNumber", function(self) {
    return true;
  });

  this.declareMethod("Number", "+", function(self, number) {
    this.assertType(number, "number", "Number::+", "number");
    return self + number;
  });

  this.declareMethod("Number", "-", function(self, number) {
    this.assertType(number, "number", "Number::-", "number");
    return self - number;
  });

  this.declareMethod("Number", "*", function(self, number) {
    this.assertType(number, "number", "Number::*", "number");
    return self * number;
  });

  this.declareMethod("Number", "/", function(self, number) {
    this.assertType(number, "number", "Number::/", "number");
    return self / number;
  });

  this.declareMethod("Number", "%", function(self, number) {
    this.assertType(number, "number", "Number::%", "number");
    return self % number;
  });

  this.declareMethod("Number", "<", function(self, number) {
    this.assertType(number, "number", "Number::<", "number");
    return self < number;
  });

  this.declareMethod("Number", "<=", function(self, number) {
    this.assertType(number, "number", "Number::<=", "number");
    return self <= number;
  });

  this.declareMethod("Number", ">", function(self, number) {
    this.assertType(number, "number", "Number::>", "number");
    return self > number;
  });

  this.declareMethod("Number", ">=", function(self, number) {
    this.assertType(number, "number", "Number::>=", "number");
    return self >= number;
  });
};

OO.declareBooleanClasses = function() {
  // create boolean abstract class
  this.declareBooleanClass();

  // create classes for true and false
  this.declareTrueClass();
  this.declareFalseClass();
}

OO.declareBooleanClass = function() {
  this.declareClass("Boolean", "JSPrimitive");

  this.declareClassMethod("Boolean", "newPrimitiveInstance",
      function(Self, value) {
    if (arguments.length < 2) {
      throw new Error("function Boolean.newPrimitiveInstance may not be " +
          "called with zero arguments");
    };
    return !!value;
  });
};

OO.declareTrueClass = function() {
  this.declareClass("True", "Boolean");

  this.declareClassMethod("True", "newPrimitiveInstance", function(Self) {
    return true;
  });
};

OO.declareFalseClass = function() {
  this.declareClass("False", "Boolean");

  this.declareClassMethod("False", "newPrimitiveInstance", function(Self) {
    return false;
  });
};

OO.declareStringClass = function() {
  this.declareClass("String", "JSPrimitive");

  this.declareClassMethod("String", "newPrimitiveInstance",
      function(Self, value) {
    if (arguments.length < 2) {
      throw new Error("function String.newPrimitiveInstance may not be called" +
          " with zero arguments");
    };
    return this.toString(value);
  });
};

OO.declareNullClass = function() {
  this.declareClass("Null", "JSPrimitive");

  this.declareClassMethod("Null", "newPrimitiveInstance", function(Self, value) {
    return null;
  });
};

OO.declareBlockClass = function() {
  this.declareClass("Block", "Object", ["block"]);

  this.declareMethod("Block", "initialize", function(self, block) {
    this.assertType(block, "function", "Block::initialize", "block");
    this.setInstVar(self, "block", block);
  });

  this.declareMethod("Block", "call", function(self /* , arg1, arg2, ... */) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.getInstVar(self, "block").apply(this, args);
  });
};

OO.declareClass = function(name, superClassName, instVarNames, classVarNames,
    isJSPrimitiveWrapper) {
  // default arg values
  (instVarNames === undefined) && (instVarNames = []);
  (classVarNames === undefined) && (classVarNames = []);
  (isJSPrimitiveWrapper === undefined) && (isJSPrimitiveWrapper = "inherit");

  // lots of type enforcement
  if (isJSPrimitiveWrapper !== "inherit") {
    isJSPrimitiveWrapper = !!isJSPrimitiveWrapper;
  };
  this.assertTypes("declareClass", [
    {value: name, varName: "name", type: "string"},
    {value: superClassName, varName: "superClassName", type: "string"},
    {value: instVarNames, varName: "instVarNames", type: "array"},
    {value: classVarNames, varName: "classVarNames", type: "array"}
  ]);

  if (this.isNameOfExistingClass(name)) {
    throw new Error("duplicate class declaration: \"" + name + "\"");
  }

  // catch variable name clashes
  var varName;
  var SuperClass = this.classTable[superClassName];
  for (var i = 0; i < instVarNames.length; i++) {
    varName = instVarNames[i];

    // catch instance variable name clashes with self
    for (var j = i + 1; j < instVarNames.length; j++) {
      if (instVarNames[j] === varName) {
        throw new Error("declaration of " + name + " contains duplicate " +
            "instance variable name " + varName);
      };
    };

    // catch instance variable name clashes with ancestors
    if (this.sendToClass(SuperClass, "hasProperty", varName, "instVarNames")) {
      throw new Error("declaration of " + name + " contains instance variable" +
          " name " + varName + " already declared by ancestor class");
    };
  };

  // catch class variable name clashes with self
  for (var i = 0; i < classVarNames.length; i++) {
    varName = classVarNames[i];
    for (var j = i + 1; j < classVarNames.length; j++) {
      if (classVarNames[j] === varName) {
        throw new Error("declaration of " + name + " contains duplicate " +
            "class variable name " + varName);
      };
    };
  };

  var instVarNamesObject = {};
  for (var i = 0; i < instVarNames.length; i++) {
    instVarNamesObject[instVarNames[i]] = true;
  };
  var classVarNamesObject = {};
  for (var i = 0; i < classVarNames.length; i++) {
    classVarNamesObject[classVarNames[i]] = true;
  };

  if (isJSPrimitiveWrapper === "inherit") {
    isJSPrimitiveWrapper = SuperClass.isJSPrimitiveWrapper;
  };

  this.classTable[name] = {
    name: name,
    superClass: SuperClass,
    instVarNames: instVarNamesObject,
    instMethods: {},
    classVarNames: classVarNamesObject,
    classVars: {},
    classMethods: {},
    isJSPrimitiveWrapper: isJSPrimitiveWrapper
  };
}

OO.declareMethod = function(className, selector, implFn) {
  this.assertTypes("declareMethod", [
    {value: className, varName: "className", type: "className"},
    {value: selector, varName: "selector", type: "string"},
    {value: implFn, varName: "implFn", type: "function"}
  ]);

  this.classTable[className].instMethods[selector] = implFn;
}

OO.declareClassMethod = function(className, selector, implFn) {
  this.assertTypes("declareClassMethod", [
    {value: className, varName: "className", type: "className"},
    {value: selector, varName: "selector", type: "string"},
    {value: implFn, varName: "implFn", type: "function"}
  ]);

  this.classTable[className].classMethods[selector] = implFn;
}

OO.instantiate = function(className /* , arg1, arg2, ... */) {
  this.assertType(className, "className", "instantiate", "className");

  // if the class just wraps a JS primitive, handle specially
  var Constructor = this.classTable[className];
  if (this.isJSPrimitiveWrapperClass(Constructor)) {
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift("newPrimitiveInstance");
    args.unshift(Constructor);
    return this.sendToClass.apply(this, args);
  };

  var instance = {
    __className__: className,
    __instanceVars__: {}
  };

  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift("initialize");
  args.unshift(instance);
  this.send.apply(this, args);
  return instance;
}

OO.getDefiningClass = function(DerivedClass, selector, defType) {
  this.assertTypes("getDefiningClass", [
    {value: DerivedClass, varName: "DerivedClass", type: "class"},
    {value: selector, varName: "selector", type: "string"},
    {value: defType, varName: "defType", type: "string"}
  ]);

  var DefiningClass = DerivedClass;
  while (!DefiningClass[defType].hasOwnProperty(selector)) {
    if (this.isObjectClass(DefiningClass)) {
      return null;
    } else {
      DefiningClass = DefiningClass.superClass;
    };
  };
  return DefiningClass;
}

OO._send = function(className, recv, selector /* , arg1, arg2, ... */) {
  this.assertTypes("_send", [
    {value: className, varName: "className", type: "className"},
    {value: recv, varName: "recv", type: "instanceOrClass"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  var defType = this.isInstance(recv) ? "instMethods" : "classMethods";

  var GivenClass = this.classTable[className];
  var DefiningClass = this.getDefiningClass(GivenClass, selector, defType);
  if (!DefiningClass) {
    throw new Error("class " + className + " does not understand the message " +
        selector);
  };

  var args = Array.prototype.slice.call(arguments, 3);
  args.unshift(recv);
  return DefiningClass[defType][selector].apply(this, args);
}

OO.send = function(recv, selector /* , arg1, arg2, ... */) {
  this.assertTypes("send", [
    {value: recv, varName: "recv", type: "instance"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.getClassName(recv));
  return this._send.apply(this, args);
}

OO.sendToClass = function(RecvClass, selector /* , arg1, arg2, ... */) {
  var unprivilegedAccess = false;
  if (this.isString(RecvClass)) {
    RecvClass = this.classTable[RecvClass];
    unprivilegedAccess = true;
  };
  this.assertTypes("sendToClass", [
    {value: RecvClass, varName: "RecvClass", type: "class"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  var args = Array.prototype.slice.call(arguments);
  args.unshift(RecvClass.name);

  // prevent external direct access to classes
  var retVal = this._send.apply(this, args);
  return (this.isClass(retVal) && unprivilegedAccess) ? retVal.name : retVal;
}

OO.superSend = function(superClassName, recv, selector /* , arg1, arg2, ... */)
    {
  this.assertTypes("superSend", [
    {value: superClassName, varName: "superClassName", type: "className"},
    {value: recv, varName: "recv", type: "instance"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  return this._send.apply(this, arguments);
}

OO.getInstVar = function(recv, instVarName) {
  this.assertTypes("getInstVar", [
    {value: recv, varName: "recv", type: "instance"},
    {value: instVarName, varName: "instVarName", type: "string"}
  ]);

  if (!this.send(recv, "hasProperty", instVarName, "instVarNames")) {
    throw new Error("undeclared instance variable " + instVarName + " for " +
        "class " + this.getClassName(recv));
  };

  return recv.__instanceVars__[instVarName];
}

OO.setInstVar = function(recv, instVarName, value) {
  this.assertTypes("setInstVar", [
    {value: recv, varName: "recv", type: "instance"},
    {value: instVarName, varName: "instVarName", type: "string"}
  ]);

  if (!this.send(recv, "hasProperty", instVarName, "instVarNames")) {
    throw new Error("undeclared instance variable " + instVarName + " for " +
        "class " + this.getClassName(recv));
  };

  recv.__instanceVars__[instVarName] = value;
  return value;
}

OO.getClassVar = function(Recv, classVarName) {
  this.assertTypes("getClassVar", [
    {value: Recv, varName: "Recv", type: "class"},
    {value: classVarName, varName: "classVarName", type: "string"}
  ]);

  if (!this.sendToClass(Recv, "hasProperty", classVarName, "classVarNames")) {
    throw new Error("undeclared class variable " + classVarName + " for class" +
        " " + Recv.name);
  };

  return Recv.classVars[classVarName];
}

OO.setClassVar = function(Recv, classVarName, value) {
  this.assertTypes("setClassVar", [
    {value: Recv, varName: "Recv", type: "class"},
    {value: classVarName, varName: "classVarName", type: "string"}
  ]);

  if (!this.sendToClass(Recv, "hasProperty", classVarName, "classVarNames")) {
    throw new Error("undeclared class variable " + classVarName + " for class" +
        " " + Recv.name);
  };

  Recv.classVars[classVarName] = value;
  return value;
}

})();
