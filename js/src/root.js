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

OO.programAndRegistry = function(parsedAst) {
  var ast = OO.ast;
  var eval = OO.eval;

  var astRegistry = new Registry();
  var program = ast.construct(parsedAst, astRegistry);
  return [program, astRegistry];
  // TODO more completely refactor the parsed AST, eval manager, etc. out
  // playground formation should establish a globally shared set of things
  // related to the program at hand (this is our evaluation framework for week 1)
};

OO.evalAST = function(parsedAst) {
  var pr = OO.programAndRegistry(parsedAst);
  var evalManager = new eval.EvalManager(pr[0], pr[1]);
  return evalManager.eval();
};

})();
