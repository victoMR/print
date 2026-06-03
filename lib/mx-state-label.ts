import { MX_STATES } from "./mx-states";

export function mxStateLabel(code: string): string {
  return MX_STATES.find((s) => s.code === code)?.name ?? code;
}
