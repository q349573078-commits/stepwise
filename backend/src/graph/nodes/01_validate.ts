import type { State } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env } from "../../utils/env";

const IntentSchema = z.object({
  isPlanRelated: z.boolean().describe("用户输入是否与制定计划相关"),
  reason: z.string().describe("判断理由")
});

type Intent = z.infer<typeof IntentSchema>;

function makeModel() {
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    temperature: 0,
  });
}

const SYSTEM_PROMPT = "你是一个意图分类器。请判断用户的输入是否与制定计划相关。\n\n与计划相关的输入包括：\n- 制定任务计划\n- 规划执行步骤\n- 安排工作流程\n- 制定目标实现方案\n\n与计划不相关的输入包括：\n- 闲聊问候\n- 询问其他问题\n- 请求其他帮助\n\n请只返回 JSON 格式的结果。";

export async function ValidateNode(state: State): Promise<Partial<State>> {
  const raw = state.input ?? "";
  const trimInput = raw.trim();

  // lot of extra checks

  if (trimInput.length === 0) {
    return {
      status: "cancelled",
      message: "输入为空。请提供一个有效的任务来开始",
    };
  }

  // 使用 AI 模型判断意图
  const model = makeModel();
  const structured = model.withStructuredOutput(IntentSchema);

  const intentResult = await structured.invoke([
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "human",
      content: `用户输入: "${trimInput}"`,
    },
  ]);

  if (!intentResult.isPlanRelated) {
    return {
      status: "cancelled",
      message: `抱歉，我只能帮助您制定计划。${intentResult.reason || '请告诉我您想要完成的目标或需要安排的任务。'}`,
    };
  }

  const MAX = 300;
  const safeInput =
    trimInput.length > MAX ? trimInput.slice(0, MAX) + "..." : trimInput;

  return {
    input: safeInput,
  };
}
