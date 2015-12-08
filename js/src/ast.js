(function() {

var util = OO.util;
var eval = OO.eval;

var ast = OO.ast = {};

ast.Nodes = {};


// Construct an AST object from a parsed AST array and an ast node registry.
ast.construct = function(parsedAst, registry) {
  return this.Ast.prototype.constructAst(parsedAst, registry);
};


// AST
//   [abstract]
var Ast = ast.Ast = function(parsedAst, registry) {
  // pass `{custom: true}` as first argument to short-circuit constructor for
  // custom behavior
  if (util.isObject(parsedAst) && parsedAst.custom === true) {
    return this.customConstructor.apply(this, arguments);
  };

  util.assert(parsedAst[0] === this.type, "expected parsed ast node of type " +
      this.type);
  this._registry = registry;
  this.id = this._registry.idFromRegisteringObject(this);
  this.constructChildren(parsedAst.slice(1));
};

_.extend(Ast.prototype, {
  type: "ast",

  customConstructor: function(options, parsedAst, registry) {
    util.assert(false, "no custom constructor defined for " + this.type);
  },

  constructChildren: function(parsedAsts) {
    this.children = this.constructAsts(parsedAsts);
  },

  constructAsts: function(parsedAsts) {
    var that = this;
    var wrappedFn = function(parsedAst) {
      return that.constructAst(parsedAst);
    };
    return _.map(parsedAsts, wrappedFn);
  },

  constructAst: function(parsedAst, registry) {
    registry || (registry = this._registry);
    if (util.isLiteral(parsedAst)) {
      return parsedAst;
    };
    util.assert(util.isArray(parsedAst), "illegal argument to constructAst");

    // if this is a parsed ast, construct its appropriate ast node
    if (util.isString(parsedAst[0])) {
      var type = parsedAst[0];
      return new ast.Nodes[type](parsedAst, registry);

    // else, this is a list of parsed asts
    } else {
      return this.constructAsts(parsedAst);
    };
  },

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    evaledArgs.push(newEvaledArg);
    return ["skip"];
  },

  eval: function(s, evaledArgs, evalManager) {
    if (evaledArgs.length < this.children.length) {
      return this.evalNextChild(s, evaledArgs, evalManager);
    } else {
      return this.evalSelf(s, evaledArgs, evalManager);
    };
  },

  evalNextChild: function(s, evaledArgs, evalManager) {
    var nextChild = this.children[evaledArgs.length];

    // if next child is a literal, add it directly to evaledArgs
    if (util.isLiteral(nextChild)) {
      return this.updateArgs(s, evaledArgs, nextChild);

    // otherwise, eval it as an astNode
    } else {
      return ["eval", nextChild, s.stack];
    };
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    return ["done", undefined];
  },

});

Ast.extend = util.extendSelf;


// Program
//   @stmt statement0
//   @stmt statement1
//   ...
var Program = ast.Program = ast.Nodes["program"] = Ast.extend({
  type: "program",

  constructChildren: function(parsedAsts) {
    var seq = ["seq"].concat(parsedAsts);
    if (seq[seq.length - 1][0] === "exprStmt") {
      seq[seq.length - 1][0] = "return";
    };
    parsedAsts = [seq];
    this.children = this.constructAsts(parsedAsts);
  }
});


// Statement
//   [abstract]
var Stmt = ast.Stmt = Ast.extend({
  type: "stmt"
});


// Sequence
//   @stmt statement0
//   @stmt statement1
//   ...
var Seq = ast.Seq = ast.Nodes["seq"] = Stmt.extend({
  type: "seq"
});


// If
//   @expr condition
//   @stmt trueBlock
//   @stmt falseBlock
var If = ast.If = ast.Nodes["if"] = Stmt.extend({
  type: "if",

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    if (evaledArgs.length < 2) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      return ["done", undefined];
    };
  },

  eval: function(s, evaledArgs, evalManager) {
    if (evaledArgs.length < 1) {
      return this.evalNextChild(s, evaledArgs, evalManager);
    } else if (evaledArgs.length < 2) {
      // detect truthiness
      return ["send", evaledArgs[0], "isTruthy", [], s.stack];
    } else {
      return this.evalSelf(s, evaledArgs, evalManager);
    };
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var isTruthy = s.heap.valueAtAddress(evaledArgs[1]).literal;
    var block = isTruthy ? this.children[1] : this.children[2];
    return ["eval", block, s.stack.stackWithNewFrame()];
  }
});


// While
//   @expr condition
//   @stmt block
var While = ast.While = ast.Nodes["while"] = Stmt.extend({
  type: "while",

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    if (evaledArgs.length < 2) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      evaledArgs.splice(0);
      return ["skip"];
    };
  },

  eval: function(s, evaledArgs, evalManager) {
    if (evaledArgs.length < 1) {
      return this.evalNextChild(s, evaledArgs, evalManager);
    } else if (evaledArgs.length < 2) {
      // detect truthiness
      return ["send", evaledArgs[0], "isTruthy", [], s.stack];
    } else {
      return this.evalSelf(s, evaledArgs, evalManager);
    };
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var isTruthy = s.heap.valueAtAddress(evaledArgs[1]).literal;
    if (isTruthy) {
      return ["eval", this.children[1], s.stack.stackWithNewFrame()];
    } else {
      return ["done", undefined];
    };
  }
});


// Return
//   @expr returnValue
var Return = ast.Return = ast.Nodes["return"] = Stmt.extend({
  type: "return",

  evalSelf: function(s, evaledArgs, evalManager) {
    var addr = evaledArgs[0];
    return ["return", addr];
  }
});


// Class Declaration
//   @name className
//   @name superClassName
//   @name* instVarNames
var ClassDecl = ast.ClassDecl = ast.Nodes["classDecl"] = Stmt.extend({
  type: "classDecl",

  constructChildren: function(parsedAsts) {
    var instVarNames = parsedAsts[2];
    parsedAsts = parsedAsts.slice(0, 2).concat(instVarNames);
    this.children = this.constructAsts(parsedAsts);
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var className = evaledArgs[0];
    var superClassName = evaledArgs[1];
    var instVarNames = evaledArgs.slice(2);
    s.classTable.declareClass(className, superClassName, instVarNames);
    return ["done", undefined];
  }
});


// Method Declaration
//   @name className
//   @name methodName
//   @name* argNames
//   @stmt* methodBody
var MethodDecl = ast.MethodDecl = ast.Nodes["methodDecl"] = Stmt.extend({
  type: "methodDecl",

  constructChildren: function(parsedAsts) {
    var argNames = parsedAsts[2];
    var methodBody = ["seq"].concat(parsedAsts[3]);
    parsedAsts = parsedAsts.slice(0, 2).concat(argNames);
    parsedAsts.push(methodBody);
    this.children = this.constructAsts(parsedAsts);
  },

  eval: function(s, evaledArgs, evalManager) {
    if (evaledArgs.length < this.children.length - 1) {
      return this.evalNextChild(s, evaledArgs, evalManager);
    } else {
      return this.evalSelf(s, evaledArgs, evalManager);
    };
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var className = evaledArgs[0];
    var methodName = evaledArgs[1];
    var argNames = evaledArgs.slice(2);
    var seq = this.children[this.children.length - 1];
    s.classTable.declareMethod(className, methodName, argNames, seq.id);
    return ["done", undefined];
  }
});


// Var Declaration
//   @[name, expr] decl0
//   @[name, expr] decl1
//   ...
var VarDecls = ast.VarDecls = ast.Nodes["varDecls"] = Stmt.extend({
  type: "varDecls",

  constructChildren: function(parsedAsts) {
    parsedAsts = _.reduce(parsedAsts, function(unpackedArgs, arg) {
      return unpackedArgs.concat(arg);
    }, []);
    this.children = this.constructAsts(parsedAsts);
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var i, varName, addr;
    for (i = 0; i + 1 < evaledArgs.length; i+=2) {
      varName = evaledArgs[i];
      addr = evaledArgs[i + 1];
      s.stack.declareVar(varName, addr);
    };
    return ["done", undefined];
  }
});


// Set Variable
//   @name varName
//   @expr addr

// right now, setVar is the only thing that touches LCi.
// take the last checkpoint and make the
var SetVar = ast.SetVar = ast.Nodes["setVar"] = Stmt.extend({
  type: "setVar",

  evalSelf: function(s, evaledArgs, evalManager) {
    var varName = evaledArgs[0];
    var addr = evaledArgs[1];
    s.stack.setVarToAddr(varName, addr);
    //console.log("checkpoints size " + evalManager.checkpoints.length);
    evalManager.checkpoints[evalManager.checkpoints.length - 1].lc[varName] = s.stack._clock.time;
    // console.log(evalManager.checkpoints[evalManager.checkpoints.length - 1].lc);
    //console.log("lc set for " + varName +
    //    ", rel t = " + eval.checkpoints[eval.checkpoints.length - 1].lc[varName] +
    //    ", last global t = " + eval.checkpoints[eval.checkpoints.length - 1].globalTime);
    return ["done", undefined];
  }
});


// Set Instance Variable
//   @expr instance
//   @name instVarName
//   @expr addr
var SetInstVar = ast.SetInstVar = ast.Nodes["setInstVar"] = Stmt.extend({
  type: "setInstVar",

  evalSelf: function(s, evaledArgs, evalManager) {
    var instance = s.heap.valueAtAddress(evaledArgs[0]);
    var instVarName = evaledArgs[1];
    var addr = evaledArgs[2];
    instance.setInstVarToAddress(instVarName, addr);
    return ["done", undefined];
  }
});


// Expression Statement
//   @expr expression
var ExprStmt = ast.ExprStmt = ast.Nodes["exprStmt"] = Stmt.extend({
  type: "exprStmt"
});


// Expression
//   [abstract]
var Expr = ast.Expr = Ast.extend({
  type: "expr"
});


// Get Variable
//   @name varName
var GetVar = ast.GetVar = ast.Nodes["getVar"] = Expr.extend({
  type: "getVar",

  evalSelf: function(s, evaledArgs, evalManager) {
    var varName = evaledArgs[0];
    var addr = s.stack.addrOfVar(varName);
    return ["done", addr];
  }
});


// Get Instance Variable
//   @expr instance
//   @name instVarName
var GetInstVar = ast.GetInstVar = ast.Nodes["getInstVar"] = Expr.extend({
  type: "getInstVar",

  evalSelf: function(s, evaledArgs, evalManager) {
    var instance = s.heap.valueAtAddress(evaledArgs[0]);
    var instVarName = evaledArgs[1];
    var addr = instance.addressOfInstVar(instVarName);
    return ["done", addr];
  }
});


// Send
//   @expr receiver
//   @name messageName
//   @expr arg0
//   @expr arg1
//   ...
var Send = ast.Send = ast.Nodes["send"] = Expr.extend({
  type: "send",

  customConstructor: function(options, parsedAst, registry) {
    // allow construction from pre-evaluated arguments
    if (options.preEvaledArgs && options.registry) {
      this._hasPreEvaledChildren = true;
      this.children = options.preEvaledArgs;
      this._registry = options.registry;
      return;
    };

    util.assert(false,
        "no custom constructor for send recognizes the options given");
  },

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    if (evaledArgs.length < this.children.length) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      var instance = s.classTable.newLiteralInstance(null);
      var addr = s.heap.storeValue(instance);
      return ["done", addr];
    };
  },

  eval: function(s, evaledArgs, evalManager) {
    // if children came pre-evaled, inject them into evaledArgs
    if (this._hasPreEvaledChildren && evaledArgs.length < this.children.length) {
      evaledArgs.splice(0);
      evaledArgs.splice.apply(evaledArgs, [0, 0].concat(this.children));
    };

    return this.__super__.eval.apply(this, arguments);
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var receiver = evaledArgs[0];
    var messageName = evaledArgs[1];
    var args = evaledArgs.slice(2);
    var receiverVal = s.heap.valueAtAddress(receiver);
    var method = s.classTable.methodOfInstanceWithName(receiverVal, messageName);
    var newStack, methodNode;

    // if method is a jet, evaluate it in place and return
    if (util.isFunction(method)) {
      return ["done", method(receiver, args, s.heap)];

    // else, retrieve the ast corresponding to the method's astID and eval it
    } else {
      newStack = s.stack.stackWithNewFrame();
      newStack.declareVar("self", receiver);
      // TODO - declare "super" varName?
      _.each(method.argNames, function(name, i) {
        newStack.declareVar(name, args[i]);
      });
      methodNode = this._registry.objectForId(method.astID);
      return ["eval", methodNode, newStack];
    };
  }
});

Send.nodeFromEvaledArgs = function(evaledArgs, registry) {
  var options = {
    custom: true,
    preEvaledArgs: evaledArgs,
    registry: registry
  };
  return new Send(options);
};


// Super
//   @name messageName
//   @expr* args
// TODO


// New
//   @name className
//   @expr arg0
//   @expr arg1
//   ...
var New = ast.New = ast.Nodes["new"] = Expr.extend({
  type: "new",

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    if (evaledArgs.length < this.children.length) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      return ["done", evaledArgs[evaledArgs.length - 1]];
    };
  },

  evalSelf: function(s, evaledArgs, evalManager) {
    var className = evaledArgs[0];
    var args = evaledArgs.slice(1);
    var instance = s.classTable.newInstance(className);
    var addr = s.heap.storeValue(instance);

    evaledArgs.push(addr); // this is hacky - can we do better?
    return ["send", addr, "initialize", args, s.stack];
  }
});


// This
//   [none]
var This = ast.This = ast.Nodes["this"] = Expr.extend({
  type: "this",

  evalSelf: function(s, evaledArgs, evalManager) {
    var addr = s.stack.addrOfVar("self");
    return ["done", addr];
  }
});


// Literal
//   [abstract]
var Literal = ast.Literal = Expr.extend({
  type: "literal",

  eval: function(s, evaledArgs, evalManager) {
    return this.evalSelf(s, evaledArgs, evalManager);
  }
});


// Null
//   [none]
var Null = ast.Null = ast.Nodes["null"] = Literal.extend({
  type: "null",

  evalSelf: function(s, evaledArgs, evalManager) {
    var instance = s.classTable.newLiteralInstance(null);
    var addr = s.heap.storeValue(instance);
    return ["done", addr];
  }
});


// NumberLiteral
//   @number value
var NumberLiteral = ast.NumberLiteral = ast.Nodes["number"] = Literal.extend({
  type: "number",

  evalSelf: function(s, evaledArgs, evalManager) {
    var numberValue = parseFloat(this.children[0]);
    var instance = s.classTable.newLiteralInstance(numberValue);
    var addr = s.heap.storeValue(instance);
    return ["done", addr];
  }
});


// StringLiteral
//   @string value
var StringLiteral = ast.StringLiteral = ast.Nodes["string"] = Literal.extend({
  type: "string",

  evalSelf: function(s, evaledArgs, evalManager) {
    var stringValue = "" + this.children[0];
    var instance = s.classTable.newLiteralInstance(stringValue);
    var addr = s.heap.storeValue(instance);
    return ["done", addr];
  }
});


// BooleanLiteral
//   [abstract]
var BooleanLiteral = ast.BooleanLiteral = Literal.extend({
  type: "booleanLiteral"
});


// True
//   [none]
var True = ast.True = ast.Nodes["true"] = BooleanLiteral.extend({
  type: "true",

  evalSelf: function(s, evaledArgs, evalManager) {
    var instance = s.classTable.newLiteralInstance(true);
    var addr = s.heap.storeValue(instance);
    return ["done", addr];
  }
});


// False
//   [none]
var False = ast.False = ast.Nodes["false"] = BooleanLiteral.extend({
  type: "false",

  evalSelf: function(s, evaledArgs, evalManager) {
    var instance = s.classTable.newLiteralInstance(false);
    var addr = s.heap.storeValue(instance);
    return ["done", addr];
  }
});

})();
