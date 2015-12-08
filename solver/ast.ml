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
