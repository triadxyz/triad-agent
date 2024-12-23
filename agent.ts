// agent.ts

// IMPORTANT - Add your API keys here. Be careful not to publish them.
process.env.OPENAI_API_KEY = "xxxx";
process.env.TAVILY_API_KEY = "xxxx";

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

// Define the ResearchState interface
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
// Define the tools for the agent to use
const tools = [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);

// Create a model and give it access to the tools
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
}).bindTools(tools);

// Define the function that determines whether to continue or not
function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1];

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.additional_kwargs.tool_calls) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user) using the special "__end__" node
  return "__end__";
}

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);
//
const question = " Answer that Question: Will $ETH hit new ATH before 2025?"
import { DateTime } from 'luxon';
// Invoke the model to analyze cryptocurrency trends and decide on market direction

    const prompt = `
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
    
    You always point the positive side of indicatores, trending people to think that the question asked could be possible

    Use technical indicators like RSI, MACD, and moving averages to support your assessments, while also considering fundamental and sentiment-driven metrics, such as institutional adoption and social media trends.

    Base your projections strictly on data from the last 30 days. Outline the most likely market direction based on historical patterns and current data, but emphasize the inherent uncertainties in market predictions to maintain a balanced and realistic perspective.

    **Instructions:**
    - Use the 'tavily_search' tool to gather recent cryptocurrency market data
    - Focus on collecting insights based on the criteria outlined above
    - If you believe you have gathered enough information, state 'I have gathered enough information and am ready to proceed.'
    - Answer the following question 
    `;

    const prompt2 = `
    Today's date is ${DateTime.now().toFormat('dd/MM/yyyy')}.

    You are **Agent Triad FLOP**, an pessimist agent trained to provide insights into the prediction market with a focus on cryptocurrency trends.
    Always start your responses with **Agent Triad FLOP:** followed by relevant market data from the past week, including:
    - Adoption rates
    - Actual Price
    - Trading volumes over the last week
    - Price action
    - Inflow and outflow trends in ETFs
    - Regulatory developments
    - Other key factors influencing the crypto space
    
    You always point the negative side of indicatores, trending people to think that the question asked could not be possible

    Use technical indicators like RSI, MACD, and moving averages to support your assessments, while also considering fundamental and sentiment-driven metrics, such as institutional adoption and social media trends.

    Base your projections strictly on data from the last 30 days. Outline the most likely market direction based on historical patterns and current data, but emphasize the inherent uncertainties in market predictions to maintain a balanced and realistic perspective.

    **Instructions:**
    - Use the 'tavily_search' tool to gather recent cryptocurrency market data
    - Focus on collecting insights based on the criteria outlined above
    - If you believe you have gathered enough information, state 'I have gathered enough information and am ready to proceed.'
    - Answer the following question 
    `;
    





// Finally, we compile it into a LangChain Runnable.
const app = workflow.compile();

// Use the agent
const finalState = await app.invoke({
  messages: [new HumanMessage(prompt + question)],
});
console.log("HYPE AGENT")
console.log(finalState.messages[finalState.messages.length - 1].content);


const finalState2 = await app.invoke({
    messages: [new HumanMessage(prompt2 + question)],
  });
  console.log("FLOP AGENT")
  console.log(finalState2.messages[finalState.messages.length - 1].content);
