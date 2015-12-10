(* AST for OOC (OO constraint) language *)
type var = string

type exp = 
  Int of int                          (* may in practice just be 0 or 1 *)
| Var of var                          (* n[0-9]*(_[0-9]* )* or k... or B...[varname] *)
| Plus of exp * exp                   (* z1+z2 *)
| Half of exp                         (* x/2 *)

(* OOC instance *)
type inst = 
  Assign of var * exp
| True of var
| False of var
| And of inst * inst                  (* S1 & S2 *)
| Or of inst * inst                   (* S1 | S2 *)

let rec exp_tostring (e : exp) : string =
  match e with
    Int i -> string_of_int i
  | Var v -> v
  | Plus (e1, e2) -> (exp_tostring e1) ^ " + " ^ (exp_tostring e2)
  | Half e -> "(" ^ (exp_tostring e) ^ ")/2"

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
      Assign (v, e) -> "(" ^ v ^ " = " ^ (exp_tostring e) ^ ")"
    | True v -> v
    | False v -> "!" ^ v
    | And (i1, i2) -> (or_under_and margin i1) ^ " &\n" ^ (spaces margin) ^ (or_under_and margin i2)
    | Or (i1, i2) -> (indented margin i1) ^ " | " ^ (indented margin i2)
  in (indented 0 p)
