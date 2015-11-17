(function() {

var util = OO.util;
var state = OO.state;
var root = OO.root;

var checkpoint = OO.checkpoint = {};

// a "program state" is merely an eval manager instance

// make checkpoint from program state (an evalmanager)
var Checkpoint = checkpoint.Checkpoint = function(evalManager) {
  this.cp = evalManager.checkpoint();
};

_.extend(Checkpoint.prototype, {
// return program state (an evalmanager)
// the parsedAst is needed here because of a generally defective design
// (this is not checkpoint's fault)
  programState: function(parsedAst) {
    var eval = OO.eval;
    var pr = root.programAndRegistry(parsedAst);
    var programState = new eval.EvalManager(pr[0], pr[1]);
    programState.resume(this);
    return programState;
  },
  // get differences between this checkpoint and other
  difference: function(otherCheckpoint) {
    return;
  }
});



})();
