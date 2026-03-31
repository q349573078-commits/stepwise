import { State } from "../types";
export async function approveNode(
  state: State,
  context: any
): Promise<Partial<State>> {
  if (state.status === "cancelled") return {};

  const steps = state.steps ?? [];

  if (steps.length === 0) {
    return {
      approved: true,
      message: "没有步骤需要批准；正在继续...",
    };
  }

  const interrupt = context?.interrupt as (
    payload: unknown
  ) => Promise<unknown>;

  const decision = await interrupt({
    type: "approval_request",
    steps,
  });

  let approved: boolean;

  if (
    decision &&
    typeof decision === "object" &&
    "approve" in (decision as any)
  ) {
    approved = !!(decision as any).approve;
  } else {
    approved = !!decision;
  }

  return {
    approved,
  };
}
