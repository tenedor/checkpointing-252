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
  }
});


// VersionedValue
//   @expr value
//   @number time
var VersionedValue = state.VersionedValue = function(value, time) {
  var firstSnapshot = [time, value];
  this._history = [firstSnapshot];
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
  }
});


// Stack
//   @clock clock
//   @stack parent
var Stack = state.Stack = function(clock, parent) {
  this._clock = clock;
  this._parent = parent;
  this._vars = {};
};

_.extend(Stack.prototype, {
  declareVar: function(varName, value) {
    util.assert(!this._vars.hasOwnProperty(varName),
        "var redeclaration in same stack frame is not supported");

    var versioned = new VersionedValue(value, this._clock.time);
    this._vars[varName] = versioned;
  },

  // return value from the nearest scope that presently contains a declaration;
  // return undefined if no declaration exists
  valueOfVar: function(varName) {
    var variable = this._vars[varName];
    var localValue = variable && variable.valueAtTime(this._clock.time);

    // return local value or bubble up
    if (localValue !== undefined) {
      return localValue;
    } else {
      return this._parent ? this._parent.valueOfVar(varName) : undefined;
    };
  },

  // set value in the nearest scope that presently contains a declaration;
  // error if no declaration exists
  setVarToValue: function(varName, value) {
    var variable = this._vars[varName];
    var localValue = variable && variable.valueAtTime(this._clock.time);

    // set value locally or bubble up
    if (localValue !== undefined) {
      variable.setValueAtTime(value, this._clock.time);
    } else {
      util.assert(this._parent, "cannot set an undeclared variable");
      this._parent.setVarToValue(varName, value);
    };
  },

  // returns a newly-spawned child frame
  stackWithNewFrame: function() {
    return new Stack(this._clock, this);
  }
});


// ClassTable
//   @clock clock
var ClassTable = state.ClassTable = function(clock) {
  this._clock = clock;
  this._classes = {};
  this._methodTables = {};

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
    var classDef, versioned;

    // forbid class redefinition and require superclass existence
    util.assert(!(existingClassDef && existingClassDef.valueAtTime(this._clock.time)),
        "class " + className + "already exists!");
    util.assert(superClass && superClass.valueAtTime(this._clock.time),
        "no class exists with name " + superClassName);
    util.assert(util.isArray(instVarNames), "instVarNames must be an array");

    // a class def is [className, instVar0, instVar1, ...]
    classDef = [superClassName].concat(instVarNames);
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

  newInstance: function(className) {
    // require class existence
    var existingClassDef = this._classes[className];
    util.assert(existingClassDef && existingClassDef.valueAtTime(this._clock.time),
        "no class exists with name " + className);

    return {__className__: className};
  },

  methodOfInstanceWithName: function(instance, messageName) {
    var className = instance.__className__;
    var definingClass = this.classDefiningMethodOfClassWithName(className,
        messageName);
    var mt, methodDecl;

    // confirm that a defining class exists
    util.assert(definingClass, className + " object has no method named " +
        messageName);

    // get method declaration
    mt = this._methodTables[definingClass];
    methodDecl = mt[messageName].valueAtTime(this._clock.time);

    return {astID: methodDecl[0], argNames: methodDecl.slice(1)}
  },

  // return the first class that satisfies pred, searching first on the given
  // class and then on each successive ancestor;
  // return undefined if no satisfactory class is found
  classOrFirstAncestorSuchThat: function(className, pred) {
    var class = this._classes[className];
    var parentClass;

    // confirm that class exists
    util.assert(class && class.valueAtTime(this._clock.time),
        "no class exists with name " + className);

    // return className if pred was satisfied, else check parent class
    if (pred(className)) {
      return className;
    } else {
      parentClass = class[0];
      return (parentClass ?
          this.classOrFirstAncestorSuchThat(parentClass, pred) :
          undefined);
    };
  },

  // return the first class that defines a method for a given methodName,
  // searching first on the given class and then on its ancestors;
  // return undefined if no such class is found
  classDefiningMethodOfClassWithName: function(className, messageName) {
    var that = this;

    // return true if messageName is defined for className
    var pred = function(className) {
      var mt = that._methodTables[className];
      return mt[messageName] && mt[messageName].valueAtTime(that._clock.time);
    };

    return this.classOrFirstAncestorySuchThat(className, pred);
  }
});

})();
