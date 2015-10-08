(function() {

var util = OO.util;
var core = OO.core;

var eval = OO.eval = {};

eval.evalAST = function(ast) {
  var context = {
    environment: new Environment(),
    nameOfHostClass: null
  };

  return recEval(context, ast);
};

var Environment = eval.Environment = function(parent) {
  this.parent = parent;
  this.vars = {};
};

Environment.prototype.declare = function(name, value) {
  this.vars[name] = value;
};

Environment.prototype.set = function(name, value) {
  if (this.vars.hasOwnProperty(name)) {
    this.vars[name] = value;
  } else if (!this.parent instanceof Environment) {
    throw new Error("attempt to set undeclared variable " + name);
  } else {
    this.parent.set(name, value);
  };
};

Environment.prototype.get = function(name) {
  if (this.vars.hasOwnProperty(name)) {
    return this.vars[name];
  } else if (!this.parent instanceof Environment) {
    throw new Error("attempt to get undeclared variable " + name);
  } else {
    return this.parent.get(name);
  };
};

var curriedRecEval = function(context) {
  return function(ast) {return recEval(context, ast);};
};

var getUID = (function() {
  var id = 0;
  return function() {return id++;};
})();

var ReturnObject = function(scopeUID, value) {
  this.scopeUID = scopeUID;
  this.value = value;
};

var isReturnObject = function(x) {
  return x instanceof ReturnObject;
};

var recEval = function(context, ast) {
  if (!util.isArray(ast)) {
    if (util.isJSPrimitive(ast) || util.isStrictInstance(ast) || util.isClass(ast)) {
      return ast;
    } else {
      throw new Error("Illegal AST: " + util.toString(ast));
    };
  };
  switch (ast[0]) {
    case "program":
      OO.reset();
      var sequence = ast.slice(1);
      sequence.unshift("seq");
      var scopedAST = ["scope", sequence];
      return recEval(context, scopedAST);

    case "seq":
      var asts = ast.slice(1);
      var value;
      for (var i = 0; i < asts.length; i++) {
        value = recEval(context, asts[i]);
      };
      return value;

    case "classDecl":
      var className = recEval(context, ast[1]);
      var superClassName = recEval(context, ast[2]);
      var instVarNames = ast[3].map(curriedRecEval(context));
      return core.declareClass(className, superClassName, instVarNames);

    case "methodDecl":
      var className = recEval(context, ast[1]);
      var methodName = recEval(context, ast[2]);
      var argNames = ast[3].map(curriedRecEval(context));
      argNames.unshift("self");
      var sequence = ast[4].slice(0);
      sequence.push(["return", ["null"]]);
      sequence.unshift("seq");
      var scopedAST = ["scope", sequence];

      context = {
        environment: context.environment,
        nameOfHostClass: className
      };

      var closure = function() {
        var args = Array.prototype.slice.call(arguments);
        return recEval(context, ["closure", argNames, args, scopedAST]);
      };

      return core.declareMethod(className, methodName, closure);

    case "closure":
      var argNames = ast[1].map(curriedRecEval(context));
      var args = ast[2];
      var ast = ast[3];
      
      context = {
        environment: new Environment(context.environment),
        nameOfHostClass: context.nameOfHostClass
      };

      var varDecls = ["varDecls"];
      for (var i = 0; i < argNames.length; i++) {
        varDecls.push([argNames[i], args[i]]);
      };
      recEval(context, varDecls);

      return recEval(context, ast);

    case "scope":
      var blockedAST = ["block", [], ast[1]];
      var scopeUID = getUID();

      context = {
        environment: new Environment(context.environment),
        nameOfHostClass: context.nameOfHostClass
      };
      context.environment.declare("__scopeUID__", scopeUID);

      var scopeRetVal;
      var scopeError;
      try {
        scopeRetVal = core.send(recEval(context, blockedAST), "call");
      } catch(e) {
        if (isReturnObject(e) && e.scopeUID === scopeUID) {
          scopeRetVal = e.value;
        } else {
          scopeError = {error: e};
        };
      } finally {
        if (scopeError) {
          throw scopeError.error;
        } else {
          return scopeRetVal;
        };
      };

    case "varDecls":
      for (var i = 1; i < ast.length; i++) {
        var varName = ast[i][0];
        var value = recEval(context, ast[i][1]);
        context.environment.declare(varName, value);
      };
      return;

    case "return":
      var expression = recEval(context, ast[1]);
      var scopeUID = context.environment.get("__scopeUID__");
      throw new ReturnObject(scopeUID, expression);

    case "setVar":
      var varName = ast[1];
      var value = recEval(context, ast[2]);
      return context.environment.set(varName, value);

    case "setInstVar":
      var instVarName = ast[1];
      var value = recEval(context, ast[2]);
      var self = context.environment.get("self");
      return core.setInstVar(self, instVarName, value);

    case "exprStmt":
      return recEval(context, ast[1]);

    case "null":
      return null;

    case "true":
      return true;

    case "false":
      return false;

    case "number":
      return parseFloat(ast[1]);

    case "this":
      return recEval(context, ["getVar", "self"]);

    case "getVar":
      return context.environment.get(ast[1]);

    case "getInstVar":
      var self = context.environment.get("self");
      return core.getInstVar(self, ast[1]);

    case "new":
      var className = recEval(context, ast[1]);
      var args = ast.slice(2).map(curriedRecEval(context));
      args.unshift(className);
      return core.instantiate.apply(core, args);

    case "send":
      var recv = recEval(context, ast[1]);
      var messageName = recEval(context, ast[2]);
      var args = ast.slice(3).map(curriedRecEval(context));
      args.unshift(recv, messageName);
      return core.send.apply(core, args);

    case "super":
      var superClassName = core.sendToClass(context.nameOfHostClass,
          "getSuperClass");
      var self = context.environment.get("self");
      var messageName = recEval(context, ast[1]);
      var args = ast.slice(2).map(curriedRecEval(context));
      args.unshift(superClassName, self, messageName);
      return core.superSend.apply(core, args);

    case "block":
      var argNames = ast[1].map(curriedRecEval(context));
      var sequence = ast[2].slice(0);
      sequence.unshift("seq");

      var lastIndex = sequence.length - 1;
      if (sequence[lastIndex][0] === "exprStmt") {
        sequence[lastIndex] = ["return", sequence[lastIndex]];
      };

      var closure = function() {
        var args = Array.prototype.slice.call(arguments);
        return recEval(context, ["closure", argNames, args, sequence]);
      };

      return core.instantiate("Block", closure);

    default:
      throw new Error("Illegal AST!");
  };
};

})();
