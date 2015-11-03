(function() {

// establish the root object: `window` in browser, `global` on server
var root = this;

// save the previous value of the `OO` variable
var previousOO = root.OO;

// top level namespace
var OO = root.OO = {};
OO.previousOO = previousOO;

// tell the grammar about OO
O.OO = OO;


// Registry - map uids to objects
var Registry = function() {
  this._registry = [];
};

_.extend(Registry.prototype, {
  idFromRegisteringObject: function(obj) {
    var id = this._registry.length;
    this._registry[id] = obj;
    return id;
  },

  objectForId: function(id) {
    return this._registry[id];
  }
});

OO.evalAST = function(parsedAst) {
  var ast = OO.ast;
  var eval = OO.eval;

  var astRegistry = new Registry();
  var program = ast.construct(parsedAst, astRegistry);
  var evalManager = new eval.EvalManager(program);
  return evalManager.eval();
};

})();
