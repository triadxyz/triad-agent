// agent.ts

// IMPORTANT - Add your API keys here. Be careful not to publish them.

const openaiApiKey = process.env.OPENAI_API_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;



import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import express from 'express';
import cors from 'cors';
import { DateTime } from 'luxon';

const app = express();
app.use(cors({
  origin: 'https://app.triadfi.co' // Restrict access to this domain
}));

app.use(express.json());

type ResearchState = {
    company: string;
    company_keywords: string;
    exclude_keywords: string;
    report: string;
    documents: Record<string, Record<string | number, string | number>>; 
    RAG_docs: Record<string, Record<string | number, string | number>>;
    messages: Array<any>;
};

const llm = new ChatOpenAI();

const tools = [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);


const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
}).bindTools(tools);


function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1];

 
  if (lastMessage.additional_kwargs.tool_calls) {
    return "tools";
  }
  
  return "__end__";
}

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

app.post('/ask', async (req, res) => {
  const { question, additionalParam = "default" } = req.body;

  if (!question) {
    return res.status(400).send({ error: "Question is required" });
  }

  console.log("Question:", question);
  console.log("Additional Parameter:", additionalParam);

  const promptHype = `
    Today's date is ${DateTime.now().toFormat('dd/MM/yyyy')}.
    You are **Agent Triad HYPE**, an optimistic agent trained to provide insights into the prediction market with a focus on cryptocurrency trends.
    Always start your responses with **Agent Triad HYPE:** followed by relevant market data from the past week, including:
    - Adoption rates
    - Actual Price
    - Trading volumes over the last week
    - Price action
    - Inflow and outflow trends in ETFs
    - Regulatory developments
    - Other key factors influencing the crypto space
    Always provide a balanced perspective on the data.
    **Instructions:** Use the 'tavily_search' tool to gather recent cryptocurrency market data. Focus on collecting insights based on the criteria outlined above.
    Summarize the answer to the following question in a single paragraph: ${question}
  `;

  const promptFlop = `
    Today's date is ${DateTime.now().toFormat('dd/MM/yyyy')}.
    You are **Agent Triad FLOP**, a pessimistic agent trained to provide insights into the prediction market with a focus on cryptocurrency trends.
    Always start your responses with **Agent Triad FLOP:** followed by relevant market data from the past week, including:
    - Adoption rates
    - Actual Price
    - Trading volumes over the last week
    - Price action
    - Inflow and outflow trends in ETFs
    - Regulatory developments
    - Other key factors influencing the crypto space
    Always provide a negative perspective on the data.
    **Instructions:** Use the 'tavily_search' tool to gather recent cryptocurrency market data. Focus on collecting insights based on the criteria outlined above.
    Summarize the answer to the following question in a single paragraph: ${question}
  `;

  // HYPE Agent
  const finalStateHype = await workflow.compile().invoke({
    messages: [new HumanMessage(promptHype)],
  });

  console.log("HYPE AGENT Response:", finalStateHype.messages[finalStateHype.messages.length - 1].content);

  // FLOP Agent
  const finalStateFlop = await workflow.compile().invoke({
    messages: [new HumanMessage(promptFlop)],
  });

  console.log("FLOP AGENT Response:", finalStateFlop.messages[finalStateFlop.messages.length - 1].content);

  res.json({
    hypeResponse: finalStateHype.messages[finalStateHype.messages.length - 1].content,
    flopResponse: finalStateFlop.messages[finalStateFlop.messages.length - 1].content,
  });     
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



