"use client";

import {
  CheckCircle2,
  ClipboardList,
  Globe,
  Info,
  Loader2,
  PlayCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { FinalView, InterruptView } from "@/lib/types";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useTypewriter } from "@/hooks/use-typewriter";

// A simple component that uses the typewriter hook
function Typewriter({ text, speed = 30 }: { text: string; speed?: number }) {
  const displayText = useTypewriter(text, speed);
  return <span key={text}>{displayText || text}</span>;
}

const nodeIcons: Record<string, React.ReactNode> = {
  validate: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  search: <Globe className="h-5 w-5 text-cyan-500" />,
  plan: <ClipboardList className="h-5 w-5 text-blue-500" />,
  execute: <PlayCircle className="h-5 w-5 text-indigo-500" />,
  finalize: <CheckCircle2 className="h-5 w-5 text-green-500" />,
};

const nodeTitles: Record<string, string> = {
  validate: "需求校验",
  search: "网络检索",
  plan: "生成计划",
  execute: "执行步骤",
  finalize: "总结结果",
};

function PlanInputError({ final }: { final?: FinalView | null }) {
  if (
    !final ||
    final.status !== "cancelled" ||
    !final.message ||
    !final.message.startsWith("抱歉，我只能帮助您制定计划。")
  ) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20 p-6">
      <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
      <div className="ml-4 space-y-2 flex-1">
        <AlertTitle className="text-xl font-bold text-red-800 dark:text-red-300">
          无法处理当前输入
        </AlertTitle>
        <AlertDescription className="text-lg text-red-700 dark:text-red-400 leading-relaxed">
          <Typewriter text={final.message} />
        </AlertDescription>
      </div>
    </Alert>
  );
}

// Internal component to render the log entries from the map
function LogRenderer({ log }: { log: Map<string, any> }) {
  if (log.size === 0) return null;

  const entries = Array.from(log.entries());

  return (
    <div className="space-y-6">
      {entries.map(([node, state]) => {
        if (!state) return null;
        return (
          <div key={node}>
            <h3 className="font-medium text-lg mb-3 capitalize flex items-center gap-3">
              {nodeIcons[node] || <Info className="h-5 w-5 text-gray-500" />}
              <span>{nodeTitles[node] || node}</span>
            </h3>
            {node === "search" && state.searchResults && (
              <div className="pl-8 border-l-2 border-cyan-200 dark:border-cyan-900 ml-2.5">
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  <Typewriter text={state.searchResults} />
                </p>
              </div>
            )}
            {node === "plan" && state.steps && (
              <div className="pl-8 border-l-2 border-gray-200 dark:border-gray-700 ml-2.5">
                <ol className="list-none space-y-2">
                  {state.steps.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">{i + 1}</span>
                      <span className="flex-1 pt-0.5">
                        <Typewriter text={step} />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {node === "execute" && state.results && (
              <div className="pl-8 border-l-2 border-gray-200 dark:border-gray-700 ml-2.5">
                <ul className="space-y-4">
                  {state.results.map((res: any, i: number) => (
                    <li key={i} className="text-sm">
                      <p className="font-semibold mb-1">
                        <Typewriter text={res.step} />
                      </p>
                      <p className="text-muted-foreground">
                        <Typewriter text={res.note} />
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RunLogs({
  log,
  interrupt,
  final,
  loading,
  onApprove,
  onReject,
  error,
}: {
  log: Map<string, any>;
  interrupt?: InterruptView | null;
  final?: FinalView | null;
  loading?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  error?: string | null;
}) {
  const hasContent = loading || log.size > 0 || final || interrupt || error;

  const isNonPlanInput =
    final &&
    final.status === "cancelled" &&
    final.message &&
    final.message.startsWith("抱歉，我只能帮助您制定计划。");

  if (!hasContent) {
    return (
      <Card className="mt-6 border-dashed border-gray-300 dark:border-gray-700">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Sparkles className="h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto" />
            <p className="text-lg font-medium text-muted-foreground">
              Start the agent to begin a new run
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isNonPlanInput) {
    return (
      <Card className="mt-6 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <PlanInputError final={final} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-sm">
      <CardContent className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20 p-6">
            <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="ml-4 space-y-2 flex-1">
              <AlertTitle className="text-xl font-bold text-red-800 dark:text-red-300">
                发生错误
              </AlertTitle>
              <AlertDescription className="text-lg text-red-700 dark:text-red-400 leading-relaxed">
                {error}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <LogRenderer log={log} />

        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Agent is processing...</span>
          </div>
        )}

        {interrupt && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Info className="h-5 w-5 text-blue-500" />
                Approval Required
              </CardTitle>
              <CardDescription className="text-base pt-3 pl-8">
                <Typewriter text={interrupt?.prompt ?? ""} />
              </CardDescription>
            </CardHeader>
            <div className="mt-5 flex gap-3">
              <Button onClick={onApprove} className="flex-1">
                <ThumbsUp className="mr-2 h-4 w-4" />
                Approve & Continue
              </Button>
              <Button
                variant="secondary"
                onClick={onReject}
                className="flex-1"
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject Plan
              </Button>
            </div>
          </div>
        )}

        {final && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <h3 className="font-medium text-lg mb-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Run Complete
            </h3>
            {final.message && (
              <div className="pl-8 text-muted-foreground">
                <Typewriter text={final.message} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RunLogs;
