(* convert OOC to AMPL *)
open Ast

exception Unimplemented

(* inequality expressions: purely in terms of inequalities *)
type exp =
  Int of int
| Var of var
| Plus of exp * exp
| Times of int * exp

(* new instruction type uses exps *)
type inst =
  Eq of exp * exp
| Leq of exp * exp
| Geq of exp * exp
| True of var
| False of var
| And of inst * inst
| Or of inst * inst

let rec exp_tostring (e : exp) : string =
  let plus_under_times (e : exp) : string =
    match e with
      Plus (e1, e2) -> "(" ^ (exp_tostring e) ^ ")"
    | _ -> exp_tostring e
  in
  match e with
    Int i -> string_of_int i
  | Var v -> v
  | Plus (e1, e2) -> (plus_under_times e1) ^ " + " ^ (plus_under_times e2)
  | Times (i, e2) -> (string_of_int i) ^ " * " ^ (exp_tostring e2)

let inst_tostring (p : inst) : string =
  let rec spaces (i : int) : string =
    if i = 0 then ""
    else " " ^ (spaces (i - 1))
  in
  let rec or_under_and margin i =
    match i with
      Or (_, _) -> "(\n" ^ (spaces (margin + 1)) ^ (indented (margin + 1) i) ^ "\n)"
    | _ -> indented margin i
  and indented (margin : int) (p : inst) =
    match p with
      Eq (e1, e2) -> (exp_tostring e1) ^ " = " ^ (exp_tostring e2)
    | Geq (e1, e2) -> (exp_tostring e1) ^ " >= " ^ (exp_tostring e2)
    | Leq (e1, e2) -> (exp_tostring e1) ^ " <= " ^ (exp_tostring e2)
    | True v -> v
    | False v -> "!" ^ v 
    | And (i1, i2) -> (or_under_and margin i1) ^ " &\n" ^ (spaces margin) ^ (or_under_and margin i2)
    | Or (i1, i2) -> (indented margin i1) ^ " | " ^ (indented margin i2)
  in (indented 0 p)

type param =
  Binary of var
| Integer of var

let param_extract p =
  match p with
    Binary v -> v
  | Integer v -> v

let param_compare v1 v2 = compare (param_extract v1) (param_extract v2)

module ParamSet = Set.Make(struct type t = param let compare = param_compare end)
type param_set = ParamSet.t
let empty_set = ParamSet.empty
let add_param ps s = ParamSet.add s ps
let remove_param ps s = 
  if ParamSet.mem s ps
  then ParamSet.remove s ps
  else ps
let set_union p1 p2 = ParamSet.union p1 p2
let set_to_list ps = ParamSet.elements ps

(* collect parameters: cp, n, k, B *)
let collect_params (i : inst) : param_set = 
  let rec collect_params_exp (e : exp) : param_set =
    match e with
      Int _ -> empty_set
    | Var v -> add_param empty_set (Integer v)
    | Plus (e1, e2) -> set_union (collect_params_exp e1) (collect_params_exp e2)
    | Times (_, e) -> collect_params_exp e
  in
  let rec collect_params_inst (i : inst) : param_set =
    match i with
      Eq (e1, e2) | Leq (e1, e2) | Geq (e1, e2) ->
        set_union (collect_params_exp e1) (collect_params_exp e2)
    | True v | False v -> add_param empty_set (Binary v)
    | And (i1, i2) | Or (i1, i2) ->
        set_union (collect_params_inst i1) (collect_params_inst i2)
  in collect_params_inst i

(* generate binary parameter declarations *)
let decl_params (p : param_set) : string = 
  let rec decl_param_list (pl : param list) : string =
    match pl with
      (Binary p) :: pr -> "var " ^ p ^ " binary;\n" ^ (decl_param_list pr)
    | (Integer p) :: pr -> "var " ^ p ^ " integer;\n" ^ (decl_param_list pr)
    | _ -> ""
  in decl_param_list (set_to_list p)

(* generate an objective clause with given checkpoint/query cost multipliers *)
let minimization (cp_km : float) (q_km : float) : string = 
  "minimize prog_cost : " ^
  (string_of_float cp_km) ^ " * n2 + " ^ (string_of_float q_km) ^ " * k2 ;\n"

(* convert instance to a set of constraints *)
let constraints (i : inst) : string = 
  let rec plus_under_times (e : exp) : string =
    match e with
      Plus (_, _) -> " ( " ^ (exp_constraint e) ^ " ) "
    | _ -> (exp_constraint e)
  and exp_constraint (e : exp) : string =
    match e with
      Int i -> string_of_int i
    | Var v -> v
    | Plus (e1, e2) -> (exp_constraint e1) ^ " + " ^ (exp_constraint e2) 
    | Times (i, e) -> (string_of_int i) ^ " * " ^ (plus_under_times e)
  in
  let rec or_under_and (i : inst) : string =
    match i with
      Or (_, _) -> " ( " ^ (inst_constraint i) ^ " ) "
    | _ -> (inst_constraint i)
  and inst_constraint (i : inst) : string =
    match i with
      Eq (e1, e2) -> " ( " ^ (exp_constraint e1) ^ " == " ^ (exp_constraint e2) ^ " ) "
    | Leq (e1, e2) -> " ( " ^ (exp_constraint e1) ^ " <= " ^ (exp_constraint e2) ^ " ) "
    | Geq (e1, e2) -> " ( " ^ (exp_constraint e1) ^ " >= " ^ (exp_constraint e2) ^ " ) "
    | True v -> " ( " ^ v ^ " == 1 )"
    | False v -> " ( " ^ v ^ " == 0 )"
    | And (i1, i2) -> " ( " ^ (or_under_and i1) ^ " and " ^ (or_under_and i2) ^ " ) \n"
    | Or (i1, i2) -> " ( " ^ (inst_constraint i1) ^ " or " ^ (inst_constraint i2) ^ " ) \n"
  in
  "subject to prog_cond : \n" ^ (inst_constraint i) ^ " ; \n"

(* contains a halving operation? *)
let rec halves (e : Ast.exp) : bool = 
  match e with
    Int i -> false
  | Var v -> false
  | Plus (e1, e2) -> (halves e1) || (halves e2)
  | Half e -> true

let rec to_ineq (i : Ast.inst) : inst =
  (* rectify inequalities by doubling appropriately *)
  let rec rectify (e : Ast.exp) : int * exp =
    match e with
      Ast.Int i -> (1, Int i)
    | Ast.Var v -> (1, Var v)
    | Ast.Plus (e1, e2) ->
      let f1, e1 = rectify e1 in
      let f2, e2 = rectify e2 in
      let fe1 = if f1 != 1 then Times (f1, e1) else e1 in
      let fe2 = if f2 != 1 then Times (f2, e2) else e2 in
      (1, Plus (fe1, fe2)) (* can distribute down if desired *)
    | Ast.Half e -> let f, e = rectify e in (2 * f, e)
  in
  match i with
    Ast.Assign (v, e) ->
    let f, rhs = rectify e in
    if f != 1 then
      let fv = Times (f, Var v) in
      And (Leq (fv, rhs),
           Geq (Plus (fv, Int 1), rhs))
    else
      Eq (Var v, rhs)
  | Ast.True v -> True v
  | Ast.False v -> False v
  | Ast.And (i1, i2) -> And ((to_ineq i1), (to_ineq i2))
  | Ast.Or (i1, i2) -> Or ((to_ineq i1), (to_ineq i2))

let ampl (i : Ast.inst) : string =
  let i = to_ineq i in
  (*prerr_endline (inst_tostring i); (* enable for AST output *) *)
  let par_decl = decl_params (collect_params i) in
  let min = (minimization 0. 1.) in
  let subj = (constraints i) in
    "### 1. PARAMETERS ###\n" ^
    par_decl ^
    "### 2. OBJECTIVE ###\n" ^
    min ^
    "### 3. CONSTRAINTS ###\n" ^
    subj

