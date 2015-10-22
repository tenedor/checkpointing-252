(function() {

var util = OO.util = {};


// Type checkers
util.isNumber = function(x) {return typeof x === "number";};
util.isBoolean = function(x) {return typeof x === "boolean";};
util.isString = function(x) {return typeof x === "string";};
util.isNull = function(x) {return x === null;};
util.isUndefined = function(x) {return x === undefined;};
util.isArray = function(x) {return Array.isArray(x);};
util.isFunction = function(x) {return typeof x === "function";};
util.isObject = function(x) {
  return typeof x === "object" && !this.isArray(x) && !this.isNull(x);
};


// Assertion helper
util.assert = function(expression, errorMessage) {
  if (!expression) {
    throw new Error(errorMessage);
  };
};


// Our custom toString function...
//
// because not one of the three different kinds of toString functions built into
// javascript do (a) what I want, (b) anything internally consistent, (c) what
// the Mozilla documentation says they will, or (of course) (d) the same thing
// regardless of the browser you use.
util.toString = function(value) {
  if (this.isNumber(value) || this.isBoolean(value) || this.isString(value) ||
      this.isNull(value) || this.isUndefined(value) || this.isFunction(value)) {
    return "" + value;
  } else if (this.isArray(value)) {
    return "[" + value + "]";
  } else {
    return "{object}";
  };
  // it was that hard javascript.
};

})();
