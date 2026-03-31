import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env } from "../../utils/env";
import { State } from "../types";

const PlanSchema = z.object({
  steps: z
    .array(z.string().min(3, "每个步骤至少3个字符"))
    .max(150, "每个步骤保持简洁")
    .min(1)
    .max(10),
});

type Plan = z.infer<typeof PlanSchema>;

function makeModel() {
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    temperature: 0.2,
  });
}

const SYSTEM = "你是一个乐于助人的规划师。你的唯一任务是帮助用户制定具体的执行计划。\n\n如果用户的输入是制定计划的目标，请返回符合JSON schema的结果。步骤要具体、可操作，并且对初学者友好。";

function userPrompt(input: string) {
  return `用户目标: "${input}"。请制定一个包含3-5个步骤的小计划，每个步骤都是一个短句。`;
}

function takeFirstN(arr: string[], n = 5): string[] {
  return Array.isArray(arr) ? arr.slice(0, Math.max(0, n)) : [];
}

export async function PlanNode(state: State): Promise<Partial<State>> {
  if (state.status === "cancelled") return {};

  const model = makeModel();

  const structured = model.withStructuredOutput(PlanSchema);

  const plan = await structured.invoke([
    {
      role: "system",
      content: SYSTEM,
    },

    {
      role: "human",
      content: userPrompt(state.input),
    },
  ]);

  const steps = takeFirstN(plan.steps, 5);

  return { steps, status: "planned" };
}
