(* AST for OOC (OO constraint) language *)
type var = string

type binop = 
  Plus | Eq

type exp = 
  Int of int                          (* may in practice just be 0 or 1 *)
| Var of var                          (* n[0-9]*(_[0-9]* )* or k... or B...[varname] *)
| Plus of exp * exp                   (* z1+z2 *)
| Eq of exp * exp                     (* z1=z2 *)
| Not of exp                          (* !x *)
| Half of exp                         (* x/2 *)

(* OOC instance *)
type inst = 
  Clause of exp
| And of inst * inst                  (* S1 & S2 *)
| Or of inst * inst                   (* S1 | S2 *)

let rec exp_tostring (e : exp) : string =
  match e with
    Int i -> string_of_int i
  | Var v -> v
  | Plus (e1, e2) -> (exp_tostring e1) ^ " + " ^ (exp_tostring e2)
  | Eq (e1, e2) -> (exp_tostring e1) ^ " = " ^ (exp_tostring e2)
  | Not e -> "!(" ^ (exp_tostring e) ^ ")"
  | Half e -> "(" ^ (exp_tostring e) ^ ")/2"

let rec inst_tostring (p : inst) : string =
  let or_under_and i =
    match i with
      Or (_, _) -> "(" ^ (inst_tostring i) ^ ")"
    | _ -> inst_tostring i
  in
  match p with
    Clause e -> "(" ^ (exp_tostring e) ^ ")"
  | And (i1, i2) -> (or_under_and i1) ^ " &\n" ^ (or_under_and i2)
  | Or (i1, i2) -> (inst_tostring i1) ^ " | " ^ (inst_tostring i2)

