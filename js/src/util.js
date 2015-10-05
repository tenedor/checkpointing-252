(function() {

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

// our own toString function...
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

})();
