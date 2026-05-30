import { useState, useEffect, useRef } from 'react'
import ChatBot from './ChatBot'

function Sparkline({ history }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length < 2) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1
    const points = history.map((v, i) => ({
      x: (i / (history.length - 1)) * w,
      y: h - ((v - min) / range) * h
    }))
    const color = history[history.length - 1] >= history[0] ? '#00ff88' : '#ff4444'
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [history])
  return <canvas ref={canvasRef} width={80} height={32} />
}

function App() {
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('portfolio')
    return saved ? JSON.parse(saved) : { cash: 10000, holdings: {} }
  })
  const [prices, setPrices] = useState({})
  const [priceHistory, setPriceHistory] = useState({})
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('transactions')
    return saved ? JSON.parse(saved) : []
  })
  const [tab, setTab] = useState('market')

  const STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX']
  const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY

  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(portfolio))
  }, [portfolio])

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 15000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPrices() {
    try {
      const results = await Promise.all(
        STOCKS.map(symbol =>
          fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
            .then(r => r.json())
            .then(data => ({ symbol, price: data.c, change: +((data.dp || 0)).toFixed(2) }))
        )
      )
      const newPrices = {}
      for (const { symbol, price, change } of results) {
        if (price && price > 0) {
          newPrices[symbol] = { price: +price.toFixed(2), change }
        } else {
          // fallback to random if market closed
          newPrices[symbol] = {
            price: +(100 + Math.random() * 400).toFixed(2),
            change: +((Math.random() - 0.5) * 10).toFixed(2)
          }
        }
      }
      setPrices(newPrices)
      setPriceHistory(prev => {
        const updated = { ...prev }
        for (const symbol of STOCKS) {
          updated[symbol] = [...(prev[symbol] || []), newPrices[symbol].price].slice(-20)
        }
        return updated
      })
      setLoading(false)
    } catch (err) {
      console.error('Price fetch failed:', err)
      setLoading(false)
    }
  }

  function buyStock(symbol, qty) {
    const price = prices[symbol]?.price
    if (!price) return
    const cost = price * qty
    if (cost > portfolio.cash) return alert('Not enough cash!')
    setPortfolio(prev => ({
      cash: +(prev.cash - cost).toFixed(2),
      holdings: {
        ...prev.holdings,
        [symbol]: {
          qty: (prev.holdings[symbol]?.qty || 0) + qty,
          avgPrice: +(((prev.holdings[symbol]?.avgPrice || 0) * (prev.holdings[symbol]?.qty || 0) + cost) / ((prev.holdings[symbol]?.qty || 0) + qty)).toFixed(2)
        }
      }
    }))
    setTransactions(prev => [{
      type: 'BUY', symbol, qty, price, total: +cost.toFixed(2),
      time: new Date().toLocaleTimeString()
    }, ...prev])
  }

  function sellStock(symbol, qty) {
    const holding = portfolio.holdings[symbol]
    if (!holding || holding.qty < qty) return alert('Not enough shares!')
    const price = prices[symbol]?.price
    const proceeds = +(price * qty).toFixed(2)
    const newQty = holding.qty - qty
    setPortfolio(prev => {
      const newHoldings = { ...prev.holdings }
      if (newQty === 0) delete newHoldings[symbol]
      else newHoldings[symbol] = { ...holding, qty: newQty }
      return { cash: +(prev.cash + proceeds).toFixed(2), holdings: newHoldings }
    })
    setTransactions(prev => [{
      type: 'SELL', symbol, qty, price, total: proceeds,
      time: new Date().toLocaleTimeString()
    }, ...prev])
  }

  function resetPortfolio() {
    if (!window.confirm('Reset everything and start with $10,000?')) return
    setPortfolio({ cash: 10000, holdings: {} })
    setTransactions([])
    localStorage.removeItem('portfolio')
    localStorage.removeItem('transactions')
  }

  const totalValue = Object.entries(portfolio.holdings).reduce((sum, [symbol, h]) => {
    return sum + (prices[symbol]?.price || 0) * h.qty
  }, 0)

  const totalPnL = Object.entries(portfolio.holdings).reduce((sum, [symbol, h]) => {
    return sum + ((prices[symbol]?.price || 0) - h.avgPrice) * h.qty
  }, 0)

  const NAV_TABS = ['market', 'holdings', 'history', 'chat']

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e0e0e0', fontFamily: 'monospace', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#00ff88', fontSize: '22px', marginBottom: '4px' }}>STOCK SIMULATOR</h1>
          <p style={{ color: '#555', fontSize: '12px' }}>Live prices via Finnhub • Refreshes every 15s</p>
        </div>
        <button onClick={resetPortfolio} style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>
          RESET
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'CASH', value: `$${portfolio.cash.toLocaleString()}` },
          { label: 'HOLDINGS', value: `$${totalValue.toFixed(2)}` },
          { label: 'TOTAL VALUE', value: `$${(portfolio.cash + totalValue).toFixed(2)}` },
          { label: 'P&L', value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? '#00ff88' : '#ff4444' }
        ].map(card => (
          <div key={card.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: '#555', fontSize: '11px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: card.color || '#e0e0e0' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #222' }}>
        {NAV_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #00ff88' : '2px solid transparent',
            color: tab === t ? '#00ff88' : '#555', padding: '8px 20px', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'market' && (
        loading ? <p style={{ color: '#555' }}>Loading live prices...</p> : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {STOCKS.map(symbol => (
              <StockRow
                key={symbol}
                symbol={symbol}
                data={prices[symbol]}
                history={priceHistory[symbol] || []}
                holding={portfolio.holdings[symbol]}
                onBuy={buyStock}
                onSell={sellStock}
              />
            ))}
          </div>
        )
      )}

      {tab === 'holdings' && (
        Object.keys(portfolio.holdings).length === 0
          ? <p style={{ color: '#555' }}>No holdings yet. Buy some stocks!</p>
          : <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(portfolio.holdings).map(([symbol, h]) => {
              const current = prices[symbol]?.price || 0
              const pnl = (current - h.avgPrice) * h.qty
              return (
                <div key={symbol} style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '16px' }}>{symbol}</span>
                    <span style={{ color: '#555', fontSize: '12px', marginLeft: '12px' }}>{h.qty} shares @ avg ${h.avgPrice}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: pnl >= 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</div>
                    <div style={{ color: '#555', fontSize: '12px' }}>Current: ${current}</div>
                  </div>
                </div>
              )
            })}
          </div>
      )}

      {tab === 'history' && (
        transactions.length === 0
          ? <p style={{ color: '#555' }}>No transactions yet.</p>
          : <div style={{ display: 'grid', gap: '8px' }}>
            {transactions.map((tx, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ color: tx.type === 'BUY' ? '#00ff88' : '#ff4444', fontWeight: 'bold', fontSize: '12px', width: '36px' }}>{tx.type}</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{tx.symbol}</span>
                  <span style={{ color: '#555', fontSize: '12px' }}>{tx.qty} shares @ ${tx.price}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#e0e0e0', fontWeight: 'bold' }}>${tx.total}</div>
                  <div style={{ color: '#555', fontSize: '11px' }}>{tx.time}</div>
                </div>
              </div>
            ))}
          </div>
      )}

      {tab === 'chat' && (
        <ChatBot prices={prices} portfolio={portfolio} />
      )}
    </div>
  )
}

function StockRow({ symbol, data, history, holding, onBuy, onSell }) {
  const [qty, setQty] = useState(1)
  if (!data) return null
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '70px' }}>
        <div style={{ color: '#fff', fontWeight: 'bold' }}>{symbol}</div>
        <div style={{ color: data.change >= 0 ? '#00ff88' : '#ff4444', fontSize: '12px' }}>{data.change >= 0 ? '+' : ''}{data.change}%</div>
      </div>
      <div style={{ width: '80px' }}>
        <Sparkline history={history} />
      </div>
      <div style={{ flex: 1, fontSize: '18px', fontWeight: 'bold' }}>${data.price}</div>
      <input
        type="number" min="1" value={qty}
        onChange={e => setQty(Math.max(1, +e.target.value))}
        style={{ width: '60px', background: '#1a1a1a', border: '1px solid #333', color: '#e0e0e0', padding: '6px', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace' }}
      />
      <button onClick={() => onBuy(symbol, qty)} style={{ background: '#00ff88', color: '#000', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace' }}>BUY</button>
      <button onClick={() => onSell(symbol, qty)} disabled={!holding} style={{ background: holding ? '#ff4444' : '#222', color: holding ? '#fff' : '#555', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: holding ? 'pointer' : 'default', fontWeight: 'bold', fontFamily: 'monospace' }}>SELL</button>
    </div>
  )
}

export default App