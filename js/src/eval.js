(function() {

var util = OO.util;
var state = OO.state;
var classes = OO.classes;
var ast = OO.ast;

var eval = OO.eval = {};


// EvalStack
//   @clock clock
//   @evalStack parent
var EvalStack = eval.EvalStack = function(parent, astNode, state) {
  this.parent = parent;
  this.astNode = astNode;
  this.state = state;
  this.evaledArgs = [];
};

_.extend(EvalStack.prototype, {
  eval: function() {
    return this.astNode.eval(this.state, this.evaledArgs);
  },

  updateArgs: function(evaledArg) {
    return this.astNode.updateArgs(this.state, this.evaledArgs, evaledArg);
  },

  // return checkpoint array, just for stack and ct.
  // heap and classtable is handled by eval manager below
  checkpoint: function() {
    var thisCheckpoint = {
      ast: this.astNode.checkpoint()
      /* TODO: stack */
    };
    if (typeof this.parent !== "undefined") {
      thisCheckpoint.parent = this.parent.checkpoint();
    }
    return thisCheckpoint;
  }
});


// EvalManager
//   [none]
var EvalManager = eval.EvalManager = function(astNode) {
  var stack, _state;

  this.clock = new state.Clock();
  this.heap = new state.Heap(this.clock);
  this.classTable = new state.ClassTable(this.clock);

  classes.declareBuiltIns(this.classTable);

  // base eval frame
  stack = new state.Stack(this.clock, undefined);
  _state = {
    heap: this.heap,
    stack: stack,
    classTable: this.classTable
  };
  this.evalStack = new EvalStack(undefined, astNode, _state);
};

_.extend(EvalManager.prototype, {
  eval: function() {
    var complete, returnAddress, instruction, astNode, stack, _state;
    var instance, method, args, addr, returnValue;

    // initialize eval loop termination variables
    complete = false;
    returnAddress = undefined;

    // execute first instruction
    instruction = this.evalStack.eval();

    // eval loop
    while (!complete) {
      switch (instruction[0]) {
        case "skip":
          instruction = this.evalStack.eval();
          break;

        case "eval":
          astNode = instruction[1];
          stack = instruction[2];

          // add new eval frame
          _state = {
            heap: this.heap,
            stack: stack,
            classTable: this.classTable
          };
          this.evalStack = new EvalStack(this.evalStack, astNode, _state);

          // execute next instruction
          instruction = this.evalStack.eval();
          break;

        case "send":
          instance = instruction[1];
          method = instruction[2];
          args = instruction[3];
          stack = instruction[4];

          // add new eval frame
          _state = {
            heap: this.heap,
            stack: stack,
            classTable: this.classTable
          };
          // TODO - add way to construct Send node from prebuilt args
          astNode = new ast.Send(instance, method, args);
          this.evalStack = new EvalStack(this.evalStack, astNode, _state);

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
    return {heap: this.heap.checkpoint(),
      classTable: this.classTable.checkpoint(),
      evalStack: this.evalStack.checkpoint()};
  }
});

})();
