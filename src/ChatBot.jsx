import { useState } from 'react'

function ChatBot({ prices, portfolio }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hey! Ask me anything about the market, your portfolio, or trading strategies.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const marketContext = Object.entries(prices).map(([symbol, data]) =>
      `${symbol}: $${data.price} (${data.change >= 0 ? '+' : ''}${data.change}%)`
    ).join(', ')

    const holdingsContext = Object.entries(portfolio.holdings).length > 0
      ? Object.entries(portfolio.holdings).map(([symbol, h]) =>
          `${symbol}: ${h.qty} shares @ avg $${h.avgPrice}`
        ).join(', ')
      : 'No holdings'

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Stock Simulator'
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          max_tokens: 500,
          messages: [
            {
              role: 'system',
              content: `You are a stock market assistant inside a paper trading simulator. Be concise and helpful.
Current market prices: ${marketContext}
User portfolio - Cash: $${portfolio.cash}, Holdings: ${holdingsContext}`
            },
            ...messages,
            userMsg
          ]
        })
      })
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || data.error?.message || 'Something went wrong.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error: ' + err.message }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#00ff8822' : '#1a1a1a',
            border: `1px solid ${msg.role === 'user' ? '#00ff8844' : '#222'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            maxWidth: '80%',
            fontSize: '13px',
            lineHeight: '1.6',
            color: msg.role === 'user' ? '#00ff88' : '#e0e0e0'
          }}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#555', fontSize: '13px' }}>thinking...</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder='Ask about the market, strategies, your portfolio...'
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#e0e0e0', padding: '10px 14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' }}
        />
        <button onClick={sendMessage} disabled={loading} style={{ background: '#00ff88', color: '#000', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace' }}>
          SEND
        </button>
      </div>
    </div>
  )
}

export default ChatBot