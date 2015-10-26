(function() {

var util = OO.util;

var ast = OO.ast = {};

ast.Nodes = {};


// Construct an AST object from a parsed AST array.
ast.construct = function(parsedAst) {
  return this.Ast.prototype.constructAst(parsedArgs);
};


// AST
//   [abstract]
var Ast = ast.Ast = function(parsedAst) {
  util.assert(parsedAst[0] === this.type, "expected parsed ast node of type " +
      this.type);
  this.__super__ = this.constructor.__super__;
  this.constructChildren(parsedAst.slice(1));
};

_.extend(Ast.prototype, {
  type: "ast",

  constructChildren: function(parsedAsts) {
    this.children = this.constructAsts(parsedAsts);
  },

  constructAsts: function(parsedAsts) {
    return _.map(parsedAsts, _.bind(this.constructAst, this));
  },

  constructAst: function(parsedAst) {
    // if this is a parsed ast, construct its appropriate ast node
    if (util.isString(parsedAst[0])) {
      var type = parsedAst[0];
      return ast.Nodes[type](parsedAst);

    // TODO: figure out the correct behavior in this case
    } else if (util.isJSPrimitive(parsedAst)) {
      throw Error("TODO - implement me");

    // else, this is a list of parsed asts
    } else {
      return this.constructAsts(parsedAst);
    };
  },

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    evaledArgs.push(newEvaledArg);
    return ["skip"];
  },

  eval: function(s, evaledArgs) {
    if (evaledArgs.length < this.children.length) {
      return evalNextChild(s, evaledArgs);
    } else {
      return evalSelf(s, evaledArgs);
    };
  },

  evalNextChild: function(s, evaledArgs) {
    var nextChild = this.children[evaledArgs.length];
    return ["eval", nextChild, s.stack];
  },

  evalSelf: function(s, evaledArgs) {
    return ["done", undefined];
  }
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
    if (evaledArgs.length < 1) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      return ["done", undefined];
    };
  },

  eval: function(s, evaledArgs) {
    if (evaledArgs.length < 1) {
      return evalNextChild(s, evaledArgs);
    } else {
      return evalSelf(s, evaledArgs);
    };
  },

  evalSelf: function(s, evaledArgs) {
    // TODO determine truthiness of evaledArgs[0]
    var isTruthy = throw Error("TODO - implement me");
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
    if (evaledArgs.length < 1) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      evaledArgs.splice(0);
      return ["skip"];
    };
  },

  eval: function(s, evaledArgs) {
    if (evaledArgs.length < 1) {
      return evalNextChild(s, evaledArgs);
    } else {
      return evalSelf(s, evaledArgs);
    };
  },

  evalSelf: function(s, evaledArgs) {
    // TODO determine truthiness of evaledArgs[0]
    var isTruthy = throw Error("TODO - implement me");
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

  evalSelf: function(s, evaledArgs) {
    return ["return", evaledArgs[0]];
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

  evalSelf: function(s, evaledArgs) {
    // TODO add classDef to class table
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

  eval: function(s, evaledArgs) {
    if (evaledArgs.length < this.children.length - 1) {
      return evalNextChild(s, evaledArgs);
    } else {
      return evalSelf(s, evaledArgs);
    };
  },

  evalSelf: function(s, evaledArgs) {
    // TODO add methodDef to class table
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
    parsedAsts = _.flatten(parsedAsts);
    this.children = this.constructAsts(parsedAsts);
  },

  evalSelf: function(s, evaledArgs) {
    var i;
    for (i = 0; i + 1 < evaledArgs.length; i+=2) {
      s.stack.declareVar(evaledArgs[i], evaledArgs[i + 1]);
    };
    return ["done", undefined];
  }
});


// Set Variable
//   @name varName
//   @expr value
var SetVar = ast.SetVar = ast.Nodes["setVar"] = Stmt.extend({
  type: "setVar",

  evalSelf: function(s, evaledArgs) {
    s.stack.setVarToValue(evaledArgs[0], evaledArgs[1]);
    return ["done", undefined];
  }
});


// Set Instance Variable
//   @expr instance // TODO - update the parser to provide this value
//   @name instVarName
//   @expr value
var SetInstVar = ast.SetInstVar = ast.Nodes["setInstVar"] = Stmt.extend({
  type: "setInstVar",

  evalSelf: function(s, evaledArgs) {
    // TODO update variable in the instance's variable table
    return ["done", undefined];
  }
});


// Expression Statement
//   @expr expression
var ExprStmt = ast.ExprStmt = ast.Nodes["exprStmt"] = Stmt.extend({
  type: "exprStmt",
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

  evalSelf: function(s, evaledArgs) {
    var addr = s.stack.valueOfVar(evaledArgs[0]);
    return ["done", addr];
  }
});


// Get Instance Variable
//   @expr instance // TODO - update the parser to provide this value
//   @name instVarName
var GetInstVar = ast.GetInstVar = ast.Nodes["getInstVar"] = Expr.extend({
  type: "getInstVar",

  evalSelf: function(s, evaledArgs) {
    // TODO get variable from the instance's variable table
    var addr;
    return ["done", addr];
  }
});


// TODO: sends need to be generated on the fly by new and super; this might
// call for some specialer stuff going on in the Send ast node
//
// Send
//   @expr receiver
//   @name messageName
//   @expr* args
var Send = ast.Send = ast.Nodes["send"] = Expr.extend({
  type: "send",

  constructChildren: function(parsedAsts) {
    var args = parsedAsts[2];
    parsedAsts = parsedAsts.slice(0, 2).concat(argNames);
    this.children = this.constructAsts(parsedAsts);
  },

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    if (evaledArgs.length < this.children.length) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      // TODO make all of this rigorous
      var instance = s.classTable.newInstance("null");
      var addr = s.heap.storeValue(instance);
      return ["done", addr];
    };
  },

  evalSelf: function(s, evaledArgs) {
    // TODO make all of this rigorous
    var receiver = evaledArgs[0];
    var messageName = evaledArgs[1];
    var args = evaledArgs.slice(2);
    var method = s.classTable.methodOfInstanceWithName(receiver, messageName);
    var newStack = s.stack.stackWithNewFrame();
    newStack.declare("self", receiver);
    // TODO - declare "super" varName?
    _.each(method.argNames, function(name, i) {
      newStack.declare(name, args[i]);
    });
    return ["eval", method.methodBody, newStack];
  }
});


// Super
//   @name messageName
//   @expr* args
// TODO


// New
//   @name className
//   @expr* args
var New = ast.New = ast.Nodes["new"] = Expr.extend({
  type: "new",

  constructChildren: function(parsedAsts) {
    var args = parsedAsts[1];
    parsedAsts = parsedAsts.slice(0, 1).concat(argNames);
    this.children = this.constructAsts(parsedAsts);
  },

  updateArgs: function(s, evaledArgs, newEvaledArg) {
    if (evaledArgs.length < this.children.length) {
      return this.__super__.updateArgs.apply(this, arguments);
    } else {
      return ["done", evaledArgs[evaledArgs.length - 1]];
    };
  },

  evalSelf: function(s, evaledArgs) {
    // TODO make all of this rigorous
    var className = evaledArgs[0];
    var args = evaledArgs.slice(1);
    var instance = s.classTable.newInstance(className);
    var addr = s.heap.storeValue(instance);

    // this one will be all sorts of fun - see the note above Send
    var send = this.constructAst(["send", ...]);

    evaledArgs.push(addr); // this is hacky - can we do better?
    return ["eval", send, s.stack];
  }
});


// This
//   [none]
var This = ast.This = ast.Nodes["this"] = Expr.extend({
  type: "this"

  evalSelf: function(s, evaledArgs) {
    var addr = s.stack.valueOfVar("self");
    return ["done", addr];
  }
});


// Literal
//   [abstract]
var Literal = ast.Literal = Expr.extend({
  type: "literal",

  eval: function(s, evaledArgs) {
    return evalSelf(s, evaledArgs);
  }

  // TODO: probably there's some common stuff that goes in here
});


// Null
//   [none]
var Null = ast.Null = ast.Nodes["null"] = Literal.extend({
  type: "null"

  evalSelf: function(s, evaledArgs) {
    // TODO implement me
    return ["done", addr];
  }
});


// NumberLiteral
//   @number value
var NumberLiteral = ast.NumberLiteral = ast.Nodes["number"] = Literal.extend({
  type: "number"

  evalSelf: function(s, evaledArgs) {
    // TODO implement me
    var value = this.children[0];
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
  type: "true"

  evalSelf: function(s, evaledArgs) {
    // TODO implement me
    return ["done", addr];
  }
});


// False
//   [none]
var False = ast.False = ast.Nodes["false"] = BooleanLiteral.extend({
  type: "false"

  evalSelf: function(s, evaledArgs) {
    // TODO implement me
    return ["done", addr];
  }
});

})();