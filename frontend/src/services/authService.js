import axios from 'axios';

const API_URL = 'http://localhost:1337/api';

export const signup = async (username, email, password) => {
  const response = await axios.post(`${API_URL}/auth/local/register`, {
    username,
    email,
    password,
  });
  return response.data;
};

export const login = async (identifier, password) => {
  const response = await axios.post(`${API_URL}/auth/local`, {
    identifier,
    password,
  });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('jwt');
};
