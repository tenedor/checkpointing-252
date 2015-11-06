(function() {

var util = OO.util;
var state = OO.state;
var classes = OO.classes;
var ast = OO.ast;
var root = OO.root;

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

  // return checkpointed version
  // we only need to store the level in the list of stacks we're at
  checkpoint: function() {
    var thisCheckpoint = {
      ast: this.astNode.checkpoint(),
      stackLevel: this.state.stack.level(),
      evaledArgsPacked: JSON.stringify(this.evaledArgs)
    };
    if (typeof this.parent !== "undefined") {
      thisCheckpoint.parent(this.parent.checkpoint());
    }
    return thisCheckpoint;
  },

  unpack: function(packed) {
    this.astNode = /* get ID */ undefined;
    this.state = {}
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

  classes.declareBuiltIns(this.classTable);

  // base eval frame
  stack = new state.Stack(this.clock, undefined, 0);
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
    var instance, method, args, evaledArgs, addr, returnValue;

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

          // construct new send node - TODO: store node for checkpointing
          evaledArgs = [instance, method].concat(args);
          astNode = new ast.Send.nodeFromEvaledArgs(evaledArgs);

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
    return {
      heap: this.heap.checkpoint(),
      classTable: this.classTable.checkpoint(),
      stack: this.stack.checkpoint(),
      evalStack: this.evalStack.checkpoint()
    };
  },

  resume: function(checkpoint) {
    this.heap = JSON.parse(checkpoint.heap);
    this.clock = this.heap.clock;
    this.classTable = JSON.parse(checkpoint.classTable);
    this.stack = JSON.parse(checkpoint.stack);

    // build a list of the stack frames to index into
    var stackList = [];
    var currentFrame = this.stack;
    while (typeof currentFrame !== "undefined") {
      stackList.append(currentFrame);
      currentFrame = currentFrame.parent;
    }

    // reconstruct eval frames
    var newestFrame, prevFrame, firstFrame;
    currentFrame = checkpoint.evalStack;
    while(typeof currentFrame !== "undefined") {
      currentState = {
        heap: this.heap,
        stack: stackList[frame.stackLevel],
        classTable: this.classTable
      };
      newestFrame = new EvalStack(undefined,
          this.evalStack.astNode._registry.objectForId(frame.ast),
          currentState);
      newestFrame.evaledArgs = JSON.parse(currentFrame.evaledArgsPacked);
      if(typeof prevFrame !== "undefined") {
        prevFrame.parent = newestFrame;
      } else {
        firstFrame = newestFrame;
      }
      prevFrame = newestFrame;
      currentFrame = currentFrame.parent;
    }

    this.evalStack = firstFrame;
  }
});

})();
