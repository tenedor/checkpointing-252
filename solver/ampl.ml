(* convert OOC to AMPL *)
open Ast

exception Unimplemented

module VarSet = Set.Make(struct type t = var let compare = compare end)
type var_set = VarSet.t
let empty_set = VarSet.empty
let add_var vs s = VarSet.add s vs
let remove_var vs s = 
  if VarSet.mem s vs
  then VarSet.remove s vs
  else vs
let set_union v1 v2 = VarSet.union v1 v2
let set_to_list vs = VarSet.elements vs

(* collect binary parameters: cp *)
let collect_params (i : inst) : var_set =
  let rec collect_params_exp (e : exp) : var_set =
    match e with
      Int _ -> empty_set
    | Var v -> if (String.sub v 0 2) = "cp" then add_var empty_set v else empty_set
    | Plus (e1, e2) | Eq (e1, e2) -> set_union (collect_params_exp e1) (collect_params_exp e2)
    | Not e | Half e -> collect_params_exp e
  in
  let rec collect_params_inst (i : inst) : var_set =
    match i with
      Clause e -> collect_params_exp e
    | And (i1, i2) | Or (i1, i2) -> set_union (collect_params_inst i1) (collect_params_inst i2)
  in collect_params_inst i

(* collect variables: n, k, B *)
let collect_vars (i : inst) : var_set = 
  let rec collect_vars_exp (e : exp) : var_set =
    match e with
      Int _ -> empty_set
    | Var v -> let head = String.sub v 0 1 in
      if head = "n" || head = "k" || head = "B"
      then add_var empty_set v
      else empty_set
    | Plus (e1, e2) | Eq (e1, e2) -> set_union (collect_vars_exp e1) (collect_vars_exp e2)
    | Not e | Half e -> collect_vars_exp e
  in
  let rec collect_vars_inst (i : inst) : var_set =
    match i with
      Clause e -> collect_vars_exp e
    | And (i1, i2) | Or (i1, i2) -> set_union (collect_vars_inst i1) (collect_vars_inst i2)
  in collect_vars_inst i

(* generate binary parameter declarations *)
let decl_params (p : var_set) : string = 
  let rec decl_param_list (pl : string list) : string =
    match pl with
      p :: pr -> "param " ^ p ^ " binary;\n" ^ (decl_param_list pr)
    | _ -> ""
  in decl_param_list (set_to_list p)

(* generate variable declarations *)
let decl_vars (v : var_set) : string =
  let rec decl_var_list (pl : string list) : string =
    match pl with
      p :: pr -> "var " ^ p ^ " ;\n" ^ (decl_var_list pr)
    | _ -> ""
  in decl_var_list (set_to_list v)

(* generate an objective clause with given checkpoint/query cost multipliers *)
let minimization (cp_km : float) (q_km : float) : string = 
  "minimize prog_cost : " ^
  (string_of_float cp_km) ^ " * n2 + " ^ (string_of_float q_km) ^ " * k2 ;\n"

(* convert instance to a set of constraints *)
let constraints (i : inst) : string = 
  let rec exp_constraint (e : exp) : string =
    match e with
      Int i -> string_of_int i
    | Var v -> v
    | Plus (e1, e2) -> " ( " ^ (exp_constraint e1) ^ " + " ^ (exp_constraint e2) ^ " ) "
    | Eq (e1, e2) -> " ( " ^ (exp_constraint e1) ^ " = " ^ (exp_constraint e2) ^ " ) "
    | Not e -> " ( not ( " ^ (exp_constraint e) ^ " )) "
    | Half e -> " ( ( " ^ (exp_constraint e) ^ " )/2 ) "
  in
  let rec inst_constraint (i : inst) : string =
    match i with
      Clause e -> (match e with
        Var v -> (exp_constraint (Eq (Var v, Int 1)))
      | Not (Var v) -> (exp_constraint (Eq (Var v, Int 0)))
      | _ -> exp_constraint e)
    | And (i1, i2) -> " ( " ^ (inst_constraint i1) ^ " and " ^ (inst_constraint i2) ^ " ) \n"
    | Or (i1, i2) -> " ( " ^ (inst_constraint i1) ^ " or " ^ (inst_constraint i2) ^ " ) \n"
  in
  "subject to prog_cond : \n" ^ (inst_constraint i)

let ampl (i : inst) : string =
  let par_decl = decl_params (collect_params i) in
  let var_decl = decl_vars (collect_vars i) in
  let min = (minimization 0. 1.) in
  let subj = (constraints i) in
    "### 1. PARAMETERS ###\n" ^
    par_decl ^
    "### 2. VARIABLES ###\n" ^
    var_decl ^
    "### 3. OBJECTIVE ###\n" ^
    min ^
    "### 4. CONSTRAINTS ###\n" ^
    subj

(*
(* We're going to represent memory for Fish programs using a 
 * Hashtable mapping variables to integer references. *)

let vartable = Hashtbl.create 33
  
(* Create a string hash table with initial size 33 *)
(* val vartable : int ref StringHash.hashTable = StringHash.new 33 *)

(* Lookup a variable's ref in the hash table.  If it doesn't have
 * an entry, just insert a new one in the hashtable. *)
let lookup (x:var) = 
  try (Hashtbl.find vartable x) 
  with Not_found ->
    let r = ref 0 in
    Hashtbl.add vartable x r;
    r

(* Set a variables value in the hash table -- again, if the variable
 * wasn't there previously, then we'll just insert a fresh ref. *)
let set (x:var) (i:int) : int = 
  let r = lookup x in
    r := i; i

let bool2int (b:bool):int = if b then 1 else 0

(* Evaluate a Fish expression returning an integer *)
let rec eval_exp ((e:rexp),(pos:int)) : int = 
  match e with
    Int i -> i
  | Var x -> !(lookup x)
  | Binop(e1,b,e2) ->
      let (i1,i2) = (eval_exp e1, eval_exp e2) in (
        match b with
          Plus -> i1 + i2
        | Minus -> i1 - i2
        | Times -> i1 * i2
        | Div -> i1 / i2
        | Eq -> bool2int (i1 = i2) 
        | Neq -> bool2int (i1 <> i2) 
        | Lt -> bool2int (i1 < i2)
        | Lte -> bool2int (i1 <= i2)
        | Gt -> bool2int (i1 > i2)
        | Gte -> bool2int (i1 >= i2)
      ) 
  | Not e1 -> bool2int (eval_exp e1 = 0) 
  | And(e1,e2) -> 
      if (eval_exp e1) <> 0 then eval_exp e2 else 0
  | Or(e1,e2) ->
      if (eval_exp e1) <> 0 then 1 else eval_exp e2
  | Assign(x,e1) -> set x (eval_exp e1)

(* Evaluate a fish statement.  We signal "returning" a value
 * for the program by throwing the exception Done.  *)
exception Done of int

let rec eval_stmt ((s:rstmt),(pos:int)) : unit = 
  match s with 
    Exp e -> let _ = eval_exp e in () 
  | Seq(s1,s2) -> (eval_stmt s1; eval_stmt s2)
  | If(e,s1,s2) -> 
      if (eval_exp e) <> 0 then eval_stmt s1 else eval_stmt s2
  | While(e,s1) -> eval_stmt (If(e,(Seq(s1,(s,pos)),pos),(skip,pos)),pos)
  | For(e1,e2,e3,s1) -> (
      let _ = eval_exp e1 in
      eval_stmt (While(e2, (Seq(s1,(Exp e3,pos)),pos)), pos)
    )
  | Return e -> raise (Done (eval_exp e))

exception BadProgram

let eval (p:program):int = 
  try
    (eval_stmt p; 
     print_string "Error -- program terminated without returning!\n";
     raise BadProgram
    ) with Done i -> i*)

