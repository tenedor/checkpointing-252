(function() {

var util = OO.util;

var constraints = OO.constraints = {};


/*
 Valid Language Subset

   c = Program
     | Sequence
     | If
     | While
     | Return
     | Var Declaration
     | Set Variable
     | Expression Statement

   e = Get Variable
     | Send
     | Null
     | NumberLiteral
     | StringLiteral
     | True
     | False


 Invalid Language Subset

   c = Class Declaration
     | Method Declaration
     | Set Instance Variable

   e = Get Instance Variable
     | New
     | This


 Constraint Vocabulary

   // literals
   D = nonNegInt   // %D
   s = "" | %s_%D  // %s
   p = %D%s        // %p
   x = varName     // %x
   d = 0 | 65536   // %d

   // variable bases, operators
   v = n | k | B | cp
   o = + | /2 | = | ! | & | \| | ( | )

   // constraint expressions, constraints
   z = n%p | k%p | B%p%x | %d | z1+z2 | (z)/2
   S = cp%p | !cp%p | z1=z2 | S1&S2 | (S1|S2)
*/


var VarNameExtractor = constraints.VarNameExtractor = function() {
  this.varNames = [];
};

_.extend(VarNameExtractor.prototype, {
  varNamesForProgram: function(c) {
    this.varNames = [];
    this[c.type](c);

    return _.unique(this.varNames);
  },

  program: function(c) {
    var c1 = c.children[0];
    this[c1.type](c1);
  },

  seq: function(c) {
    var that = this;
    _.each(c.children, function(c1) {that[c1.type](c1);});
  },

  if: function(c) {
    var c1 = c.children[1];
    var c2 = c.children[2];
    this[c1.type](c1);
    this[c1.type](c2);
  },

  while: function(c) {
    var c1 = c.children[1];
    this[c1.type](c1);
  },

  return: function(c) {},

  varDecls: function(c) {
    var xs = _.filter(c.children, function(_, i) {return i % 2 === 0;});
    this.varNames = this.varNames.concat(xs);
  },

  setVar: function(c) {},

  exprStmt: function(c) {}
});


var ConstraintGenerator = constraints.ConstraintGenerator = function() {
  this.varNameExtractor = new VarNameExtractor();
  this.activeVarNames = [];
  this.constraints = [];
  this.nStep = 65536; // 2^16
  this.xStep = 65536; // 2^16
  this.loopUnrollLength = 10;
  this.suffixDelimiter = "_";
};

_.extend(ConstraintGenerator.prototype, {
  constraintsForProgram: function(program) {
    util.assert(program.type === "program");

    this.activeVarNames = this.varNameExtractor.varNamesForProgram(program);
    if (this.activeVarNames.length === 0) {
      return "no variables are used in this program";
    };

    this.constraints = [];
    this["program"](program, "");

    return this.constraints.join("&");
  },

  bAtPEqualsZero: function(p) {
    var constraints = [];
    var x;
    for (i = 0; i < this.activeVarNames.length; i++) {
      x = this.activeVarNames[i];
      constraints.push("B"+p+x+"=0");
    };
    return constraints;
  },

  bAtPEqualsBAtP1: function(p, p1) {
    var constraints = [];
    var x;
    for (i = 0; i < this.activeVarNames.length; i++) {
      x = this.activeVarNames[i];
      constraints.push("B"+p+x+"=B"+p1+x);
    };
    return constraints;
  },

  bAtPEqualsBAtP1SetX: function(p, p1, x) {
    return this.bAtPEqualsBAtP1SetXs(p, p1, [x]);
  },

  bAtPEqualsBAtP1SetXs: function(p, p1, xs) {
    var constraints = [];
    var x, Bpx;
    for (i = 0; i < this.activeVarNames.length; i++) {
      x = this.activeVarNames[i];
      Bpx = (_.contains(xs, x)) ? this.xStep : "B"+p1+x;
      constraints.push("B"+p+x+"="+Bpx);
    };
    return constraints;
  },

  bAtPEqualsBavgP1P2: function(p, p1, p2) {
    var constraints = [];
    var x;
    for (i = 0; i < this.activeVarNames.length; i++) {
      x = this.activeVarNames[i];
      constraints.push("B"+p+x+"=(B"+p1+x+"+B"+p2+x+")/2");
    };
    return constraints;
  },

  bSizeAtP: function(p) {
    var sizes = [];
    var x;
    for (i = 0; i < this.activeVarNames.length; i++) {
      x = this.activeVarNames[i];
      sizes.push("B" + p + x);
    };
    return sizes.join("+");
  },

  or: function(constraints1, constraints2) {
    return ["(" + constraints1.join("&") + "|" + constraints2.join("&") + ")"];
  },

  program: function(c, s) {
    var p = c.id + s;
    var c1;

    var S = ["n"+p+"=0", "k"+p+"=0"].concat(this.bAtPEqualsZero(p));
    this.constraints = this.constraints.concat(S);

    c1 = c.children[0];
    this[c1.type](c1, p, s);
  },

  seq: function(c, _p, s) {
    var i = c.children.length;
    var c1;

    while (i > 0) {
      i--;
      c1 = c.children[i];
      _p = this[c1.type](c1, _p, s);
    };

    return _p;
  },

  if: function(c, _p, s) {
    var p = c.id + s;
    var c2 = c.children[2];
    var c1 = c.children[1];
    var p2 = this[c1.type](c2, _p, s);
    var p1 = this[c1.type](c1, _p, s);

    var navg = "(n"+p1+"+n"+p2+")/2";
    var kavg = "(k"+p1+"+k"+p2+")/2";
    var sizeBavg = "("+this.bSizeAtP(p1)+"+"+this.bSizeAtP(p2)+")/2";

    var Sk = ["k"+p+"="+kavg+"+"+sizeBavg];
    var Scp = ["cp"+p, "n"+p+"="+navg+"+"+this.nStep].concat(
        this.bAtPEqualsZero(p));
    var Sncp = ["!cp"+p, "n"+p+"="+navg].concat(
        this.bAtPEqualsBavgP1P2(p, p1, p2));

    this.constraints = this.constraints.concat(Sk, this.or(Scp, Sncp));

    return p;
  },

  // TODO
  while: function(c, _p, s) {
    var c1 = c.children[1];
    var i = this.loopUnrollLength;

    while (i > 0) {
      i--;
      _p = this[c1.type](c1, _p, s + this.suffixDelimiter + i);
    };

    return _p;
  },

  return: function(c, _p, s) {
    var p = c.id + s;
    var S = ["n"+p+"=0", "k"+p+"=0"].concat(this.bAtPEqualsZero(p));

    this.constraints = this.constraints.concat(S);

    return p;
  },

  varDecls: function(c, _p, s) {

    var p = c.id + s;
    var xs = _.filter(c.children, function(_, i) {return i % 2 === 0;});

    var Sk = ["k"+p+"=k"+_p+"+"+this.bSizeAtP(_p)];
    var Scp = ["cp"+p, "n"+p+"=n"+_p+"+"+this.nStep].concat(
        this.bAtPEqualsZero(p));
    var Sncp = ["!cp"+p, "n"+p+"=n"+_p].concat(
        this.bAtPEqualsBAtP1SetXs(p, _p, xs));

    this.constraints = this.constraints.concat(Sk, this.or(Scp, Sncp));
    console.log("constraints: " + this.constraints);

    return p;
  },

  setVar: function(c, _p, s) {
    var p = c.id + s;
    var x = c.children[0];

    var Sk = ["k"+p+"=k"+_p+"+"+this.bSizeAtP(_p)];
    var Scp = ["cp"+p, "n"+p+"=n"+_p+"+"+this.nStep].concat(
        this.bAtPEqualsZero(p));
    var Sncp = ["!cp"+p, "n"+p+"=n"+_p].concat(
        this.bAtPEqualsBAtP1SetX(p, _p, x));

    this.constraints = this.constraints.concat(Sk, this.or(Scp, Sncp));

    return p;
  },

  // it will never be favorable to checkpoint on an exprStmt, you'd always just
  // checkpoint later, so don't give the option of checkpointing here
  exprStmt: function(c, _p, s) {
    var p = c.id + s;

    var Sk = ["k"+p+"=k"+_p+"+"+this.bSizeAtP(_p)];
    var Sncp = ["!cp"+p, "n"+p+"=n"+_p].concat(this.bAtPEqualsBAtP1(p, _p));

    this.constraints = this.constraints.concat(Sk, Sncp);

    return p;
  }
});

})();
