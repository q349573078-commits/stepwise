import type { State } from "../types";
import { createDeepAgent } from "deepagents";
import { env } from "../../utils/env";
import {internetSearch} from "../tool/search";

function makeModel() {
  return createDeepAgent({
    model: env.OPENAI_MODEL,
    tools: [internetSearch as any],
    systemPrompt: SYSTEM_PROMPT,
  });
}
const SYSTEM_PROMPT = "你是一个网络搜索助手。请根据用户的输入进行网络搜索。搜索后总结搜索到的内容。你需要自行判断为了达成用户的目标，你需要搜索哪些内容。";
   
function userPrompt(input: string) {
    return `用户目标: "${input}"。请根据用户的输入进行网络搜索。搜索后总结搜索到的内容，请返回符合JSON schema的结果。`;
}
export default async function internetSearchNode(state: State): Promise<Partial<State>> {
    const model = makeModel();
    async function callSearch(prompt: string) {
      return await model.invoke({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
    }
    const res = await callSearch(userPrompt(state.input));
    const searchResults = res.messages[res.messages.length - 1].content as string;    
    return {
        searchResults,
        status: "searched",
    }   
}
