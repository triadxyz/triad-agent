// agent.ts
//2010
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
  origin: 'https://api.triadfi.co/' // Restrict access to this domain
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

const PromptAgent = `
    Today's date is ${DateTime.now().toFormat('dd/MM/yyyy')}.
    You are **Agent Triad**, an analytical agent trained to provide balanced insights into the prediction market with a focus on cryptocurrency trends.
    Always start your responses with two perspectives as if the agents are discussing the topic with each other:

    1. **Agent Hype:** Summarize the positive factors contributing to a favorable outcome for the question.
       - after, mock **Agent Flop** by saying something like: "Don't listen to Agent Flop, they have no idea what they're talking about!"
    2. **Agent Flop:** Summarize the negative factors contributing to an unfavorable outcome for the question.
       - after, mock **Agent Hype** by saying something like: "Ignore Agent Hype, they're overly optimistic and out of touch with reality!"

    Focus on relevant market data from the past week, including:
    - Adoption rates
    - Pay attention to the accuracy of the price on the date: ${DateTime.now().toFormat('dd/MM/yyyy')}
    - Focus on last 1 - 3 days events 
    - Trading volumes over the last week
    - Price action
    - Inflow and outflow trends in ETFs
    - Regulatory developments
    - Other key factors influencing the crypto space

    **Important:** Always ensure high accuracy when reporting the price data.
    Always provide a balanced perspective based on factual data.
    **Priority Instruction:** Use the 'tavily_search' tool to gather the ${additionalParam} price on ${DateTime.now().toFormat('dd/MM/yyyy')}
    **Instructions:** Use the 'tavily_search' tool to gather recent cryptocurrency market data in the current time. Focus on collecting insights based on the criteria outlined above.
    Summarize the answer to the following question in two sentences:

    - **Agent Hype:** Positive outlook summary.
    - **Agent Flop:** Negative outlook summary.

    Question: ${question}
`;



  //  Agent
  const finalStateHype = await workflow.compile().invoke({
    messages: [new HumanMessage(PromptAgent)],
  });

  console.log("Response:", finalStateHype.messages[finalStateHype.messages.length - 1].content);

 

 

  res.json({
    hypeResponse: finalStateHype.messages[finalStateHype.messages.length - 1].content,
  });     
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

