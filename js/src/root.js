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

_.extend(OO, Backbone.Events, {
  classTable: {},

  ObjectClass: {},

  reset: function() {
    this.trigger("reset");
  }
});

})();
