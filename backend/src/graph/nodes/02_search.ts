import type { State } from "../types";
import { createDeepAgent } from "deepagents";
import type { RunnableConfig } from "@langchain/core/runnables";
import { env } from "../../utils/env";
import { internetSearch } from "../tool/search";

function makeModel() {
  return createDeepAgent({
    model: env.OPENAI_MODEL,
    tools: [internetSearch as any],
    systemPrompt: SYSTEM_PROMPT,
  });
}
const SYSTEM_PROMPT = `你是一个研究助手。分析用户目标，决定需要搜索哪些问题。你可以进行多次搜索，每次搜索后评估是否需要更多信息。当收集到足够信息时，返回 "SEARCH_COMPLETE"。`;

function userPrompt(input: string) {
  return `用户目标: "${input}"。请根据用户的输入进行网络搜索。搜索后总结搜索到的内容，请返回符合JSON schema的结果。`;
}
export default async function internetSearchNode(
  state: State,
  config?: RunnableConfig
): Promise<Partial<State>> {
  const model = makeModel();
  async function callSearch(prompt: string) {
    return await model.invoke({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }, config);
  }
  const res = await callSearch(userPrompt(state.input));
  const searchResults = res.messages[res.messages.length - 1].content as string;
  return {
    searchResults,
    status: "searched",
  }
}
