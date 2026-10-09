type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type LowerCase = "a" | "b" | "c" | "d" | "e" | "f";
type UpperCase = "A" | "B" | "C" | "D" | "E" | "F";
type Hex = Digit | LowerCase | UpperCase;

type IsHexLength<
  S extends string,
  L extends number,
  Acc extends any[] = [],
> = Acc["length"] extends L
  ? S extends ""
    ? true
    : false
  : S extends `${Hex}${infer Rest}`
    ? IsHexLength<Rest, L, [...Acc, any]>
    : false;

export type GID<T extends string = string> = IsHexLength<T, 16> extends true ? T : never;
