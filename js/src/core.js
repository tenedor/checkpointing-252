(function() {

var util = OO.util;

var core = OO.core = {};

core.reset = function() {
  this.classTable = OO.classTable = {};

  this.ObjectClass = OO.ObjectClass = {
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
};

core.declareClass = function(name, superClassName, instVarNames, classVarNames,
    isJSPrimitiveWrapper) {
  // default arg values
  (instVarNames === undefined) && (instVarNames = []);
  (classVarNames === undefined) && (classVarNames = []);
  (isJSPrimitiveWrapper === undefined) && (isJSPrimitiveWrapper = "inherit");

  // lots of type enforcement
  if (isJSPrimitiveWrapper !== "inherit") {
    isJSPrimitiveWrapper = !!isJSPrimitiveWrapper;
  };
  util.assertTypes("declareClass", [
    {value: name, varName: "name", type: "string"},
    {value: superClassName, varName: "superClassName", type: "string"},
    {value: instVarNames, varName: "instVarNames", type: "array"},
    {value: classVarNames, varName: "classVarNames", type: "array"}
  ]);

  if (util.isNameOfExistingClass(name)) {
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

core.declareMethod = function(className, selector, implFn) {
  util.assertTypes("declareMethod", [
    {value: className, varName: "className", type: "className"},
    {value: selector, varName: "selector", type: "string"},
    {value: implFn, varName: "implFn", type: "function"}
  ]);

  this.classTable[className].instMethods[selector] = implFn;
}

core.declareClassMethod = function(className, selector, implFn) {
  util.assertTypes("declareClassMethod", [
    {value: className, varName: "className", type: "className"},
    {value: selector, varName: "selector", type: "string"},
    {value: implFn, varName: "implFn", type: "function"}
  ]);

  this.classTable[className].classMethods[selector] = implFn;
}

core.instantiate = function(className /* , arg1, arg2, ... */) {
  util.assertType(className, "className", "instantiate", "className");

  // if the class just wraps a JS primitive, handle specially
  var Constructor = this.classTable[className];
  if (util.isJSPrimitiveWrapperClass(Constructor)) {
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

core.getClassName = function(instance) {
  util.assertType(instance, "instance", "getClassName", "instance");

  if (util.isJSPrimitive(instance)) {
    if (util.isNumber(instance)) {
      return "Number";
    } else if (util.isBoolean(instance)) {
      return instance ? "True" : "False";
    } else if (util.isString(instance)) {
      return "String";
    } else if (util.isNull(instance)) {
      return "Null";
    } else {
      throw new Error("unknown JS primitive type passed to getClassName");
    };
  } else {
    return instance.__className__;
  };
};

core.getClass = function(instanceOrClassName) {
  if (!(util.isInstance(instanceOrClassName) ||
      util.isNameOfExistingClass(instanceOrClassName))) {
    util.assertTypeError("instance or className", "getClassName",
        "instanceOrClassName");
  };

  var className = instanceOrClassName;
  if (util.isInstance(className)) {
    className = this.getClassName(instanceOrClassName);
  }
  return this.classTable[className];
};

core.getDefiningClass = function(DerivedClass, selector, defType) {
  util.assertTypes("getDefiningClass", [
    {value: DerivedClass, varName: "DerivedClass", type: "class"},
    {value: selector, varName: "selector", type: "string"},
    {value: defType, varName: "defType", type: "string"}
  ]);

  var DefiningClass = DerivedClass;
  while (!DefiningClass[defType].hasOwnProperty(selector)) {
    if (util.isObjectClass(DefiningClass)) {
      return null;
    } else {
      DefiningClass = DefiningClass.superClass;
    };
  };
  return DefiningClass;
}

core._send = function(className, recv, selector /* , arg1, arg2, ... */) {
  util.assertTypes("_send", [
    {value: className, varName: "className", type: "className"},
    {value: recv, varName: "recv", type: "instanceOrClass"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  var defType = util.isInstance(recv) ? "instMethods" : "classMethods";

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

core.send = function(recv, selector /* , arg1, arg2, ... */) {
  util.assertTypes("send", [
    {value: recv, varName: "recv", type: "instance"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.getClassName(recv));
  return this._send.apply(this, args);
}

core.sendToClass = function(RecvClass, selector /* , arg1, arg2, ... */) {
  var unprivilegedAccess = false;
  if (util.isString(RecvClass)) {
    RecvClass = this.classTable[RecvClass];
    unprivilegedAccess = true;
  };
  util.assertTypes("sendToClass", [
    {value: RecvClass, varName: "RecvClass", type: "class"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  var args = Array.prototype.slice.call(arguments);
  args.unshift(RecvClass.name);

  // prevent external direct access to classes
  var retVal = this._send.apply(this, args);
  return (util.isClass(retVal) && unprivilegedAccess) ? retVal.name : retVal;
}

core.superSend = function(superClassName, recv, selector /* , arg1, arg2, ... */)
    {
  util.assertTypes("superSend", [
    {value: superClassName, varName: "superClassName", type: "className"},
    {value: recv, varName: "recv", type: "instance"},
    {value: selector, varName: "selector", type: "string"}
  ]);

  return this._send.apply(this, arguments);
}

core.getInstVar = function(recv, instVarName) {
  util.assertTypes("getInstVar", [
    {value: recv, varName: "recv", type: "instance"},
    {value: instVarName, varName: "instVarName", type: "string"}
  ]);

  if (!this.send(recv, "hasProperty", instVarName, "instVarNames")) {
    throw new Error("undeclared instance variable " + instVarName + " for " +
        "class " + this.getClassName(recv));
  };

  return recv.__instanceVars__[instVarName];
}

core.setInstVar = function(recv, instVarName, value) {
  util.assertTypes("setInstVar", [
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

core.getClassVar = function(Recv, classVarName) {
  util.assertTypes("getClassVar", [
    {value: Recv, varName: "Recv", type: "class"},
    {value: classVarName, varName: "classVarName", type: "string"}
  ]);

  if (!this.sendToClass(Recv, "hasProperty", classVarName, "classVarNames")) {
    throw new Error("undeclared class variable " + classVarName + " for class" +
        " " + Recv.name);
  };

  return Recv.classVars[classVarName];
}

core.setClassVar = function(Recv, classVarName, value) {
  util.assertTypes("setClassVar", [
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
