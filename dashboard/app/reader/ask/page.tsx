'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '../../../components/Header';
import CitationRadar from '../../../components/CitationRadar';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  citations?: any[];
  payments?: any[];
}

export default function ReaderAsk() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am your knowledge assistant. I can answer questions using the articles I have autonomously purchased and indexed in my vector store. Try asking about "nanopayments" or "zero knowledge proofs" to witness citation tolls in action!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentAddress, setAgentAddress] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3002';

  const getUserId = () => {
    // Tie identity to EOA wallet if connected, supporting cross-device recovery
    const connectedAddr = localStorage.getItem('inktoll_connected_address');
    if (connectedAddr) {
      return connectedAddr.toLowerCase();
    }
    let id = localStorage.getItem('inktoll_user_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('inktoll_user_id', id);
    }
    return id;
  };

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch(`${AGENT_URL}/api/agent/status`, {
          headers: { 'x-user-id': getUserId() }
        });
        if (res.ok) {
          const data = await res.json();
          setAgentAddress(data.address);
        }
      } catch (err) {
        console.warn('Agent offline');
      }
    };
    fetchWallet();

    const handleWalletChange = () => {
      fetchWallet();
    };

    window.addEventListener('wallet-changed', handleWalletChange);
    return () => window.removeEventListener('wallet-changed', handleWalletChange);
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setLoading(true);

    // Append user message
    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userText }]);

    try {
      const res = await fetch(`${AGENT_URL}/api/agent/ask`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': getUserId() 
        },
        body: JSON.stringify({ question: userText }),
      });

      if (!res.ok) {
        throw new Error('Agent failed to respond');
      }

      const data = await res.json();

      // Append agent response
      const agentMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: agentMsgId,
        sender: 'agent',
        text: data.answer,
        citations: data.citations,
        payments: data.payments
      }]);
    } catch (err: any) {
      const agentMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: agentMsgId,
        sender: 'agent',
        text: `Error: Could not retrieve answer from AI agent. Make sure the agent microservice is running on port 3002. Detail: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main style={{ padding: '3rem 0' }}>
        <div className="container" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h2>⚜️ Ask the AI Agent</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Ask questions grounded in the agent's purchased knowledge. Every time a source is cited, a Citation Toll is triggered to the author.
            </p>
            {agentAddress && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Paying from Agent Wallet: <code>{agentAddress}</code>
              </span>
            )}
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            
            {/* Chat Messages */}
            <div className="chat-container" style={{ height: '450px' }}>
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'}`}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  <div>{msg.text}</div>

                  {/* CITATIONS & TOLL PAYMENTS DISPLAY */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', width: '100%' }}>
                      <CitationRadar 
                        citations={msg.citations.map((c: any) => ({
                          title: c.title,
                          similarity: c.similarity,
                          amount: 0.0001
                        }))} 
                      />
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'var(--primary-glow)', 
                        border: '1px solid var(--primary-glow)', 
                        borderRadius: '8px',
                        fontSize: '0.85rem' 
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                          <span>⚜️</span> CITATION TOLLS TRANSACTION DETAILS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {msg.citations.map((cit: any, index: number) => {
                            const payment = msg.payments?.find(p => p.title === cit.title);
                            return (
                              <div key={index} style={{ borderBottom: index < msg.citations!.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '0.25rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  Source: "{cit.title}"
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                  <span>Similarity Score: {(cit.similarity * 100).toFixed(1)}%</span>
                                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Toll Paid: +$0.0001 USDC</span>
                                </div>
                                {payment?.success && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                                    Arc Tx: {payment.txHash.substring(0, 24)}...
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ))}
              {loading && (
                <div className="chat-bubble chat-bubble-agent" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="status-dot pulsing"></div>
                  Agent is retrieving vectors and formulating answer...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flexGrow: 1, marginBottom: 0 }}
                placeholder="Ask about agent payments, privacy in DeFi, zero knowledge proofs..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Send Query
              </button>
            </form>
          </div>

        </div>
      </main>
    </>
  );
}
