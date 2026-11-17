// Prisma's enums are UPPER_CASE; the domain's and the contract's are
// lower_case. These convert between them and keep the literal type, so a
// value that has no counterpart on the other side is a compile error
// instead of a cast.

export const lower = <T extends string>(value: T) =>
  value.toLowerCase() as Lowercase<T>;

export const upper = <T extends string>(value: T) =>
  value.toUpperCase() as Uppercase<T>;
