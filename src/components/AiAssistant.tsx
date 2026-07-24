import React, { useState } from 'react';

interface ChatMessage {
  sender: 'user' | 'assistant' | 'system';
  text: string;
}

interface AiAssistantProps {
  chatHistory: ChatMessage[];
  isAiLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  chatHistory,
  isAiLoading,
  onSendMessage,
}) => {
  const [chatPrompt, setChatPrompt] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim() || isAiLoading) return;

    const message = chatPrompt;
    setChatPrompt('');
    await onSendMessage(message);
  };

  return (
    <aside className="glass-card ai-panel">
      <div className="ai-header">
        <div className="ai-status-indicator"></div>
        <h3>Gemini AI Assistant</h3>
      </div>
      
      <div className="chat-history">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isAiLoading && (
          <div className="chat-bubble assistant" style={{ fontStyle: 'italic', opacity: 0.7 }}>
            AI is thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about grade levels, high GPAs..."
          value={chatPrompt}
          onChange={(e) => setChatPrompt(e.target.value)}
          disabled={isAiLoading}
        />
        <button type="submit" className="btn-primary" disabled={isAiLoading}>
          Send
        </button>
      </form>
    </aside>
  );
};
