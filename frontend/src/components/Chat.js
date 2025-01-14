import React, { useState, useEffect } from 'react';
import { signup, login, logout } from '../services/authService';
import io from 'socket.io-client';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('jwt')
  );
  const [currUser, setCurrUser] = useState('')

  // Load chat history from localStorage on component mount
  useEffect(() => {
    if (isAuthenticated) {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    }
  }, [isAuthenticated]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const jwt = localStorage.getItem('jwt');

      const socketConnection = io('http://localhost:1337', {
        query: { token: jwt },
        transports: ['websocket'],
      });

      socketConnection.on('connect', () => {
        console.log('WebSocket connection established');
      });

      socketConnection.on('welcome', (data) => {
        console.log(data.text);
      });

      socketConnection.on('userList', (data) => {
        const filteredUsers = data.users.filter(user => user.id !== socketConnection.user?.id);
        setUsers(filteredUsers);
        
        if (!selectedUserId && filteredUsers.length > 0) {
          setSelectedUserId(filteredUsers[0].id);
        }
      });

      socketConnection.on('message', (data) => {
        setChatHistory((prev) => [...prev, {
          user: data.senderId === socketConnection.user?.id ? 'Me' : data.senderUsername,
          text: data.text,
          senderId: data.senderId,
          recipientId: data.recipientId,
          timestamp: data.timestamp
        }]);
      });

      socketConnection.on('messageError', (data) => {
        console.error('Message error:', data.error);
      });

      setSocket(socketConnection);

      return () => {
        socketConnection.disconnect();
      };
    }
  }, [isAuthenticated]);

  const handleSignup = async () => {
    try {
      const data = await signup(username, email, password);
      localStorage.setItem('jwt', data.jwt);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const data = await login(email, password);
      console.log(data.user.username)
      setCurrUser(data.user.username)
      localStorage.setItem('jwt', data.jwt);
      setIsAuthenticated(true);
      
      // Load chat history after successful login
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => {
    // Save chat history before logging out
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
    
    logout();
    setIsAuthenticated(false);
    if (socket) socket.disconnect();
    setUsers([]);
    setSelectedUserId(null);
    // Don't clear chatHistory here, so it persists for next login
    setChatHistory([]);
    setCurrUser('')
  };

  const sendMessage = () => {
    if (socket && message.trim() && selectedUserId) {
      socket.emit('sendMessage', {
        recipientId: selectedUserId,
        text: message
      });
      setMessage('');
    }
  };

  // Keep your original JSX return
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      {!isAuthenticated ? (
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-3xl font-semibold text-center text-gray-700 mb-4">Signup / Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSignup}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 mb-2"
          >
            Signup
          </button>
          <button
            onClick={handleLogin}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Login
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-3xl font-semibold text-center text-gray-700 mb-4">Chat App</h2>
          <div className="h-64 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg shadow-inner">
            {chatHistory.map((chat, index) => (
              currUser === chat.user ? (
                <p key={index} className="mb-2">
                  <strong className={chat.user === 'Me' ? 'text-blue-500' : 'text-green-500'}>
                    {chat.user}:
                  </strong> {chat.text}
                </p>
              ) : null
            ))}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <button
            onClick={sendMessage}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 mb-2"
          >
            Send Message
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Chat;