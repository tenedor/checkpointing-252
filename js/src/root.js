if (typeof(OO) === "undefined") {
  OO = {};
};

// tell the grammar about OO
O.OO = OO;

OO.classTable = {};
OO.ObjectClass = {};

// TODO - this introduces a cycle in the dependency graph; fix it using events
OO.reset = function() {
  this.core.reset();
  this.classes.setupNativeClasses();
};
