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
    checkpointIDs: [],
    checkpoints: undefined,
    pr: pr
  };

  var checkpointsAndValue = OO.evalProgramAndRegistryWithCheckpoints(pr, []);
  OO.io[i].checkpoints = checkpointsAndValue[0];
  return checkpointsAndValue[1];
};

OO.evalAgainForCheckpoints = function(i) {
  var savedStruct, checkpointsAndValue;
  console.log("on index: " + i);
  savedStruct = OO.io[i];
  checkpointsAndValue = OO.evalProgramAndRegistryWithCheckpoints(savedStruct.pr, savedStruct.checkpointIDs);
  OO.io[i].checkpoints = checkpointsAndValue[0];
  console.log("taken: " + OO.io[i].checkpoints.length);
}

OO.evalAllAgainForCheckpoints = function() {
  var i;
  for (i = 0; i < OO.io.length; i++) {
    OO.evalAgainForCheckpoints(i);
  }
};

// evaluates pr as necessary given checkpoints and set of variables for queries
OO.totalExecutionTime = 0;
OO.totalExecutions = 0;

// timing of resumes
OO.totalResumeTime = 0;
OO.totalResumes = 0;

// timing of recomputations
OO.totalRecomputationTime = 0;
OO.totalRecomputations = 0;

OO.resetExecutionCounters = function() {
  OO.totalExecutionTime = 0;
  OO.totalExecutions = 0;
  OO.totalResumeTime = 0;
  OO.totalResumes = 0;
  OO.totalRecomputationTime = 0;
  OO.totalRecomputations = 0;
}

OO.evalFromCheckpointsAndQuerySet = function(querySet, ioIndex) {
  var eval = OO.eval;
  var evalM, savedStruct, checkpoints;
  savedStruct = OO.io[ioIndex];
  checkpoints = savedStruct.checkpoints;
  var i, j, varName, checkpoint, maxTime;
  var t0 = performance.now();
  for (i = 0; i < checkpoints.length; i++) {
    checkpoint = checkpoints[i];
    maxTime = checkpoint.globalTime;
    for (j = 0; j < querySet.length; j++) {
      varName = querySet[j];
      if (typeof checkpoint.lc[varName] !== "undefined") {
        if (checkpoint.lc[varName] > maxTime) {
          // console.log("the LCT was greater than (relative) 0");
          maxTime = checkpoint.lc[varName];
        }
      }
    }
    if (maxTime === checkpoint.globalTime) {
      continue;
    }

    evalM = new eval.EvalManager(savedStruct.pr[0], savedStruct.pr[1]); // error: undefined is not an object
    evalM.checkpoints = checkpoints;
    evalM.restoreIndex = i;
    evalM.maxTime = maxTime;
    evalM.eval([]);
  }
  var t1 = performance.now();
  OO.totalExecutionTime += t1 - t0;
  console.log("The eval of example program " + ioIndex + " took " + (t1 - t0) + " ms" );
  OO.totalExecutions += 1;
  console.log("Total time: average of " + OO.totalExecutions + " evaluations is " + (OO.totalExecutionTime / OO.totalExecutions));
  console.log("Resume time: average of " + OO.totalResumes + " evaluations is " + (OO.totalResumeTime / OO.totalResumes));
  console.log("Recomputation time: average of " + OO.totalRecomputations + " evaluations is " + (OO.totalRecomputationTime / OO.totalRecomputations));
};

OO.evalProgramAndRegistry = function(pr) {
  var eval = OO.eval;
  var evalManager = new eval.EvalManager(pr[0], pr[1]);
  return evalManager.eval([]);
};

OO.evalProgramAndRegistryWithCheckpoints = function(pr, checkpointIDs) {
  var eval = OO.eval;
  var evalManager = new eval.EvalManager(pr[0], pr[1]);
  var finalValue = evalManager.eval(checkpointIDs);
  return [evalManager.checkpoints, finalValue];
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

  // a query is actually just a comma-separated list of var names

  var listOfVariables = query.split(",");
  OO.evalFromCheckpointsAndQuerySet(listOfVariables, ioIndex);

  return "some result";
};

})();
