#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const CONFIG = {
  UPSTREAM_URL: "https://perfectassistant.ai/ai/free",
  ORIGIN_URL: "https://perfectassistant.ai",
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
};

const server = new Server(
  { name: "perfect-assistant-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "ask_perfect_assistant",
      description: "【智能创作】调用 AI 进行写作。支持：周报、邮件、小红书文案、头脑风暴等。",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "你的指令" }
        },
        required: ["prompt"]
      }
    }]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "ask_perfect_assistant") {
    const prompt = request.params.arguments.prompt;
    try {
      const aiResponse = await callUpstreamAI(prompt);
      return { content: [{ type: "text", text: aiResponse }] };
    } catch (error) {
      return { content: [{ type: "text", text: "Error: " + error.message }], isError: true };
    }
  }
  throw new Error("Tool not found");
});

async function callUpstreamAI(prompt) {
  const response = await fetch(CONFIG.UPSTREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "Origin": CONFIG.ORIGIN_URL,
      "Referer": `${CONFIG.ORIGIN_URL}/iframe/brainstorm-tool`,
      "User-Agent": CONFIG.USER_AGENT,
    },
    body: JSON.stringify({
      tone: "professional", language: "chinese", text: prompt,
      chatId: crypto.randomUUID(), id: "brainstorm-tool"
    }),
  });
  const data = await response.json();
  return data.response || (data.responses && data.responses[0]) || "无内容";
}

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);