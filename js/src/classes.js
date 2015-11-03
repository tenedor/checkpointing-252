(function() {

var util = OO.util;
var state = OO.state;

var classes = OO.classes = {};


// lifts a function f on JS literals to a function on OO literals
var jetForFunction = classes.jetForFunction = function(f) {
  return function(receiver, jetArgs, heap) {
    var funArgs = [heap.valueAtAddress(receiver).literal];
    var result, ooResult;

    // extract literal args and apply computation
    funArgs.concat(_.map(jetArgs, function(arg) {
      return heap.valueAtAddress(arg).literal;
    }));
    result = f.apply(this, funArgs);

    // construct OO object from result
    ooResult = new state.LiteralInstance(type, result);
    heap.setAddressToValue(heap.nextAddress(), ooResult);
  };
}


var declareBuiltIns = classes.declareBuiltIns = function(classTable) {
  classTable.declareJet("Object", "==", function(a, b) {
    var result = false, ooResult;
    var aval = heap.valueAtAddress(a);
    var bval = heap.valueAtAddress(b);

    if (aval instanceof LiteralInstance && bval instanceof LiteralInstance) {
      result = (aval.literal === b.literal);
    } else if (aval instanceof Instance && bval instanceof Instance) {
      result = (a == b);
    }

    ooResult = new state.LiteralInstance("LiteralBoolean", result);
    heap.setAddressToValue(heap.nextAddress(), ooResult);
  });

  classTable.declareClass("LiteralNumber", "Object", []);
  classTable.declareJet("LiteralNumber", "+", jetForFunction(function(a, b) {
    return a + b;
  }));
  classTable.declareJet("LiteralNumber", "-", jetForFunction(function(a, b) {
    return a - b;
  }));
  classTable.declareJet("LiteralNumber", "*", jetForFunction(function(a, b) {
    return a * b;
  }));
  classTable.declareJet("LiteralNumber", "/", jetForFunction(function(a, b) {
    return a / b;
  }));
  classTable.declareJet("LiteralNumber", "toString", jetForFunction(function(a) {
    return a.toString();
  }));

  classTable.declareClass("LiteralString", "Object", []);
  classTable.declareJet("LiteralString", "+", jetForFunction(function(a, b) {
    return a + b;
  }));
  classTable.declareJet("LiteralString", "substring", jetForFunction(function(string, startIdx, endIdx) {
    return string.substring(startIdx, endIdx);
  }));

  classTable.declareClass("LiteralBoolean", "Object", []);
  classTable.declareJet("LiteralBoolean", "not", jetForFunction(function(x) {
    return !x;
  }));
  classTable.declareJet("LiteralBoolean", "and", jetForFunction(function(x, y) {
    return x && y;
  }));
  classTable.declareJet("LiteralBoolean", "or", jetForFunction(function(x, y) {
    return x || y;
  }));

  classTable.declareClass("LiteralNull", "Object", []);
};

})();
