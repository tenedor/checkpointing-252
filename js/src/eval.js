(function() {

var util = OO.util;
var state = OO.state;

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
  }
});


// EvalManager
//   [none]
var EvalManager = eval.EvalManager = function(astNode) {
  var stack, state;

  this.clock = new Clock();
  this.heap = new Heap(this.clock);
  this.classTable = new ClassTable(this.clock);

  // base eval frame
  stack = new Stack(this.clock, undefined);
  state = {
    heap: this.heap,
    stack: stack,
    classTable: this.classTable
  };
  this.evalStack = new EvalStack(undefined, astNode, state);
};

_.extend(Eval.prototype, {
  eval: function() {
    var complete, returnAddress, instruction, astNode, stack, state, addr;

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
          state = {
            heap: this.heap,
            stack: stack,
            classTable: this.classTable
          };
          this.evalStack = new EvalStack(this.evalStack, astNode, state); // TODO

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

    // return the heap value at the returned address;
    // return undefined if the evaluation terminated with no return
    return (returnAddress !== undefined ?
        this.heap.valueAtAddress(returnAddress) :
        undefined);
  }
});

})();
