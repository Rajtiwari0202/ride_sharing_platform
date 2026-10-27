import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Enable cookies on cross-origin requests
axios.defaults.withCredentials = true;

const API_BASE = 'http://localhost:4000';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [rider, setRider] = useState(null);
  const [captain, setCaptain] = useState(null);
  const [activeRole, setActiveRole] = useState('dual'); // 'rider' | 'captain' | 'dual'
  const [loading, setLoading] = useState(true);

  // Restore authenticated sessions on page refresh
  useEffect(() => {
    async function restoreSession() {
      const savedRiderToken = localStorage.getItem('rider_token');
      const savedCaptainToken = localStorage.getItem('captain_token');

      const promises = [];

      if (savedRiderToken) {
        promises.push(
          axios.get(`${API_BASE}/users/profile`, {
            headers: { Authorization: `Bearer ${savedRiderToken}` }
          }).then((res) => {
            setRider({ token: savedRiderToken, user: res.data });
          }).catch(() => {
            localStorage.removeItem('rider_token');
          })
        );
      }

      if (savedCaptainToken) {
        promises.push(
          axios.get(`${API_BASE}/captains/profile`, {
            headers: { Authorization: `Bearer ${savedCaptainToken}` }
          }).then((res) => {
            setCaptain({ token: savedCaptainToken, captain: res.data.captain });
          }).catch(() => {
            localStorage.removeItem('captain_token');
          })
        );
      }

      await Promise.allSettled(promises);
      setLoading(false);
    }

    restoreSession();
  }, []);

  // Rider Auth
  const loginRider = async (email, password) => {
    const res = await axios.post(`${API_BASE}/users/login`, { email, password });
    const { token, user } = res.data;
    localStorage.setItem('rider_token', token);
    setRider({ token, user });
    return user;
  };

  const registerRider = async ({ firstname, lastname, email, password }) => {
    const res = await axios.post(`${API_BASE}/users/register`, {
      fullname: { firstname, lastname },
      email,
      password
    });
    const { token, user } = res.data;
    localStorage.setItem('rider_token', token);
    setRider({ token, user });
    return user;
  };

  const logoutRider = async () => {
    if (rider?.token) {
      try {
        await axios.get(`${API_BASE}/users/logout`, {
          headers: { Authorization: `Bearer ${rider.token}` }
        });
      } catch (err) {
        console.warn('Logout API error:', err.message);
      }
    }
    localStorage.removeItem('rider_token');
    setRider(null);
  };

  // Captain Auth
  const loginCaptain = async (email, password) => {
    const res = await axios.post(`${API_BASE}/captains/login`, { email, password });
    const { token, captain: capData } = res.data;
    localStorage.setItem('captain_token', token);
    setCaptain({ token, captain: capData });
    return capData;
  };

  const registerCaptain = async ({ firstname, lastname, email, password, vehicle }) => {
    const res = await axios.post(`${API_BASE}/captains/register`, {
      fullname: { firstname, lastname },
      email,
      password,
      vehicle
    });
    const { token, captain: capData } = res.data;
    localStorage.setItem('captain_token', token);
    setCaptain({ token, captain: capData });
    return capData;
  };

  const logoutCaptain = async () => {
    if (captain?.token) {
      try {
        await axios.get(`${API_BASE}/captains/logout`, {
          headers: { Authorization: `Bearer ${captain.token}` }
        });
      } catch (err) {
        console.warn('Logout API error:', err.message);
      }
    }
    localStorage.removeItem('captain_token');
    setCaptain(null);
  };

  return (
    <AuthContext.Provider
      value={{
        rider,
        captain,
        activeRole,
        setActiveRole,
        loading,
        loginRider,
        registerRider,
        logoutRider,
        loginCaptain,
        registerCaptain,
        logoutCaptain
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
