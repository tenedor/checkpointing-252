(* convert OOC to C brute forcer *)
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
let set_contains vs s = VarSet.mem s vs

(* inequality expressions: purely in terms of inequalities *)
type cond = var

type asst = 
  Assign of exp
| If of cond * exp * exp

module VarMap = Map.Make(struct type t = var let compare = compare end)
type dep_map = var_set VarMap.t
let empty_map = VarMap.empty
let dep_map_get m n = VarMap.find n m
let dep_map_remove m n = VarMap.remove n m
let dep_map_choose m = VarMap.choose m
let dep_map_is_empty m = VarMap.is_empty m
let dep_map_map f m = VarMap.map f m

type asst_map = asst VarMap.t
let asst_map_get m v = VarMap.find v m
let asst_map_add m v a = VarMap.add v a m
exception DoubleDefined
let asst_map_merge m1 m2 = VarMap.merge (fun k -> fun a -> fun b ->
  match (a, b) with
    (Some a, None) -> Some a
  | (None, Some b) -> Some b
  | (Some _, Some _) -> raise DoubleDefined
  | (None, None) -> None)
  m1 m2

exception MalformedConstraints
let rec extract_ifs (c : cond) (at : Ast.inst) (af : Ast.inst) =
  match (at, af) with
    (And (Assign (v1, e1), atr), And (Assign (v2, e2), afr)) ->
    if v1 != v2 then raise MalformedConstraints
    else asst_map_add (extract_ifs c atr afr) v1 (If (c, e1, e2))
  | (Assign (v1, e1), Assign (v2, e2)) ->
    if v1 != v2 then raise MalformedConstraints
    else asst_map_add empty_map v1 (If (c, e1, e2))
  | _ -> raise MalformedConstraints

let rec extract_assts (i : Ast.inst) : asst_map =
  match i with
    Assign (v, e) -> asst_map_add empty_map v (Assign e)
  | And (i1, i2) -> asst_map_merge (extract_assts i1) (extract_assts i2)
  | Or ((And (True c1, at)), 
        (And (False c2, af))) ->
    if c1 != c2 then raise MalformedConstraints
    else extract_ifs c1 at af
  | _ -> raise MalformedConstraints

let collect_vars (a : asst) : var_set =
  let rec collect_vars_exp (e : exp) : var_set =
    match e with
      Int i -> empty_set
    | Var v -> add_var empty_set v
    | Plus (e1, e2) -> set_union (collect_vars_exp e1) (collect_vars_exp e2)
    | Half e -> collect_vars_exp e
  in
  match a with
    Assign e -> collect_vars_exp e
  | If (_, e1, e2) -> set_union (collect_vars_exp e1) (collect_vars_exp e2)

(* dep_map maps var to var_set, the list of the var's dependencies *)
(* tarjan's algorithm for topological sort *)
exception NotADag
let extract_order (d : dep_map) : var list =
  let rec visit (node : var) (avoid : var_set)
                (order : var list) (depmap : dep_map) : (var list) * dep_map =
    if set_contains avoid node then raise NotADag else
    let children = dep_map_get depmap node in
    let av = add_var avoid node in
    let (new_order, new_depmap) = List.fold_left
      (fun (ord, dep) -> fun m -> visit m (add_var av m) ord dep)
      (order, depmap)
      (set_to_list children)
    in
    (node :: new_order, dep_map_remove depmap node) 
  in
  let rec start (order : var list) (d : dep_map) : var list =
    if dep_map_is_empty d then
      order
    else
      let node, _ = dep_map_choose d in
      let new_order, new_depmap =
        visit node (add_var empty_set node) order d
      in start new_order new_depmap
  in start [] d

let rec stringify_assts (assts : asst_map) (order : var list) : string =
  match order with
    v :: rest -> let a = asst_map_get assts v in
      "int " ^ v ^ " = " ^
      (match a with
        Assign e -> (exp_tostring e)
      | If (c, e1, e2) -> c ^ "? (" ^ (exp_tostring e1) ^ ") : (" ^ (exp_tostring e2) ^ ")")
      ^ ";\n" ^ stringify_assts assts rest
  | [] -> ""

let c (i : Ast.inst) : string =
  let assts = extract_assts i in
  let deps = dep_map_map (fun e -> collect_vars e) assts in
  let order = List.rev (extract_order deps) in (* rev(toposort(dag)) ?= toposort(rev(dag)) *)
  stringify_assts assts order

