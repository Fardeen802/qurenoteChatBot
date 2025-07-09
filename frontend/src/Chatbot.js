import React, { useState, useRef, useEffect } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your assistant. How can I help you today?", sender: 'bot', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const getBackendResponse = async (userMessage) => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const responses = [
      "That's an interesting question! Let me think about that.",
      "I understand what you're asking. Here's what I think...",
      "Great point! I'd be happy to help with that.",
      "Thanks for sharing that with me. Here's my response:",
      "I see what you mean. Let me provide some insight on that.",
      "That's a good observation. Here's how I would approach it:",
      "Interesting! I have some thoughts on that topic.",
      "I appreciate you asking. Here's what I can tell you:",
      "That's something I can definitely help with!",
      "Let me give you a detailed response to that question."
    ];

    let response = await fetch("http://localhost:5000/api/hello",{
        method:"POST",
        body:JSON.stringify({
            sessionId:Date.now(),
            userMessage:userMessage
        }),
        headers:{
            'Content-type':"appplication/json"
        }
    })

    
    response=await response.json();

    console.log("Response from backend",response);
    
    
    return response.message;
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    
    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    
    try {
      // Simulate backend API call
      const response = await getBackendResponse(inputText);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Chat Assistant</h2>
        <div style={styles.status}>
          <div style={styles.statusDot}></div>
          Online
        </div>
      </div>
      
      <div style={styles.messagesContainer}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              ...styles.messageWrapper,
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                ...styles.message,
                ...(message.sender === 'user' ? styles.userMessage : styles.botMessage)
              }}
            >
              <div style={styles.messageText}>{message.text}</div>
              <div style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div style={styles.messageWrapper}>
            <div style={{...styles.message, ...styles.botMessage}}>
              <div style={styles.typingIndicator}>
                <span style={styles.typingDot}></span>
                <span style={styles.typingDot}></span>
                <span style={styles.typingDot}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={styles.input}
          disabled={isTyping}
        />
        <button
          onClick={sendMessage}
          disabled={isTyping || inputText.trim() === ''}
          style={{
            ...styles.sendButton,
            ...(isTyping || inputText.trim() === '' ? styles.sendButtonDisabled : {})
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '85vh',
    maxWidth: '500px',
    margin: '20px auto',
    border: '1px solid #ddd',
    borderRadius: '10px',
    backgroundColor: '#fff',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  header: {
    padding: '15px 20px',
    backgroundColor: '#4f46e5',
    color: 'white',
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    gap: '8px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'pulse 2s infinite'
  },
  messagesContainer: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#f9fafb'
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '15px'
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '18px',
    wordWrap: 'break-word'
  },
  userMessage: {
    backgroundColor: '#4f46e5',
    color: 'white',
    borderBottomRightRadius: '6px'
  },
  botMessage: {
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #e5e7eb',
    borderBottomLeftRadius: '6px'
  },
  messageText: {
    marginBottom: '4px',
    lineHeight: '1.4',
    textAlign:"left"
  },
  timestamp: {
    fontSize: '11px',
    opacity: 0.7,
    textAlign: 'right'
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#9ca3af',
    animation: 'bounce 1.4s infinite ease-in-out'
  },
  inputContainer: {
    display: 'flex',
    padding: '15px 20px',
    backgroundColor: '#fff',
    borderTop: '1px solid #e5e7eb',
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '20px',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: '#f9fafb'
  },
  sendButton: {
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  
  .typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-dot:nth-child(2) { animation-delay: -0.16s; }
`;
document.head.appendChild(styleSheet);

export default Chatbot;