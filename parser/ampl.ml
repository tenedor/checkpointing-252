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

(* inequality expressions: purely in terms of inequalities *)
type iexp =
  Int of int
| Var of var
| Plus of iexp * iexp
| Times of int * iexp
| Leq of iexp * iexp
| Geq of iexp * iexp
| Not of iexp
| Half of iexp

(* new instruction type uses iexps *)
type inst =
  Clause of iexp
| And of inst * inst
| Or of inst * inst

let rec iexp_tostring (e : iexp) : string =
  let plus_under_times (e : iexp) : string =
    match e with
      Plus (e1, e2) -> "(" ^ (iexp_tostring e) ^ ")"
    | _ -> iexp_tostring e
  in
  match e with
    Int i -> string_of_int i
  | Var v -> v
  | Plus (e1, e2) -> (plus_under_times e1) ^ " + " ^ (plus_under_times e2)
  | Times (i, e2) -> (string_of_int i) ^ " * " ^ (iexp_tostring e2)
  | Geq (e1, e2) -> (iexp_tostring e1) ^ " >= " ^ (iexp_tostring e2)
  | Leq (e1, e2) -> (iexp_tostring e1) ^ " <= " ^ (iexp_tostring e2)
  | Not e -> "!(" ^ (iexp_tostring e) ^ ")"
  | Half e -> "(" ^ (iexp_tostring e) ^ ")/2"

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
      Clause e -> "(" ^ (iexp_tostring e) ^ ")"
    | And (i1, i2) -> (or_under_and margin i1) ^ " &\n" ^ (spaces margin) ^ (or_under_and margin i2)
    | Or (i1, i2) -> (indented margin i1) ^ " | " ^ (indented margin i2)
  in (indented 0 p)

(* collect binary parameters: cp *)
let collect_params (i : inst) : var_set =
  let rec collect_params_iexp (e : iexp) : var_set =
    match e with
      Int _ -> empty_set
    | Var v -> if (String.sub v 0 2) = "cp" then add_var empty_set v else empty_set
    | Plus (e1, e2) | Leq (e1, e2) | Geq (e1, e2) ->
      set_union (collect_params_iexp e1) (collect_params_iexp e2)
    | Times (_, e) | Not e | Half e -> collect_params_iexp e
  in
  let rec collect_params_inst (i : inst) : var_set =
    match i with
      Clause e -> collect_params_iexp e
    | And (i1, i2) | Or (i1, i2) -> set_union (collect_params_inst i1) (collect_params_inst i2)
  in collect_params_inst i

(* collect variables: n, k, B *)
let collect_vars (i : inst) : var_set = 
  let rec collect_vars_iexp (e : iexp) : var_set =
    match e with
      Int _ -> empty_set
    | Var v -> let head = String.sub v 0 1 in
      if head = "n" || head = "k" || head = "B"
      then add_var empty_set v
      else empty_set
    | Plus (e1, e2) | Leq (e1, e2) | Geq (e1, e2) -> set_union (collect_vars_iexp e1) (collect_vars_iexp e2)
    | Times (_, e) | Not e | Half e -> collect_vars_iexp e
  in
  let rec collect_vars_inst (i : inst) : var_set =
    match i with
      Clause e -> collect_vars_iexp e
    | And (i1, i2) | Or (i1, i2) -> set_union (collect_vars_inst i1) (collect_vars_inst i2)
  in collect_vars_inst i

(* generate binary parameter declarations *)
let decl_params (p : var_set) : string = 
  let rec decl_param_list (pl : string list) : string =
    match pl with
      p :: pr -> "var " ^ p ^ " binary;\n" ^ (decl_param_list pr)
    | _ -> ""
  in decl_param_list (set_to_list p)

(* generate variable declarations *)
let decl_vars (v : var_set) : string =
  let rec decl_var_list (pl : string list) : string =
    match pl with
      p :: pr -> "var " ^ p ^ " integer ;\n" ^ (decl_var_list pr)
    | _ -> ""
  in decl_var_list (set_to_list v)

(* generate an objective clause with given checkpoint/query cost multipliers *)
let minimization (cp_km : float) (q_km : float) : string = 
  "minimize prog_cost : " ^
  (string_of_float cp_km) ^ " * n2 + " ^ (string_of_float q_km) ^ " * k2 ;\n"

(* contains a halving operation? *)
let rec halves (e : iexp) : bool = 
  match e with
    Int i -> false
  | Var v -> false
  | Plus (e1, e2) | Leq (e1, e2) | Geq (e1, e2) -> (halves e1) || (halves e2)
  | Times (_, e) | Not e -> halves e
  | Half e -> true

(* double the expression, distribute and simplify *)
let rec double (e : iexp) : iexp = 
  match e with
    Int i -> Int (2 * i)
  | Var v -> Times (2, e)
  | Plus (e1, e2) -> Plus (double e1, double e2)
  | Times (i, e) -> Times (2 * i, e)
  | Leq (e1, e2) -> Leq (double e1, double e2)
  | Geq (e1, e2) -> Geq (double e1, double e2)
  | Not e -> double e
  | Half e -> e

exception EncounteredDoubleHalf
exception EncounteredHalf

(* convert instance to a set of constraints *)
let constraints (i : inst) : string = 
  let rec plus_under_times (e : iexp) : string =
    match e with
      Plus (_, _) -> " ( " ^ (iexp_constraint e) ^ " ) "
    | _ -> (iexp_constraint e)
  and iexp_constraint (e : iexp) : string =
    match e with
      Int i -> string_of_int i
    | Var v -> v
    | Plus (e1, e2) -> (iexp_constraint e1) ^ " + " ^ (iexp_constraint e2) 
    | Times (i, e) -> (string_of_int i) ^ " * " ^ (plus_under_times e)
    | Leq (e1, e2) -> " ( " ^ (iexp_constraint e1) ^ " <= " ^ (iexp_constraint e2) ^ " ) "
    | Geq (e1, e2) -> " ( " ^ (iexp_constraint e1) ^ " >= " ^ (iexp_constraint e2) ^ " ) "
    | Not e -> " not ( " ^ (iexp_constraint e) ^ " ) "
    | Half e -> raise EncounteredHalf (*" ( " ^ (iexp_constraint e) ^ " )/2 "*)
  in
  let rec or_under_and (i : inst) : string =
    match i with
      Or (_, _) -> " ( " ^ (inst_constraint i) ^ " ) "
    | _ -> (inst_constraint i)
  and inst_constraint (i : inst) : string =
    match i with
      Clause e -> (iexp_constraint e) ^ "\n"
    | And (i1, i2) -> (or_under_and i1) ^ " and " ^ (or_under_and i2)
    | Or (i1, i2) -> (inst_constraint i1) ^ " or " ^ (inst_constraint i2) 
  in
  "subject to prog_cond : \n" ^ (inst_constraint i) ^ " ; \n"

exception EncounteredEq

(* rectify inequalities by doubling appropriately *)
let rec rectify_leq (l : iexp) (r : iexp) : iexp * iexp =
  if (halves l) && (halves r) then raise EncounteredDoubleHalf
  else if halves l then let r, l = rectify_geq r l in (l, r)
  else if halves r then rectify_leq (double l) (double r)
  else (l, r)
and rectify_geq (l : iexp) (r : iexp) : iexp * iexp =
  if (halves l) && (halves r) then raise EncounteredDoubleHalf
  else if halves l then let r, l = rectify_leq r l in (l, r)
  else if halves r then rectify_geq (Plus (double l, Int 1)) (double r)
  else (l, r)

let rec to_ineq (i : Ast.inst) : inst =
  let rec exp_to_ineq (e : Ast.exp) : iexp =
    match e with
      Ast.Int i -> Int i
    | Ast.Var v -> Var v
    | Ast.Plus (e1, e2) -> Plus ((exp_to_ineq e1), (exp_to_ineq e2))
    | Ast.Eq (e1, e2) -> raise EncounteredEq
    | Ast.Not e -> Not (exp_to_ineq e)
    | Ast.Half e -> Half (exp_to_ineq e)
  in
  match i with
    Ast.Clause (Eq (e1, e2)) ->
      let ie1 = exp_to_ineq e1 in
      let ie2 = exp_to_ineq e2 in
      let rl1, rl2 = rectify_leq ie1 ie2 in
      let rg1, rg2 = rectify_geq ie1 ie2 in
      And (Clause (Leq (rl1, rl2)), Clause (Geq (rg1, rg2)))
  | Ast.Clause (Var v) -> to_ineq (Clause (Ast.Eq (Ast.Var v, Ast.Int 1)))
  | Ast.Clause (Not (Var v)) -> to_ineq (Clause (Ast.Eq (Ast.Var v, Ast.Int 0)))
  | Ast.Clause e -> Clause (exp_to_ineq e)
  | Ast.And (i1, i2) -> And ((to_ineq i1), (to_ineq i2))
  | Ast.Or (i1, i2) -> Or ((to_ineq i1), (to_ineq i2))

let ampl (i : Ast.inst) : string =
  let i = to_ineq i in
  (* prerr_endline (inst_tostring i); (* enable for AST output *) *) 
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

