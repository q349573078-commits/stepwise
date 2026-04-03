import { State } from "../types";

export async function finalizeNode(state: State): Promise<Partial<State>> {
  const approved = state.approved ?? false;
  const results = state.results ?? [];
  const steps = state.steps ?? [];
  const currentStatus = state.status;

  let status: State["status"];

  if (currentStatus === "cancelled" || approved === false) {
    status = "cancelled";
  } else {
    status = "done";
  }

  let message: string;
  if (status === "cancelled") {
    message =
      state.message ??
      (steps.length
        ? "用户拒绝了计划。未执行任何操作"
        : "在开始前已取消");
  } else {
    message =
      state.message ??
      (results.length
        ? `已完成 ${results.length} 个步骤`
        : steps.length
          ? "计划已批准。未生成执行备注"
          : "已完成");
  }

  return {
    status,
    message,
    steps,
    results,
  };
}
