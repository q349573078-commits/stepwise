import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env } from "../../utils/env";
import { State } from "../types";

const NotesSchema = z.object({
  notes: z.array(z.string().min(1).max(500)).min(1).max(20),
});

type Notes = z.infer<typeof NotesSchema>;

function makeModel() {
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    temperature: 0.2,
  });
}

function createHumanPromptContent(steps: string[]) {
  const list = JSON.stringify(steps, null, 0);

  return [
    "你是一个简洁的助手。",
    '给定一个步骤列表，返回 JSON 对象 {"notes" : string[]}',
    "规则：",
    "notes.length 必须等于 steps.length",
    "每个 note 不超过300个字符",
    "纯文本，不要使用 markdown",
    "",
    `步骤 = ${list}`,
  ].join("\n");
}

export async function executeNode(state: State): Promise<Partial<State>> {
  if (!state.approved) return {};

  const steps = state.steps ?? [];
  if (steps.length === 0) return {};

  const model = makeModel();
  const structured = model.withStructuredOutput(NotesSchema);

  const out: Notes = await structured.invoke([
    {
      role: "system",
      content: "只返回符合 schema 的有效 JSON",
    },
    {
      role: "human",
      content: createHumanPromptContent(steps),
    },
  ]);

  const count = Math.min(steps.length, out.notes.length);
  const results = Array.from({ length: count }, (_, i) => ({
    step: steps[i],
    note: out.notes[i],
  }));

  return {
    results,
    status: "done",
    message: `已执行 ${results.length} 个步骤`,
  };
}
