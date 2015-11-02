(function() {

var util = OO.util;
var state = OO.state;

var classes = OO.classes = {};


// lifts a function f on JS literals to a function on OO literals
var jetForFunction = classes.jetForFunction = function(f) {
  return function(receiver, jetArgs, heap) {
    var funArgs = [heap.valueAtAddress(receiver).literal];
    var result;

    // extract literal args and apply computation
    funArgs.concat(_.map(jetArgs, function(arg) {
      return heap.valueAtAddress(arg).literal;
    }));
    result = f.apply(this, funArgs);

    // construct OO object from result
    new state.LiteralInstance(type, result);
    heap.setAddressToValue(heap.nextAddress(), ooResult);
  };
}


var jetForEquality = classes.jetForEquality = function() {

}


var declareBuiltIns = classes.declareBuiltIns = function(classTable) {
  classTable.declareClass("Number", "Object", []);
  classTable.declareJet("Number", "+", jetForFunction(function() {
    var start = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      start += arguments[i];
    }
    return start;
  }));

  // TODO
};

})();
