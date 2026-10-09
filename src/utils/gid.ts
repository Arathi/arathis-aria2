import { toHex } from "./bytes";
import { nextByteArray } from "./random";

export function nextGid() {
  const array = nextByteArray(8);
  return toHex(array, "", false);
}
