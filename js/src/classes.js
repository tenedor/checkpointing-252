(function() {

var util = OO.util;
var state = OO.state;

var classes = OO.classes = {};


// lifts a function f on JS literals to a function on OO literals
var jetForFunction = classes.jetForFunction = function(returnType, f) {
  return function(receiver, jetArgs, heap) {
    var funArgs = [heap.valueAtAddress(receiver).literal];
    var result, instance;

    // extract literal args and apply computation
    funArgs = funArgs.concat(_.map(jetArgs, function(arg) {
      return heap.valueAtAddress(arg).literal;
    }));
    result = f.apply(this, funArgs);

    // construct OO object from result
    instance = new state.LiteralInstance(returnType, result);
    return heap.storeValue(instance);
  };
}


var declareBuiltIns = classes.declareBuiltIns = function(classTable) {
  this.declareObjectMethods(classTable);
  this.declareNumberClass(classTable);
  this.declareStringClass(classTable);
  this.declareBooleanClass(classTable);
  this.declareNullClass(classTable);
};


var declareObjectMethods = classes.declareObjectMethods = function(classTable) {
  classTable.declareJet("Object", "==", function(a, b) {
    var result = false;
    var aval = heap.valueAtAddress(a);
    var bval = heap.valueAtAddress(b);
    var instance;

    if (aval instanceof LiteralInstance && bval instanceof LiteralInstance) {
      result = (aval.literal === b.literal);
    } else if (aval instanceof Instance && bval instanceof Instance) {
      result = (a === b);
    }

    instance = new state.LiteralInstance("Boolean", result);
    return heap.storeValue(instance);
  });

  classTable.declareJet("Object", "isTruthy", jetForFunction("Boolean",
      function(a) {
    return true;
  }));
};


var declareNumberClass = classes.declareNumberClass = function(classTable) {
  classTable.declareClass("Number", "Object", []);

  classTable.declareJet("Number", "+", jetForFunction("Number", function(a, b) {
    return a + b;
  }));

  classTable.declareJet("Number", "-", jetForFunction("Number", function(a, b) {
    return a - b;
  }));

  classTable.declareJet("Number", "*", jetForFunction("Number", function(a, b) {
    return a * b;
  }));

  classTable.declareJet("Number", "/", jetForFunction("Number", function(a, b) {
    return a / b;
  }));

  classTable.declareJet("Number", "isTruthy", jetForFunction("Boolean",
      function(a) {
    return a !== 0;
  }));

  classTable.declareJet("Number", "toString", jetForFunction("String",
      function(a) {
    return a.toString();
  }));
};


var declareStringClass = classes.declareStringClass = function(classTable) {
  classTable.declareClass("String", "Object", []);

  classTable.declareJet("String", "+", jetForFunction("String", function(a, b) {
    return a + b;
  }));

  classTable.declareJet("String", "substring", jetForFunction("String",
      function(string, startIdx, endIdx) {
    return string.substring(startIdx, endIdx);
  }));
};


var declareBooleanClass = classes.declareBooleanClass = function(classTable) {
  classTable.declareClass("Boolean", "Object", []);

  classTable.declareJet("Boolean", "isTruthy", jetForFunction("Boolean",
      function(a) {
    return !!a;
  }));

  classTable.declareJet("Boolean", "not", jetForFunction("Boolean",
      function(x) {
    return !x;
  }));

  classTable.declareJet("Boolean", "and", jetForFunction("Boolean",
      function(x, y) {
    return x && y;
  }));

  classTable.declareJet("Boolean", "or", jetForFunction("Boolean",
      function(x, y) {
    return x || y;
  }));
};


var declareNullClass = classes.declareNullClass = function(classTable) {
  classTable.declareClass("Null", "Object", []);
};

})();
