(function() {

var util = OO.util;
var state = OO.state;
var classes = OO.classes;
var checkpoint = OO.checkpoint;
var ast = OO.ast;
var root = OO.root;

var eval = OO.eval = {};

// EvalStack
//   @clock clock
//   @evalStack parent
var EvalStack = eval.EvalStack = function(parent, astNode, state, globalRegistry, currentEvalManager) {
  this.astRegistry = globalRegistry;
  this.parent = parent;
  this.astNode = astNode;
  this.state = state;
  this.evaledArgs = [];
  this.evalManager = currentEvalManager;
};

_.extend(EvalStack.prototype, {
  eval: function(evalManager) {
    return this.astNode.eval(this.state, this.evaledArgs, this.evalManager);
  },

  updateArgs: function(evaledArg) {
    return this.astNode.updateArgs(this.state, this.evaledArgs, evaledArg);
  },

  // return checkpointed version
  // we only need to store the level in the list of stacks we're at
  checkpoint: function() {
    var packedData = [];
    var currentFrame = this;
    if (typeof currentFrame !== "undefined") {
      if (typeof this.astNode.id === "undefined") {
        packedData.push([this.astNode, this.state.stack._level, JSON.stringify(this.evaledArgs)]);
      } else {
        packedData.push([this.astNode.id, this.state.stack._level, JSON.stringify(this.evaledArgs)]);
      }
      currentFrame = currentFrame.parent;
    }
    return packedData;
  },

  resume: function(packedData) {
    // always run from top level

    // this.stack has a full stack.
    var stacks = [];
    var currentStackFrame = this.state.stack;
    while (typeof currentStackFrame !== "undefined") {
      stacks.push(currentStackFrame);
      currentStackFrame = currentStackFrame._parent;
    }

    var i;
    var currentFrame = this;
    for (i = 0; i < packedData.length; i++) {
      if (typeof packedData[i][0] === "number") {
        currentFrame.astNode = this.astRegistry.objectForId(packedData[i][0]);
      } else {
        currentFrame.astNode = packedData[i][0];
      }
      currentFrame.state = {
        heap: this.heap,
        stack: stacks[stacks.length-1 -packedData[i][1]],
        classTable: this.classTable
      };
      currentFrame.evaledArgs = JSON.parse(packedData[i][2]);
      if (i != packedData.length - 1) {
        currentFrame.parent = new EvalStack(undefined, undefined, undefined, this.astRegistry, this.evalManager);
        currentFrame = currentFrame.parent;
      }
    }

   // console.log(this.state.stack);
  }
});


// EvalManager
//   [none]
var EvalManager = eval.EvalManager = function(astNode, astRegistry) {
  var stack, _state;

  this._astRegistry = astRegistry;

  this.clock = new state.Clock();
  this.heap = new state.Heap(this.clock);
  this.classTable = new state.ClassTable(this.clock);

  this.checkpoints = undefined;
  // if restoreIndex / maxTime are set,
  // then we restore from checkpoints[restoreIndex]
  // and eval up to maxTime.
  this.maxTime = undefined;
  this.restoreIndex = undefined;
  this.currentIDs = undefined;

  classes.declareBuiltIns(this.classTable);

  // base eval frame
  stack = new state.Stack(this.clock, undefined, 0);
  _state = {
    heap: this.heap,
    stack: stack,
    classTable: this.classTable
  };
  this.evalStack = new EvalStack(undefined, astNode, _state, this._astRegistry, this);
};

_.extend(EvalManager.prototype, {
  eval: function(checkpointIDs) {
    var complete, returnAddress, instruction, astNode, stack, _state;
    var instance, method, args, evaledArgs, addr, returnValue;

    // initialize eval loop termination variables
    complete = false;
    returnAddress = undefined;

    // execute first instruction
    instruction = this.evalStack.eval();

    // if resuming, load correct checkpoint
    // otherwise, take first checkpoint
    if (typeof this.restoreIndex !== "undefined") {
      this.resume(this.checkpoints[this.restoreIndex]);
    } else {
      if (typeof this.checkpoints === "undefined") {
        this.checkpoints = [];
        this.currentIDs = [];
      };
      this.checkpoints.push(this.checkpoint());
      this.currentIDs.push(1);
    };

    while (!complete) {

      // for resume mode
      if (typeof this.restoreIndex !== "undefined") {
        if (this.clock.time > this.maxTime) {
          break;
        };
      };

      switch (instruction[0]) {
        case "skip":
          instruction = this.evalStack.eval();
          break;

        case "eval":
          astNode = instruction[1];
          stack = instruction[2];

          // take a checkpoint
          // TODO where should this go?
          if (typeof this.restoreIndex === "undefined") {
            if ((checkpointIDs.indexOf(astNode.id) > -1) &&
                (this.currentIDs.indexOf(astNode.id) == -1)) {
              this.checkpoints.push(this.checkpoint());
              this.currentIDs.push(astNode.id);
            };
          };

          // add new eval frame
          _state = {
            heap: this.heap,
            stack: stack,
            classTable: this.classTable
          };
          this.evalStack = new EvalStack(this.evalStack, astNode, _state, this._astRegistry, this);

          // execute next instruction
          instruction = this.evalStack.eval();
          break;

        case "send":
          instance = instruction[1];
          method = instruction[2];
          args = instruction[3];
          stack = instruction[4];

          // construct new send node - TODO: store node for checkpointing
          evaledArgs = [instance, method].concat(args);
          astNode = new ast.Send.nodeFromEvaledArgs(evaledArgs,
              this._astRegistry); // TODO this thing is in the eval stack borking all the checkpointing LOL

          // add new eval frame
          _state = {
            heap: this.heap,
            stack: stack,
            classTable: this.classTable
          };
          this.evalStack = new EvalStack(this.evalStack, astNode, _state, this._astRegistry, this);

          // execute next instruction
          instruction = this.evalStack.eval();
          break;

        case "done":
          addr = instruction[1];

          // pop eval stack
          this.evalStack = this.evalStack.parent;

          // propagate value from finished frame to current frame
          if (this.evalStack) {
            instruction = this.evalStack.updateArgs(addr);

          // or terminate process if eval stack is exhausted
          } else {
            complete = true;
          };
          break;

        case "return":
          addr = instruction[1];

          // pop eval stack until a send astNode or until eval stack exhaustion
          while (this.evalStack = this.evalStack.parent) {
            if (this.evalStack.astNode.type === "send") {
              break;
            };
          };

          // generate a done instruction for a send node
          if (this.evalStack) {
            instruction = ["done", addr];

          // else terminate the process with the returned value
          } else {
            returnAddress = addr;
            complete = true;
          };
          break;
      };

      // increment the clock
      this.clock.tick();
    };

    //if (typeof this.restoreIndex === "undefined") {
    //  this.checkpoints.push(this.checkpoint());
    //}

    //console.log("lc last cp at t = " + this.checkpoints[this.checkpoints.length - 1].globalTime
    //      + " : " + this.checkpoints[this.checkpoints.length - 1].lc);

    // return the heap value at the returned address;
    // return undefined if the evaluation terminated with no return
    if (returnAddress !== undefined) {
      returnValue = this.heap.valueAtAddress(returnAddress);
      if (returnValue instanceof state.LiteralInstance) {
        returnValue = returnValue.literal;
      };
      return returnValue;
    } else {
      return;
    };
  },

  checkpoint: function() {
    // the heap and class table can be stored once.
    // each eval stack frame has to be checkpointed separately
    return {
      clock: this.clock.checkpoint(),
      heap: this.heap.checkpoint(),
      stack: this.evalStack.state.stack.checkpoint(),
      classTable: this.classTable.checkpoint(),
      evalStack: this.evalStack.checkpoint(),
      lc: {},
      globalTime: this.clock.time
    };
  },

  resume: function(cp) {
    this.heap.resume(cp.heap);
    this.clock.resume(cp.clock);
    // we don't screw with the jets
    this.classTable.resume(cp.classTable);
    this.evalStack.state.stack.resume(cp.stack);
    var currentFrame = this.evalStack;
    this.evalStack.resume(cp.evalStack);
    //this.evalStack.state.heap = this.heap;
    //this.evalStack.state.classTable = this.classTable;
    var currentFrame = this.evalStack;
    while (typeof currentFrame !== "undefined") {
      currentFrame.state.heap = this.heap;
      currentFrame.state.classTable = this.classTable;
      currentFrame = currentFrame.parent;
    }

  }

});

})();
