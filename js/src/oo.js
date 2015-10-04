var OO = {};

// -----------------------------------------------------------------------------
// Type Utils
// -----------------------------------------------------------------------------

// javascript types
OO.isNumber = function(x) {return typeof x === "number";};
OO.isBoolean = function(x) {return typeof x === "boolean";};
OO.isString = function(x) {return typeof x === "string";};
OO.isNull = function(x) {return x === null;};
OO.isUndefined = function(x) {return x === undefined;};
OO.isArray = function(x) {return Array.isArray(x);};
OO.isFunction = function(x) {return typeof x === "function";};
OO.isObject = function(x) {
  return typeof x === "object" && !this.isArray(x) && !this.isNull(x);
};

// OO types
OO.isStrictInstance = function(x) {
  return (this.isObject(x) && x.hasOwnProperty("__className__") &&
      this.isNameOfExistingClass(x.__className__));
};
OO.isJSPrimitive = function(x) {
  return (this.isNumber(x) || this.isBoolean(x) || this.isString(x) ||
      this.isNull(x));
};
OO.isInstance = function(x) {
  return (this.isStrictInstance(x) || this.isJSPrimitive(x));
};
OO.isClass = function(x) {
  return this.isObjectWithSuper(x) && this.isOrDerivesFrom(x, this.ObjectClass);
};
OO.isObjectClass = function(x) {
  return x === this.ObjectClass;
};
OO.isJSPrimitiveWrapperClass = function(x) {
  return this.isClass(x) && x.isJSPrimitiveWrapper;
};
OO.isNameOfExistingClass = function(className) {
  return this.classTable.hasOwnProperty(className);
};
OO.isObjectWithSuper = function(x) {
  return this.isObject(x) && x.hasOwnProperty('superClass');
};
OO.isDerivedFrom = function(Derived, Ancestor) {
  this.assertType(Derived, "objectWithSuper", "isDerivedFrom", "Derived");

  if (this.isObjectClass(Derived)) {
    return false;
  };
  var SuperClass = Derived.superClass;
  return (SuperClass === Ancestor || this.isDerivedFrom(SuperClass, Ancestor));
};
OO.isOrDerivesFrom = function(Derived, Ancestor) {
  return (Derived === Ancestor || this.isDerivedFrom(Derived, Ancestor));
};

// type checker
OO.assertType = function(value, type, funcName, varName) {
  switch(type) {
    case "number":
      if (this.isNumber(value)) {return;}
      break;
    case "boolean":
      if (this.isBoolean(value)) {return;}
      break;
    case "string":
      if (this.isString(value)) {return;}
      break;
    case "array":
      if (this.isArray(value)) {return;}
      break;
    case "function":
      if (this.isFunction(value)) {return;}
      break;
    case "object":
      if (this.isObject(value)) {return;}
      break;
    case "instance":
      if (this.isInstance(value)) {return;}
      break;
    case "class":
      if (this.isClass(value)) {return;}
      break;
    case "instanceOrClass":
      if (this.isInstance(value) || this.isClass(value)) {return;}
      break;
    case "className":
      if (this.isNameOfExistingClass(value)) {return;}
      break;
    case "objectWithSuper":
      if (this.isObjectWithSuper(value)) {return;}
      break;
    default:
      throw new Error("unknown type " + this.toString(type) + " in call to " +
          "assertType");
  };

  throw new Error("argument " + this.toString(varName) + " to function " +
      this.toString(funcName) + " must be of type " + this.toString(type));
};

OO.assertTypes = function(funcName, typeChecks) {
  this.assertType(typeChecks, "array", "assertTypes", "typeChecks");

  for (var i = 0; i < typeChecks.length; i++) {
    var tc = typeChecks[i];
    this.assertType(tc.value, tc.type, funcName, tc.varName);
  };
};

OO.getClassName = function(instance) {
  this.assertType(instance, "instance", "getClassName", "instance");

  if (this.isJSPrimitive(instance)) {
    if (this.isNumber(instance)) {
      return "Number";
    } else if (this.isBoolean(instance)) {
      return instance ? "True" : "False";
    } else if (this.isString(instance)) {
      return "String";
    } else if (this.isNull(instance)) {
      return "Null";
    } else {
      throw new Error("unknown JS primitive type passed to getClassName");
    };
  } else {
    return instance.__className__;
  };
};

// my own toString function...
//
// because not one of the three different kinds of toString functions built into
// javascript do (a) what I want, (b) anything internally consistent, (c) what
// the Mozilla documentation says they will, or (of course) (d) the same thing
// regardless of the browser you use.
OO.toString = function(value) {
  if (this.isNumber(value) || this.isBoolean(value) || this.isString(value) ||
      this.isNull(value) || this.isUndefined(value) || this.isFunction(value)) {
    return "" + value;
  } else if (this.isArray(value)) {
    return "[" + value + "]";
  } else if (this.isStrictInstance(value)) {
    return "{" + this.getClassName(value) + " instance}"
  } else if (this.isClass(value)) {
    return "{" + value.name + " class}"
  } else {
    return "{object}";
  };
  // it was that hard javascript. and that's four lines EXTRA from all you
  // needed to do.
};


// -----------------------------------------------------------------------------
// Classes
// -----------------------------------------------------------------------------

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


// -----------------------------------------------------------------------------
// Evaluator
// -----------------------------------------------------------------------------

O.evalAST = function(ast) {
  var context = {
    environment: new Environment(),
    nameOfHostClass: null
  };

  return recEval(context, ast);
};

function Environment(parent) {
  this.parent = parent;
  this.vars = {};
};

Environment.prototype.declare = function(name, value) {
  this.vars[name] = value;
};

Environment.prototype.set = function(name, value) {
  if (this.vars.hasOwnProperty(name)) {
    this.vars[name] = value;
  } else if (!this.parent instanceof Environment) {
    throw new Error("attempt to set undeclared variable " + name);
  } else {
    this.parent.set(name, value);
  };
};

Environment.prototype.get = function(name) {
  if (this.vars.hasOwnProperty(name)) {
    return this.vars[name];
  } else if (!this.parent instanceof Environment) {
    throw new Error("attempt to get undeclared variable " + name);
  } else {
    return this.parent.get(name);
  };
};

var curriedRecEval = function(context) {
  return function(ast) {return recEval(context, ast);};
};

var getUID = (function() {
  var id = 0;
  return function() {return id++;};
})();

var ReturnObject = function(scopeUID, value) {
  this.scopeUID = scopeUID;
  this.value = value;
};

var isReturnObject = function(x) {
  return x instanceof ReturnObject;
};

var recEval = function(context, ast) {
  if (!OO.isArray(ast)) {
    if (OO.isJSPrimitive(ast) || OO.isStrictInstance(ast) || OO.isClass(ast)) {
      return ast;
    } else {
      throw new Error("Illegal AST: " + OO.toString(ast));
    };
  };
  switch (ast[0]) {
    case "program":
      OO.initializeCT();
      var sequence = ast.slice(1);
      sequence.unshift("seq");
      var scopedAST = ["scope", sequence];
      return recEval(context, scopedAST);

    case "seq":
      var asts = ast.slice(1);
      var value;
      for (var i = 0; i < asts.length; i++) {
        value = recEval(context, asts[i]);
      };
      return value;

    case "classDecl":
      var className = recEval(context, ast[1]);
      var superClassName = recEval(context, ast[2]);
      var instVarNames = ast[3].map(curriedRecEval(context));
      return OO.declareClass(className, superClassName, instVarNames);

    case "methodDecl":
      var className = recEval(context, ast[1]);
      var methodName = recEval(context, ast[2]);
      var argNames = ast[3].map(curriedRecEval(context));
      argNames.unshift("self");
      var sequence = ast[4].slice(0);
      sequence.push(["return", ["null"]]);
      sequence.unshift("seq");
      var scopedAST = ["scope", sequence];

      context = {
        environment: context.environment,
        nameOfHostClass: className
      };

      var closure = function() {
        var args = Array.prototype.slice.call(arguments);
        return recEval(context, ["closure", argNames, args, scopedAST]);
      };

      return OO.declareMethod(className, methodName, closure);

    case "closure":
      var argNames = ast[1].map(curriedRecEval(context));
      var args = ast[2];
      var ast = ast[3];
      
      context = {
        environment: new Environment(context.environment),
        nameOfHostClass: context.nameOfHostClass
      };

      var varDecls = ["varDecls"];
      for (var i = 0; i < argNames.length; i++) {
        varDecls.push([argNames[i], args[i]]);
      };
      recEval(context, varDecls);

      return recEval(context, ast);

    case "scope":
      var blockedAST = ["block", [], ast[1]];
      var scopeUID = getUID();

      context = {
        environment: new Environment(context.environment),
        nameOfHostClass: context.nameOfHostClass
      };
      context.environment.declare("__scopeUID__", scopeUID);

      var scopeRetVal;
      var scopeError;
      try {
        scopeRetVal = OO.send(recEval(context, blockedAST), "call");
      } catch(e) {
        if (isReturnObject(e) && e.scopeUID === scopeUID) {
          scopeRetVal = e.value;
        } else {
          scopeError = {error: e};
        };
      } finally {
        if (scopeError) {
          throw scopeError.error;
        } else {
          return scopeRetVal;
        };
      };

    case "varDecls":
      for (var i = 1; i < ast.length; i++) {
        var varName = ast[i][0];
        var value = recEval(context, ast[i][1]);
        context.environment.declare(varName, value);
      };
      return;

    case "return":
      var expression = recEval(context, ast[1]);
      var scopeUID = context.environment.get("__scopeUID__");
      throw new ReturnObject(scopeUID, expression);

    case "setVar":
      var varName = ast[1];
      var value = recEval(context, ast[2]);
      return context.environment.set(varName, value);

    case "setInstVar":
      var instVarName = ast[1];
      var value = recEval(context, ast[2]);
      var self = context.environment.get("self");
      return OO.setInstVar(self, instVarName, value);

    case "exprStmt":
      return recEval(context, ast[1]);

    case "null":
      return null;

    case "true":
      return true;

    case "false":
      return false;

    case "number":
      return parseFloat(ast[1]);

    case "this":
      return recEval(context, ["getVar", "self"]);

    case "getVar":
      return context.environment.get(ast[1]);

    case "getInstVar":
      var self = context.environment.get("self");
      return OO.getInstVar(self, ast[1]);

    case "new":
      var className = recEval(context, ast[1]);
      var args = ast.slice(2).map(curriedRecEval(context));
      args.unshift(className);
      return OO.instantiate.apply(OO, args);

    case "send":
      var recv = recEval(context, ast[1]);
      var messageName = recEval(context, ast[2]);
      var args = ast.slice(3).map(curriedRecEval(context));
      args.unshift(recv, messageName);
      return OO.send.apply(OO, args);

    case "super":
      var superClassName = OO.sendToClass(context.nameOfHostClass,
          "getSuperClass");
      var self = context.environment.get("self");
      var messageName = recEval(context, ast[1]);
      var args = ast.slice(2).map(curriedRecEval(context));
      args.unshift(superClassName, self, messageName);
      return OO.superSend.apply(OO, args);

    case "block":
      var argNames = ast[1].map(curriedRecEval(context));
      var sequence = ast[2].slice(0);
      sequence.unshift("seq");

      var lastIndex = sequence.length - 1;
      if (sequence[lastIndex][0] === "exprStmt") {
        sequence[lastIndex] = ["return", sequence[lastIndex]];
      };

      var closure = function() {
        var args = Array.prototype.slice.call(arguments);
        return recEval(context, ["closure", argNames, args, sequence]);
      };

      return OO.instantiate("Block", closure);

    default:
      throw new Error("Illegal AST!");
  };
};
