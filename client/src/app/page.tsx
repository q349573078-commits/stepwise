"use client";
import AgentForm from "@/components/task-agent/AgentForm";
import RunLogs from "@/components/task-agent/RunLogs";
import { approveAgent, startAgent } from "@/lib/api";
import { FinalView, InterruptView } from "@/lib/types";
import { useEffect, useReducer, useRef } from "react";

type RunLog = Map<string, any>;
type TokenLog = Map<string, string>;

interface AgentState {
  isStreaming: boolean;
  threadId: string | null;
  log: RunLog;
  tokenLog: TokenLog;
  needsApproval: InterruptView | null;
  finalState: FinalView | null;
  error: string | null;
}

const initialState: AgentState = {
  isStreaming: false,
  threadId: null,
  log: new Map(),
  tokenLog: new Map(),
  needsApproval: null,
  finalState: null,
  error: null,
};

type AgentAction =
  | { type: "STREAM_START" }
  | { type: "RECEIVE_THREAD_ID"; payload: string }
  | { type: "RECEIVE_STATE"; payload: { node: string; data: any } }
  | { type: "RECEIVE_TOKEN"; payload: { node: string; token: string } }
  | { type: "NEEDS_APPROVAL"; payload: any }
  | { type: "RECEIVE_FINAL_STATE"; payload: any }
  | { type: "STREAM_END" }
  | { type: "ERROR"; payload: string };

function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case "STREAM_START":
      return { ...initialState, isStreaming: true };
    case "RECEIVE_THREAD_ID":
      return { ...state, threadId: action.payload };
    case "RECEIVE_STATE":
      const newLog = new Map(state.log);
      newLog.set(action.payload.node, action.payload.data);
      return { ...state, log: newLog };
    case "RECEIVE_TOKEN":
      const tokenBackedLog = new Map(state.log);
      if (!tokenBackedLog.has(action.payload.node)) {
        tokenBackedLog.set(action.payload.node, {});
      }
      const newTokenLog = new Map(state.tokenLog);
      newTokenLog.set(
        action.payload.node,
        (newTokenLog.get(action.payload.node) ?? "") + action.payload.token
      );
      return { ...state, log: tokenBackedLog, tokenLog: newTokenLog };
    case "NEEDS_APPROVAL":
      return {
        ...state,
        isStreaming: false,
        needsApproval: {
          threadId: state.threadId!,
          steps: action.payload.steps,
          prompt: "Approve the generated plan to execute or reject to cancel",
        },
      };
    case "RECEIVE_FINAL_STATE":
      return { ...state, finalState: action.payload, isStreaming: false };
    case "STREAM_END":
      return { ...state, isStreaming: false };
    case "ERROR":
      return { ...state, error: action.payload, isStreaming: false };
    default:
      return state;
  }
}

export default function AgentPage() {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelStreamRef.current?.();
    };
  }, []);

  const handleStreamCallbacks = {
    onData: (chunk: any) => {
      switch (chunk.type) {
        case "threadId":
          dispatch({ type: "RECEIVE_THREAD_ID", payload: chunk.threadId });
          break;
        case "state":
          dispatch({ type: "RECEIVE_STATE", payload: chunk });
          break;
        case "token":
          dispatch({ type: "RECEIVE_TOKEN", payload: chunk });
          break;
        case "needs_approval":
          dispatch({ type: "NEEDS_APPROVAL", payload: chunk.data });
          break;
        case "final":
          dispatch({ type: "RECEIVE_FINAL_STATE", payload: chunk.data });
          break;
        case "error":
          dispatch({ type: "ERROR", payload: chunk.error });
          break;
      }
    },
    onError: (error: any) => {
      dispatch({ type: "ERROR", payload: error.message || "An unknown error occurred" });
    },
    onClose: () => {
      dispatch({ type: "STREAM_END" });
    },
  };

  function handleAgentStart(input: string) {
    cancelStreamRef.current?.();
    dispatch({ type: "STREAM_START" });
    cancelStreamRef.current = startAgent(input, handleStreamCallbacks);
  }

  function handleApproval(approve: boolean) {
    if (!state.threadId) return;
    cancelStreamRef.current?.();
    dispatch({ type: "STREAM_START" }); // Re-use start for loading state
    cancelStreamRef.current = approveAgent(
      state.threadId,
      approve,
      handleStreamCallbacks
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6 py-8">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-4xl font-bold text-black">
            StepWise
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-Powered task planning and execution with human-in-the-loop
          </p>
        </div>
        <AgentForm disabled={state.isStreaming} onStart={handleAgentStart} />
        <RunLogs
          log={state.log}
          tokenLog={state.tokenLog}
          interrupt={state.needsApproval}
          final={state.finalState}
          loading={state.isStreaming}
          onApprove={() => handleApproval(true)}
          onReject={() => handleApproval(false)}
          error={state.error}
        />
      </div>
    </main>
  );
}
