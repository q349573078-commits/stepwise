import { z } from "zod";

// planned -> plan is ready but noy yet approved
// done -> task is already executed and final result prepared
// cancelled -> in this case user rejected the flow , we stop gracefully

export const ExecutionStatus = z.enum(["planned", "done", "cancelled"]);
export type ExecutionStatus = z.infer<typeof ExecutionStatus>;

// step result
// each executed step can produce a short and human readable outcome
export const StepResult = z.object({
  step: z.string(),
  note: z.string(),
});

// state -> zod schema

export const StateSchema = z.object({
  input: z.string().min(5, "input is required"),
  steps: z.array(z.string()).optional(),
  approved: z.boolean().optional(),
  results: z.array(StepResult).optional(),
  status: ExecutionStatus.optional(),
  message: z.string().optional(),
});

export type State = z.infer<typeof StateSchema>;

// initial state helper
export function makeInitialState(input: string): State {
  return {
    input,
    status: "planned",
  };
}
