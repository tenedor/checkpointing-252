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
  // add built-in methods to Object
  this.declareObjectMethods(classTable);

  // declare abstract literal class
  this.declareLiteralClass(classTable);

  // declare literal classes
  this.declareNumberClass(classTable);
  this.declareStringClass(classTable);
  this.declareBooleanClass(classTable);
  this.declareNullClass(classTable);
};


var declareObjectMethods = classes.declareObjectMethods = function(classTable) {
  var equalityJetGenerator;

  classTable.declareJet("Object", "initialize", function(){});

  equalityJetGenerator = function(equality) {
    return function(receiver, jetArgs, heap) {
      var addr0 = receiver;
      var addr1 = jetArgs[0];
      var val0 = heap.valueAtAddress(addr0);
      var val1 = heap.valueAtAddress(addr1);
      var isEqual, instance;

      if (val0 instanceof state.LiteralInstance &&
          val1 instanceof state.LiteralInstance) {
        isEqual = (val0.literal === val1.literal);
      } else {
        isEqual = (addr0 === addr1);
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


var declareLiteralClass = classes.declareLiteralClass = function(classTable) {
  classTable.declareClass("Literal", "Object", []);

  classTable.declareJet("Literal", "initialize", function(){
    util.assert(false,
        "instantiating literal instances with the `new` keyword is forbidden");
  });
};


var declareNumberClass = classes.declareNumberClass = function(classTable) {
  classTable.declareClass("Number", "Literal", []);

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

  classTable.declareJet("Number", "unaryPlus", jetForLiteralsFn(function(a) {
    return a;
  }));

  classTable.declareJet("Number", "unaryMinus", jetForLiteralsFn(function(a) {
    return -a;
  }));

  classTable.declareJet("Number", "isTruthy", jetForLiteralsFn(function(a) {
    return a !== 0;
  }));

  classTable.declareJet("Number", "toString", jetForLiteralsFn(function(a) {
    return util.toString(a);
  }));
};


var declareStringClass = classes.declareStringClass = function(classTable) {
  classTable.declareClass("String", "Literal", []);

  classTable.declareJet("String", "+", jetForLiteralsFn(function(a, b) {
    return a + b;
  }));

  classTable.declareJet("String", "substring",
      jetForLiteralsFn(function(string, startIdx, endIdx) {
    return string.substring(startIdx, endIdx);
  }));
};


var declareBooleanClass = classes.declareBooleanClass = function(classTable) {
  classTable.declareClass("Boolean", "Literal", []);

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
  classTable.declareClass("Null", "Literal", []);
};

})();
