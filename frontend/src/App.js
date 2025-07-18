import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Chatbot from './Chatbot';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('https://aichatbot.qurenote.com/api/hello')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage('Error connecting to backend.'));



      
  }, []);

  return (
    <div className="App">
      <Chatbot/>
    </div>
  );
}

export default App;
