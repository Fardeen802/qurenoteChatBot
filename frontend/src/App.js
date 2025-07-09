import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Chatbot from './Chatbot';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/hello')
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
