# Triad Agent

Triad Agent is an AI-powered analytical tool designed to provide balanced insights into prediction markets. It leverages dual perspectives through Agent Hype and Agent Flop to deliver comprehensive market analysis across various sectors including cryptocurrencies, sports, gaming, entertainment, and traditional markets.

## Features

### Current Features

- **Dual Perspective Analysis**: Get both optimistic and pessimistic market viewpoints
- **Real-time Data**: Utilizes Tavily Search for up-to-date market information
- **REST API**: Easy integration with frontend applications
- **Multi-Market Support**:
  - Cryptocurrency markets
  - Sports betting
  - Gaming and esports
  - Entertainment
  - Web2 and Web3 projects
  - Traditional markets
- **Comprehensive Market Metrics**:
  - Market sentiment
  - Price action
  - Trading volumes
  - User adoption rates
  - Industry trends
  - Regulatory updates

### Upcoming Features

- **Create Market**: Implementation of market creation using Triad Protocol
- **Resolve Market**: Market resolution functionality
- **Oracle Integration**: Integration with Pyth Network for reliable price feeds

### Installation

1. Clone the repository

```bash
git clone git@github.com:triadxyz/triad-agent.git
cd triad-agent
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables
   Create a `.env` file in the root directory and add your API keys.

4. Build the project

```bash
npm run build
```

5. Run the project

```bash
npm run start
```

### Running the Server

```bash
npm run start
```

## API Documentation

### POST /ask

Submit a question for market analysis.

#### Request Body

```json
{
  "question": "What is the outlook for League of Legends World Championship viewership?",
  "additionalParam": "Esports" // Optional
}
```

#### Response Format

```json
{
  "hypeResponse": "Detailed market analysis with dual perspectives..."
}
```

### GET /ask

Alternative endpoint using query parameters.

#### Query Parameters

- `arg1`: Main question
- `arg2`: Additional parameter

#### Example

```bash
curl "http://localhost:3000/ask?arg1=Premier League prediction&arg2=Sports"
```

## Use Cases

### Sports Betting

- Match outcome predictions
- Player performance analysis
- Tournament progression forecasts

### Gaming & Esports

- Game launch success predictions
- Tournament viewership forecasts
- Player base growth analysis

### Entertainment

- Movie box office predictions
- Music chart performance
- Streaming platform competition

### Cryptocurrency

- Price movement analysis
- Protocol adoption rates
- Market sentiment tracking

### Traditional Markets

- Stock market predictions
- Commodity price analysis
- Economic indicator forecasts

## Architecture

### Components

1. **Express Server**: Handles HTTP requests and API endpoints
2. **LangChain Integration**: Manages the AI model workflow
3. **Tavily Search**: Provides real-time market data
4. **GPT-4 Model**: Processes and analyzes market information
