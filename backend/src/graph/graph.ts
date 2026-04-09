import {
  Annotation,
  Command,
  END,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ValidateNode } from "./nodes/01_validate";
import internetSearchNode from "./nodes/02_search";
import { PlanNode } from "./nodes/03_plan";
import { approveNode } from "./nodes/04_approve";
import { executeNode } from "./nodes/05_execute";
import { finalizeNode } from "./nodes/06_finalize";
import { makeInitialState, State } from "./types";

type StreamChunk =
  | { type: "threadId"; threadId: string }
  | { type: "token"; node: string; token: string }
  | { type: "state"; node: string; data: Partial<State> }
  | { type: "needs_approval"; data: { steps: string[] } }
  | { type: "final"; data: Partial<State> | undefined };

const StateAnn = Annotation.Root({
  input: Annotation<string>,
  steps: Annotation<string[] | undefined>,
  approved: Annotation<boolean | undefined>,
  results: Annotation<Array<{ step: string; note: string }> | undefined>,
  status: Annotation<"planned" | "done" | "cancelled" | "searched" | undefined>,
  message: Annotation<string | undefined>,
  searchResults: Annotation<string | undefined>,
});

const builder = new StateGraph(StateAnn)
  .addNode("validate", ValidateNode)
  .addNode("search", internetSearchNode)
  .addNode("plan", PlanNode)
  .addNode("approve", approveNode)
  .addNode("execute", executeNode)
  .addNode("finalize", finalizeNode);

builder.addEdge(START, "validate");
builder.addEdge("validate", "search");
builder.addEdge("search", "plan");
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
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => extractTextFromContent(part)).join("");
  }

  if (!isRecord(content)) {
    return "";
  }

  if (typeof content.text === "string") {
    return content.text;
  }

  if (typeof content.args === "string") {
    return content.args;
  }

  return "";
}

function extractTokenText(message: unknown): string {
  if (!isRecord(message)) {
    return "";
  }

  const content = extractTextFromContent(message.content);
  if (content.length > 0) {
    return content;
  }

  return extractTextFromContent(message.contentBlocks);
}

function extractInterruptSteps(interruptData: unknown): string[] {
  if (Array.isArray(interruptData)) {
    for (const item of interruptData) {
      if (
        isRecord(item) &&
        isRecord(item.value) &&
        Array.isArray(item.value.steps)
      ) {
        return item.value.steps.filter(
          (step): step is string => typeof step === "string"
        );
      }
    }
  }

  if (isRecord(interruptData) && Array.isArray(interruptData.steps)) {
    return interruptData.steps.filter(
      (step): step is string => typeof step === "string"
    );
  }

  return [];
}

async function* streamGraphRun(
  input: State | Command,
  threadId: string
): AsyncGenerator<StreamChunk> {
  const stream = await (graph as any).stream(input as any, {
    configurable: { thread_id: threadId },
    streamMode: ["updates", "messages"],
  });
  let lastState: Partial<State> | undefined;
  let latestPlannedSteps: string[] = [];

  for await (const part of stream as AsyncIterable<[string, unknown]>) {
    const [mode, data] = part;

    if (mode === "messages" && Array.isArray(data)) {
      const [message, metadata] = data;
      const token = extractTokenText(message);
      const node =
        isRecord(metadata) && typeof metadata.langgraph_node === "string"
          ? metadata.langgraph_node
          : null;

      if (node && token.length > 0) {
        yield { type: "token", node, token };
      }
      continue;
    }

    if (mode !== "updates" || !isRecord(data)) {
      continue;
    }

    const keys = Object.keys(data);
    if (keys.includes("__interrupt__")) {
      const steps =
        extractInterruptSteps(data.__interrupt__) || latestPlannedSteps;

      if (steps.length > 0) {
        yield {
          type: "needs_approval",
          data: { steps },
        };
      }
      return;
    }

    const node = keys[0];
    const nodeData = data[node];
    if (!isRecord(nodeData)) {
      continue;
    }

    lastState = nodeData as Partial<State>;
    if (node === "plan" && Array.isArray(lastState.steps)) {
      latestPlannedSteps = lastState.steps;
    }

    yield { type: "state", node, data: lastState };
  }

  yield { type: "final", data: lastState };
}

export async function* streamAgentRun(input: string): AsyncGenerator<StreamChunk> {
  const threadId = createThreadId();

  yield { type: "threadId", threadId };

  for await (const chunk of streamGraphRun(makeInitialState(input), threadId)) {
    yield chunk;
  }
}

export async function* streamResumeAgentRun(args: {
  threadId: string;
  approve: boolean;
}): AsyncGenerator<StreamChunk> {
  const { threadId, approve } = args;

  for await (const chunk of streamGraphRun(
    new Command({ resume: { approve } }),
    threadId
  )) {
    yield chunk;
  }
}
