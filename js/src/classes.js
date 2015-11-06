(function() {

var util = OO.util;
var state = OO.state;

var classes = OO.classes = {};


// lifts a function f on JS literals to a function on OO literals
var jetForLiteralsFn = classes.jetForLiteralsFn = function(f) {
  return function(receiver, jetArgs, heap) {
    var funArgs = [heap.valueAtAddress(receiver).literal];
    var result, className, instance;

    // extract literal args and apply computation
    funArgs = funArgs.concat(_.map(jetArgs, function(arg) {
      return heap.valueAtAddress(arg).literal;
    }));
    result = f.apply(this, funArgs);

    // construct OO object from result
    instance = new state.LiteralInstance(result);
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
  var equalityJetGenerator = function(equality) {
    return function(receiver, jetArgs, heap) {
      var aval = heap.valueAtAddress(receiver);
      var bval = heap.valueAtAddress(jetArgs[0]);
      var isEqual, instance;

      if (aval instanceof state.LiteralInstance &&
          bval instanceof state.LiteralInstance) {
        isEqual = (aval.literal === bval.literal);
      } else {
        isEqual = (a === b);
      }

      instance = new state.LiteralInstance(equality ? isEqual : !isEqual);
      return heap.storeValue(instance);
    };
  };

  classTable.declareJet("Object", "==", equalityJetGenerator(true));
  classTable.declareJet("Object", "!=", equalityJetGenerator(false));

  classTable.declareJet("Object", "isTruthy", jetForLiteralsFn(function(a) {
    return true;
  }));
};


var declareNumberClass = classes.declareNumberClass = function(classTable) {
  classTable.declareClass("Number", "Object", []);

  classTable.declareJet("Number", "+", jetForLiteralsFn(function(a, b) {
    return a + b;
  }));

  classTable.declareJet("Number", "-", jetForLiteralsFn(function(a, b) {
    return a - b;
  }));

  classTable.declareJet("Number", "*", jetForLiteralsFn(function(a, b) {
    return a * b;
  }));

  classTable.declareJet("Number", "/", jetForLiteralsFn(function(a, b) {
    return a / b;
  }));

  classTable.declareJet("Number", "%", jetForLiteralsFn(function(a, b) {
    return a % b;
  }));

  classTable.declareJet("Number", ">", jetForLiteralsFn(function(a, b) {
    return a > b;
  }));

  classTable.declareJet("Number", ">=", jetForLiteralsFn(function(a, b) {
    return a >= b;
  }));

  classTable.declareJet("Number", "<", jetForLiteralsFn(function(a, b) {
    return a < b;
  }));

  classTable.declareJet("Number", "<=", jetForLiteralsFn(function(a, b) {
    return a <= b;
  }));

  classTable.declareJet("Number", "isTruthy", jetForLiteralsFn(function(a) {
    return a !== 0;
  }));

  classTable.declareJet("Number", "toString", jetForLiteralsFn(function(a) {
    return util.toString(a);
  }));
};


var declareStringClass = classes.declareStringClass = function(classTable) {
  classTable.declareClass("String", "Object", []);

  classTable.declareJet("String", "+", jetForLiteralsFn(function(a, b) {
    return a + b;
  }));

  classTable.declareJet("String", "substring",
      jetForLiteralsFn(function(string, startIdx, endIdx) {
    return string.substring(startIdx, endIdx);
  }));
};


var declareBooleanClass = classes.declareBooleanClass = function(classTable) {
  classTable.declareClass("Boolean", "Object", []);

  classTable.declareJet("Boolean", "isTruthy", jetForLiteralsFn(function(a) {
    return !!a;
  }));

  classTable.declareJet("Boolean", "not", jetForLiteralsFn(function(x) {
    return !x;
  }));

  classTable.declareJet("Boolean", "and", jetForLiteralsFn(function(x, y) {
    return x && y;
  }));

  classTable.declareJet("Boolean", "or", jetForLiteralsFn(function(x, y) {
    return x || y;
  }));
};


var declareNullClass = classes.declareNullClass = function(classTable) {
  classTable.declareClass("Null", "Object", []);
};

})();
