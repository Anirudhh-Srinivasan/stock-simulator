# 📈 Stock Simulator

A real-time paper trading simulator built with React. Practice trading with $10,000 virtual cash using live stock prices.

## Features

- 💹 Live stock prices via Finnhub API (refreshes every 15s)
- 📊 Mini sparkline charts per stock
- 💼 Portfolio tracking with P&L
- 🕓 Transaction history
- 🤖 AI market assistant (powered by OpenRouter)
- 🔄 Reset portfolio anytime

## Stocks Available

AAPL · GOOGL · MSFT · TSLA · AMZN · NVDA · META · NFLX

## Tech Stack

- React + Vite
- Finnhub API (live prices)
- OpenRouter API (AI chatbot)
- Canvas API (sparklines)
- localStorage (portfolio persistence)

## Getting Started

1. Clone the repo
```bash
   git clone https://github.com/Anirudhh-Srinivasan/stock-simulator.git
   cd stock-simulator
```

2. Install dependencies
```bash
   npm install
```

3. Create a `.env` file in the root folder
   VITE_FINNHUB_API_KEY=your_finnhub_key
VITE_OPENROUTER_API_KEY=your_openrouter_key
4. Run the app
```bash
   npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

## Demo

> Start with $10,000 virtual cash. Buy and sell stocks at live market prices. Ask the AI assistant for market insights and trading strategies.
