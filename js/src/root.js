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

OO.io = [];
OO.io.setCheckpointIDs = function(checkpointIDs, i) {
  var pr = OO.io[i].pr;
  OO.io[i].checkpointIDs = checkpointIDs;
  OO.evalProgramAndRegistryWithCheckpoints(pr, checkpointIDs);
};

OO.programAndRegistry = function(parsedAst) {
  var ast = OO.ast;
  var astRegistry = new Registry();
  var program = ast.construct(parsedAst, astRegistry);
  return [program, astRegistry];
  // TODO more completely refactor the parsed AST, eval manager, etc. out
  // playground formation should establish a globally shared set of things
  // related to the program at hand (this is our evaluation framework for week 1)
};

OO.evalAST = function(parsedAst) {
  var pr = OO.programAndRegistry(parsedAst);

  var cg = new OO.constraints.ConstraintGenerator();
  var constraints = cg.constraintsForProgram(pr[0]);

  var i = OO.io.length;
  OO.io[i] = {
    constraints: constraints,
    checkpointIDs: undefined,
    pr: pr
  };

  return OO.evalProgramAndRegistry(pr);
};

OO.evalProgramAndRegistry = function(pr) {
  var eval = OO.eval;
  var evalManager = new eval.EvalManager(pr[0], pr[1]);
  return evalManager.eval();
};

OO.evalProgramAndRegistryWithCheckpoints = function(pr, checkpointIDs) {
  var eval = OO.eval;
  var evalManager = new eval.EvalManager(pr[0], pr[1]);
  return evalManager.evalWithCheckpoints(checkpointIDs);
};

OO.testPageHtml = function(parsedAst) {
  var ioIndex = OO.io.length - 1;
  var div = $('<div class="query-container">');
  var button = $('<button>').text('Query').appendTo(div);
  var queryField = $('<input type="text">').appendTo(div);
  var output = $('<p>').text('-').appendTo(div);

  var onClickQueryButton = function() {
    var query = queryField.val();
    var queryResult = OO.queryAst(query, parsedAst, ioIndex);
    output.text(queryResult);

    console.log('query: ' + query);
    console.log('result: ' + queryResult);
  };

  button.click(onClickQueryButton);

  return div;
};

OO.queryAst = function(query, parsedAst, ioIndex) {
  // do something here
  return "some result";
};

})();
