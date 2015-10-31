(function() {

var util = OO.util = {};


// Add this method to a function object to make inheritance easy. This is a
// tweaked version of Backbone's `extend` method for prototype chain extension.
util.extendSelf = function() {
  var Parent = this;
  var Child = Backbone.Model.extend.apply(this, arguments);

  // Backbone's __super__ is wonky - Child has a reference to Parent's
  // prototype. We'll do our own.
  delete Child.__super__;

  // give Child (a constructor) a reference to Parent (a constructor)
  Child.__Super__ = Parent;

  // give instances of Child a reference to Parent's prototype, since instances
  // use Child's prototype properties and methods and fall through to Parent's
  Child.prototype.__super__ = Parent.prototype;

  return Child;
};


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
