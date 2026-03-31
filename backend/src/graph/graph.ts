import {
  Annotation,
  Command,
  END,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ValidateNode } from "./nodes/01_validate";
import { PlanNode } from "./nodes/02_plan";
import { approveNode } from "./nodes/03_approve";
import { executeNode } from "./nodes/04_execute";
import { finalizeNode } from "./nodes/05_finalize";
import { makeInitialState, State } from "./types";

const StateAnn = Annotation.Root({
  input: Annotation<string>,
  steps: Annotation<string[] | undefined>,
  approved: Annotation<boolean | undefined>,
  results: Annotation<Array<{ step: string; note: string }> | undefined>,
  status: Annotation<"planned" | "done" | "cancelled" | undefined>,
  message: Annotation<string | undefined>,
});

const builder = new StateGraph(StateAnn)
  .addNode("validate", ValidateNode)
  .addNode("plan", PlanNode)
  .addNode("approve", approveNode)
  .addNode("execute", executeNode)
  .addNode("finalize", finalizeNode);

builder.addEdge(START, "validate");
builder.addEdge("validate", "plan");
builder.addEdge("plan", "approve");

builder.addConditionalEdges("approve", (s: typeof StateAnn.State) => {
  return s.approved ? "execute" : "finalize";
});

builder.addEdge("execute", "finalize");
builder.addEdge("finalize", END);

const checkPointer = new MemorySaver();
const graph = builder.compile({
  checkpointer: checkPointer,
});

function createThreadId() {
  return `t_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function* streamAgentRun(input: string): AsyncGenerator<any> {
  const threadId = createThreadId();
  const config = { configurable: { thread_id: threadId } };

  yield { type: "threadId", threadId };

  const stream = await graph.stream(makeInitialState(input), config);
  let lastState: any;

  for await (const output of stream) {
    const keys = Object.keys(output);
    if (keys.includes("__interrupt__")) {
      const stateBeforeInterrupt = lastState;
      if (stateBeforeInterrupt) {
        yield {
          type: "needs_approval",
          data: { steps: stateBeforeInterrupt.steps },
        };
      }
      return;
    }

    lastState = Object.values(output)[0];
    yield { type: "state", node: keys[0], data: lastState };
  }

  yield { type: "final", data: lastState };
}

export async function* streamResumeAgentRun(args: {
  threadId: string;
  approve: boolean;
}): AsyncGenerator<any> {
  const { threadId, approve } = args;
  const config = { configurable: { thread_id: threadId } };

  const stream = await graph.stream(new Command({ resume: { approve } }), config);
  let lastState: any;

  for await (const output of stream) {
    const keys = Object.keys(output);
    if (keys.includes("__interrupt__")) {
      return; // Should not happen in resume
    }
    lastState = Object.values(output)[0];
    yield { type: "state", node: keys[0], data: lastState };
  }

  yield { type: "final", data: lastState };
}
