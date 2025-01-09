import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import express, { Request, Response } from "express";
import cors from "cors";
import { DateTime } from "luxon";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PriceServiceConnection } from '@pythnetwork/price-service-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const openaiApiKey = process.env.OPENAI_API_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;

const connection = new PriceServiceConnection("https://hermes.pyth.network");
const app = express();

app.use(
  cors({
    origin: "https://api.triadfi.co/",
  })
);

app.use(express.json());

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
  console.log("Model Input State:", state);
  const response = await model.invoke(state.messages);
  console.log("Model Response:", response);
  return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Function to format the price
function formatPrice(priceData: { price: string, expo: number }) {
  // Converte o preço para um número
  const price = parseInt(priceData.price, 10);

  // Calcula a posição da vírgula (casas decimais)
  const decimals = Math.abs(priceData.expo);

  // Divide o preço pela potência de 10 que é determinada pelo expo
  const formattedPrice = (price / Math.pow(10, decimals)).toFixed(decimals);

  return formattedPrice;
}

// Load prompt dynamically for the specified agent
function loadPrompt(agent: string, question: string, date: string, market: string | null = null, ticker: string | null = null, currentPrices: any = null) {
  const agentFilePath = path.join(__dirname, "Crew", `${agent}.txt`);
  console.log("Loading Prompt from:", agentFilePath);

  if (!fs.existsSync(agentFilePath)) {
    throw new Error(`Agent configuration file not found: ${agentFilePath}`);
  }

  let agentPromptTemplate = fs.readFileSync(agentFilePath, "utf-8");
  console.log("Loaded Prompt Template:", agentPromptTemplate);

  agentPromptTemplate = agentPromptTemplate
    .replace(/{{DATE}}/g, date)
    .replace(/{{QUESTION}}/g, question);

  if (ticker) {
    agentPromptTemplate = agentPromptTemplate.replace(/{{TICKER}}/g, ticker);
  }

  if (market) {
    agentPromptTemplate = agentPromptTemplate.replace(/{{MARKET}}/g, market);
  }

  if (currentPrices) {
    // Substitua o marcador de preços pelo valor formatado da primeira cotação
    const formattedPrice = currentPrices[0]?.formattedPrice || 'N/A';
    agentPromptTemplate = agentPromptTemplate.replace(/{{formattedPrice}}/g, formattedPrice);
  }

  return agentPromptTemplate;
}

async function getMarketId(market: string): Promise<string | null> {
  const mercadosFilePath = path.join(__dirname, "Crew", "mercados_ID.txt");
  console.log("Loading Market IDs from:", mercadosFilePath);

  if (!fs.existsSync(mercadosFilePath)) {
    throw new Error(`Market ID file not found: ${mercadosFilePath}`);
  }

  const fileContent = fs.readFileSync(mercadosFilePath, "utf-8");
  const lines = fileContent.split("\n");

  let marketId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === market) {
      marketId = lines[i + 1]?.trim() || null;
      break;
    }
  }

  return marketId;
}

app.post("/ask", async (req: Request, res: Response) => {
  const { question, agent, ticker } = req.body;

  if (!question || !agent) {
    console.log("Validation Error: Missing question or agent");
    return res.status(400).send({ error: "Question and Agent are required" });
  }

  try {
    const currentDate = DateTime.now().toFormat("dd/MM/yyyy");

    console.log("Question:", question);
    console.log("Agent:", agent);
    console.log("Date:", currentDate);

    let market = null;
    let currentPrices = null;

    if (ticker) {
      market = `Crypto.${ticker}/USD`;
      console.log("Market:", market);

      const marketId = await getMarketId(market);
      if (!marketId) {
        throw new Error(`Market ID for ${market} not found`);
      }

      console.log("Market ID:", marketId);

      // Get the current prices from Pyth network
      currentPrices = await connection.getLatestPriceFeeds([marketId]);
      console.log("Current Prices:", currentPrices);

      // Process the first price feed
      const priceFeed = currentPrices[0];
      const priceData = priceFeed?.price;

      // Format the price using the expo field
      const formattedPrice = formatPrice(priceData);
      console.log("Formatted Price:", formattedPrice);

      // Add formatted price to currentPrices for response
      currentPrices[0].formattedPrice = formattedPrice;
    }

    // Load the prompt (with or without the market and ticker)
    const prompt = loadPrompt(agent, question, currentDate, market, ticker, currentPrices);
    console.log("Final Prompt Sent to Model:", prompt);

    // Pass the prompt to the agent
    const finalState = await workflow.compile().invoke({
      messages: [new HumanMessage(prompt)],
    });

    console.log(
      "Response:",
      finalState.messages[finalState.messages.length - 1].content
    );

    res.json({
      response:
        finalState.messages[finalState.messages.length - 1].content,
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
