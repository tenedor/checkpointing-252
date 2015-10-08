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

OO.classTable = {};
OO.ObjectClass = {};

// TODO - this introduces a cycle in the dependency graph; fix it using events
OO.reset = function() {
  this.core.reset();
  this.classes.setupNativeClasses();
};

})();
