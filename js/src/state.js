(function() {

var util = OO.util;

var state = OO.state = {};


// Clock
//   [none]
var Clock = state.Clock = function() {
  this.time = 0;
  this._oldestTimeSaved = 0;
};

_.extend(Clock.prototype, {
  tick: function() {
    return this.time++;
  },

  setTime: function(time) {
    this._oldestTimeSaved = Math.max(this._oldestTimeSaved, this.time);
    this.time = time;
  },

  // the oldest time this clock has ever known. helpful for retrieving the tip
  // of an execution after going backwards in time
  oldestTimeSeen: function() {
    return Math.max(this._oldestTimeSaved, this.time);
  },

  checkpoint: function() {
    return JSON.stringify(this);
  },

  resume: function(packedData) {
    var unpackedData = JSON.parse(packedData);
    this.time = unpackedData.time;
    this._oldestTimeSaved = unpackedData._oldestTimeSaved;
  }
});


// VersionedValue
//   @expr value
//   @number time
var VersionedValue = state.VersionedValue = function(value, time) {
  this._history = [[time, value]];
};

_.extend(VersionedValue.prototype, {
  // add a value at a point in time
  setValueAtTime: function(value, time /*, clobber TODO */) {
    util.assert(util.isNumber(time), "invalid time argument");

    var snapshot = [time, value];
    var l = this._history.length;
    var insertionPoint;

    // add a fresh value to the end of history
    if (this._history[l - 1][0] < time) {
      this._history.push(snapshot);

    // add an old value to the appropriate place in history
    } else {
      insertionPoint = _.sortedIndex(this._history, snapshot, 0);
      // don't duplicate or overwrite existing history points
      if (this._history[insertionPoint][0] !== time) {
        this._history.splice(insertionPoint, 0, snapshot);
      } else {
        // error if the new value contradicts an existing value
        if (!_.isEqual(this._history[insertionPoint][1], snapshot[1])) {
          util.assert(false, "new value contradicts historical value!");
        };
      };
    };
  },

  // return the snapshot active at timepoint time;
  // return undefined if no snapshot existed
  snapshotAtTime: function(time) {
    var l = this._history.length;
    var firstIndexAfterTarget;

    // by default, return the most recent snapshot
    if (!util.isNumber(time) || this._history[l - 1][0] <= time) {
      return this._history[l - 1];

    // else, find the appropriate snapshot
    } else {
      firstIndexAfterTarget = _.sortedIndex(this._history, [time + 1, 0], 0);
      return this._history[firstIndexAfterTarget - 1];
    };
  },

  // return value at timepoint time;
  // return undefined if no value existed
  valueAtTime: function(time) {
    return this.snapshotAtTime(time)[1];
  },

  checkpoint: function() {
    var packedData = [];
    var i, currentValueType, currentValueData;
    for (i in this._history) {
      // derp derp derp derp derp
      // assume vv value is
      // 1. an address (number)
      // 2. an Instance
      // 3. classdef (array where first element is string)
      // 4. methoddef (array where first element is number)
      // 5. literal instance (need to save literal too)
      // 6. null (THIS IS REALLY BAD DESIGN, THERE SHOULD BE A BIG ERROR)
      // derp derp derp derp derp
      if(this._history[i][1] === null) {
        currentValueType = "nullobj";
        currentValueData = null;
      }
      else if(typeof this._history[i][1] === "number") {
        currentValueType = "address";
        currentValueData = this._history[i][1];
      } else if (this._history[i][1].constructor === Array) {
        if(typeof this._history[i][1][0] === "number") {
          currentValueType = "methoddef";
          currentValueData = JSON.stringify(this._history[i][1]);
        } else {
          currentValueType = "classdef";
          currentValueData = JSON.stringify(this._history[i][1]);
        }
      } else {
        currentValueType = "instance";
        currentValueData = this._history[i][1].checkpoint();
        if (this._history[i][1] instanceof LiteralInstance) {
          currentValueData.literal = this._history[i][1].literal;
        }
      }
      packedData.push([this._history[i][0], [currentValueType, currentValueData]]);
    }
    return packedData;
  },

  resume: function(packedData) {
    this._history = [];
    var i, currentValue;
    for (i in packedData) {
      switch(packedData[i][1][0]) {
        case "address":
          currentValue = packedData[i][1][1];
          break;
        case "instance":
          if (typeof packedData[i][1][1].literal !== "undefined") {
            currentValue = new LiteralInstance(packedData[i][1][1].literal);
          } else {
            currentValue = new Instance(null, null, []);
            currentValue.resume(packedData[i][1][1]);
          }
          break;
        case "nullobj":
          currentValue = null;
          break;
        default: // method / class def
          currentValue = JSON.parse(packedData[i][1][1]);
          break;
      }
      this._history.push([packedData[i][0], currentValue]);
    }
  }
});


// Heap
//   @clock clock
var Heap = state.Heap = function(clock) {
  this._clock = clock;
  this._nextAddress = 0;
  this._store = {};
};

_.extend(Heap.prototype, {
  // return address of stored value after storing value in heap
  storeValue: function(value) {
    var versioned = new VersionedValue(value, this._clock.time);
    var addr = this.nextAddress();
    this._store[addr] = versioned;
    return addr;
  },

  valueAtAddress: function(addr) {
    return this._store[addr].valueAtTime(this._clock.time);
  },

  setAddressToValue: function(addr, value) {
    this._store[addr].setValueAtTime(value, this._clock.time);
  },

  nextAddress: function() {
    return this._nextAddress++;
  },

  checkpoint: function() {
    var packedStoreData = {};
    var i;
    for (i in this._store) {
      packedStoreData[i] = this._store[i].checkpoint();
    }
    return [this._clock.checkpoint(), this._nextAddress, packedStoreData];
  },

  resume: function(packedData) {
    this._clock.resume(packedData[0]);
    this._nextAddress = packedData[1];
    this._store = {};
    var i;
    for (i in packedData[2]) {
      this._store[i] = new VersionedValue(undefined, undefined);
      this._store[i].resume(packedData[2][i]);
    }
  }
});


// Stack
//   @clock clock
//   @stack parent
var Stack = state.Stack = function(clock, parent, level) {
  this._clock = clock;
  this._parent = parent;
  this._level = level;
  this._vars = {};
};

_.extend(Stack.prototype, {
  declareVar: function(varName, addr) {
    util.assert(!this._vars.hasOwnProperty(varName),
        "var redeclaration in same stack frame is not supported");

    var versioned = new VersionedValue(addr, this._clock.time);
    this._vars[varName] = versioned;
  },

  // return value from the nearest scope that presently contains a declaration;
  // return undefined if no declaration exists
  addrOfVar: function(varName) {
    var variable = this._vars[varName];
    var localAddr = variable && variable.valueAtTime(this._clock.time);

    // return local value or bubble up
    if (localAddr !== undefined) {
      return localAddr;
    } else {
      return this._parent ? this._parent.addrOfVar(varName) : undefined;
    };
  },

  // set value in the nearest scope that presently contains a declaration;
  // error if no declaration exists
  setVarToAddr: function(varName, addr) {
    var variable = this._vars[varName];
    var localAddr = variable && variable.valueAtTime(this._clock.time);

    // set value locally or bubble up
    if (localAddr !== undefined) {
      variable.setValueAtTime(addr, this._clock.time);
    } else {
      util.assert(this._parent, "cannot set an undeclared variable");
      this._parent.setVarToAddr(varName, addr);
    };
  },

  // returns a newly-spawned child frame
  stackWithNewFrame: function() {
    return new Stack(this._clock, this, this._level + 1);
  },

  checkpoint: function() {
    var currentFrame = this;
    var packedData = [];
    var currentPackedVarsData;
    var i;
    if (typeof currentFrame !== "undefined") {
      currentPackedVarsData = {};
      for (i in currentFrame._vars) {
        currentPackedVarsData[i] = currentFrame._vars[i].checkpoint();
      }
      packedData.push([currentFrame._clock.checkpoint(), currentFrame._level, currentPackedVarsData]);
      currentFrame = currentFrame._parent;
    }
    return packedData;
  },

  resume: function(packedData) {
    var currentFrame = this;
    var currentClock, currentVars, currentParent;
    var i, j;
    for (i in packedData) {
      currentFrame._clock.resume(packedData[i][0]);
      currentFrame._level = packedData[i][1];
      currentVars = {};
      // reconstruct packed vars data
      for (j in packedData[i][2]) {
        currentVars[j] = new VersionedValue(null, null);
        currentVars[j].resume(packedData[i][2][j]);
      }
      currentFrame._vars = currentVars;
      // make a new parent if not at the end
      if(i != packedData.length - 1) {
        currentFrame._parent = new Stack(new Clock(), undefined, undefined);
        currentFrame = currentFrame._parent;
      }
    }
  }
});


// Instance
//   @clock clock
//   @string className
var Instance = state.Instance = function(clock, className, instVarNames) {
  this._clock = clock;
  this._className = className;
  this._instVars = {};
  for (var i = 0; i < instVarNames.length; i++) {
    this._instVars[instVarNames[i]] = new VersionedValue(null, this._clock.time);
  }
}

_.extend(Instance.prototype, {
  addressOfInstVar: function(instVarName) {
    util.assert(this._instVars.hasOwnProperty(instVarName));
    return this._instVars[instVarName].valueAtTime(this._clock.time);
  },

  setInstVarToAddress: function(instVarName, addr) {
    util.assert(this._instVars.hasOwnProperty(instVarName));
    this._instVars[instVarName].setValueAtTime(addr, this._clock.time);
  },

  checkpoint: function() {
    var packedVars = {};
    var i;
    for (i in this._instVars) {
      packedVars[i] = this._instVars[i].checkpoint();
    }
    var clockCheckpoint = null;
    if (this._clock !== null) {
      clockCheckpoint = this._clock.checkpoint();
    }
    return [clockCheckpoint, this._className, packedVars];
  },

  resume: function(packedData) {
    if (packedData[0] === null) {
      this._clock = null;
    } else {
      this._clock = new Clock();
      this._clock.resume(packedData[0]);
    }
    this._className = packedData[1];
    this._instVars = {};
    var i;
    for (i in packedData[2]) {
      this._instVars[i] = new VersionedValue(undefined, undefined);
      this._instVars[i].resume(packedData[2][i]);
    }
  }
});

Instance.extend = util.extendSelf;


// LiteralInstance
//   @string className
//   @JSliteral literal
var LiteralInstance = state.LiteralInstance = Instance.extend({
  constructor: function(literal) {
    var className = util.classNameForLiteral(literal);
    this.constructor.__Super__.apply(this, [null, className, []]);

    this.literal = literal;
  }
});


// ClassTable
//   @clock clock
var ClassTable = state.ClassTable = function(clock) {
  this._clock = clock;
  this._classes = {};
  this._methodTables = {};
  this._jetTables = {};

  // declare Object class
  this._classes["Object"] = new VersionedValue([undefined], this._clock.time);
  this._methodTables["Object"] = {};
};

_.extend(ClassTable.prototype, {
  declareClass: function(className, superClassName, instVarNames) {
    // every class ultimately inherits from Object
    superClassName || (superClassName = "Object");
    instVarNames || (instVarNames = []);

    var existingClassDef = this._classes[className];
    var superClass = this._classes[superClassName];
    var classDef, versioned, instVars, superInstVars;

    // forbid class redefinition and require superclass existence
    util.assert(!(existingClassDef && existingClassDef.valueAtTime(this._clock.time)),
        "class " + className + "already exists!");
    util.assert(superClass && superClass.valueAtTime(this._clock.time),
        "no class exists with name " + superClassName);
    util.assert(util.isArray(instVarNames), "instVarNames must be an array");

    // a class def is [className, instVar0, instVar1, ...]
    superInstVars = superClass.valueAtTime(this._clock.time).slice(1);
    instVars = superInstVars.concat(instVarNames);
    // TODO remove duplicates
    classDef = [superClassName].concat(instVars);
    versioned = new VersionedValue(classDef, this._clock.time);
    this._classes[className] = versioned;
    this._methodTables[className] = {};
  },

  declareMethod: function(className, methodName, argNames, astID) {
    argNames || (argNames = []);
    var existingClassDef = this._classes[className];
    var methodDef, mt;

    // require class existence
    util.assert(existingClassDef && existingClassDef.valueAtTime(this._clock.time),
        "no class exists with name " + className);
    util.assert(util.isArray(argNames), "argNames must be an array");

    // a method def is [astID, argName0, argName1, ...]
    methodDef = [astID].concat(argNames);
    mt = this._methodTables[className];
    if (mt[methodName] instanceof VersionedValue) {
      mt[methodName].setValueAtTime(methodDef, this._clock.time);
    } else {
      mt[methodName] = new VersionedValue(methodDef, this._clock.time);
    };
  },

  declareJet: function(className, methodName, jetDef) {
    var existingClassDef = this._classes[className];
    var jt;

    util.assert(existingClassDef && existingClassDef.valueAtTime(this._clock.time),
        "no class exists with name " + className);

    // create jet table; check for existence of jet
    this._jetTables.hasOwnProperty(className) || (this._jetTables[className] = {});
    jt = this._jetTables[className];
    util.assert(!jt.hasOwnProperty(methodName),
        "jet " + methodName + " of class " + className + " already exists!");

    jt[methodName] = jetDef;
  },

  newInstance: function(className) {
    // require class existence
    var existingClassDef = this._classes[className];
    util.assert(existingClassDef && existingClassDef.valueAtTime(this._clock.time),
        "no class exists with name " + className);
    var instVarNames = existingClassDef.valueAtTime(this._clock.time).slice(1);
    return new Instance(this._clock, className, instVarNames);
  },

  newLiteralInstance: function(literal) {
    return new LiteralInstance(literal);
  },

  methodOfInstanceWithName: function(instance, methodName) {
    var className = instance._className;
    var definingClass = this.classDefiningMethodOfClassWithName(className,
        methodName);
    var mt, jt, methodDecl;

    // look for a method definition
    if (definingClass) {
      // get method declaration
      mt = this._methodTables[definingClass];
      methodDecl = mt[methodName].valueAtTime(this._clock.time);
      return {astID: methodDecl[0], argNames: methodDecl.slice(1)}

    // look for a jet otherwise
    } else {
      definingClass = this.classDefiningJetOfClassWithName(className, methodName);

      // error if no method exists
      util.assert(definingClass, className + " object has no method named " +
          methodName);
      jt = this._jetTables[definingClass];
      methodDecl = jt[methodName];

      return methodDecl;
    }
  },

  // return the first class that satisfies pred, searching first on the given
  // class and then on each successive ancestor;
  // return undefined if no satisfactory class is found
  classOrFirstAncestorSuchThat: function(className, pred) {
    var thisClass = this._classes[className];
    var parentClass;

    // confirm that class exists
    util.assert(thisClass && thisClass.valueAtTime(this._clock.time),
        "no class exists with name " + className);

    var classLiteral = thisClass.valueAtTime(this._clock.time);

    // return className if pred was satisfied, else check parent class
    if (pred(className)) {
      return className;
    } else {
      parentClass = classLiteral[0];
      return (parentClass ?
          this.classOrFirstAncestorSuchThat(parentClass, pred) :
          undefined);
    };
  },

  // return the first class that defines a method for a given methodName,
  // searching first on the given class and then on its ancestors;
  // return undefined if no such class is found
  classDefiningMethodOfClassWithName: function(className, methodName) {
    var that = this;

    // return true if methodName is defined for className
    var pred = function(className) {
      var mt = that._methodTables[className];
      return mt[methodName] && mt[methodName].valueAtTime(that._clock.time);
    };

    return this.classOrFirstAncestorSuchThat(className, pred);
  },

  classDefiningJetOfClassWithName: function(className, jetName) {
    var that = this;

    // return true if jetName is defined for className
    var pred = function(className) {
      var jt = that._jetTables[className];
      return jt && jt[jetName];
    };

    return this.classOrFirstAncestorSuchThat(className, pred);
  },

  checkpoint: function() {
    var packedClasses = {};
    var i;
    for (i in this._classes) {
      packedClasses[i] = this._classes[i].checkpoint();
    }
    var packedMethods = {};
    var j;
    for (i in this._methodTables) {
      packedMethods[i] = {};
      for (j in this._methodTables[i]) {
        packedMethods[i][j] = this._methodTables[i][j].checkpoint();
      }
    }
    return [this._clock.checkpoint(), packedClasses, packedMethods];
  },

  resume: function(packedData) {
    this._clock.resume(packedData[0]);
    this._classes = {};
    var i;
    for (i in packedData[1]) {
      this._classes[i] = new VersionedValue(null, null);
      this._classes[i].resume(packedData[1][i]);
    }
    this._methodTables = {};
    var j;
    for (i in packedData[2]) {
      this._methodTables[i] = {};
      for (j in packedData[2][i]) {
        this._methodTables[i][j] = new VersionedValue(null, null);
        this._methodTables[i][j].resume(packedData[2][i][j]);
      }
    }
  }
});

})();
