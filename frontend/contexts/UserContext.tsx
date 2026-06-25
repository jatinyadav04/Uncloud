'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  userId: string;
  profile: {
    age: number;
    cigarettesPerDay: number;
    cigaretteType: string;
    startDate: string;
  };
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  signOut: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there's a stored user ID in localStorage
    // Only run on client side
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('cleanslate_user_id');
      if (storedUserId) {
        // Try to load user data
        loadUserData(storedUserId);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const api = (await import('../services/api')).default;
      const userData = await api.getUser(userId);
      setUser({
        userId,
        profile: userData.profile
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Clear invalid user data
      localStorage.removeItem('cleanslate_user_id');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (typeof window !== 'undefined') {
      if (newUser) {
        localStorage.setItem('cleanslate_user_id', newUser.userId);
      } else {
        localStorage.removeItem('cleanslate_user_id');
      }
    }
  };

  const signOut = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cleanslate_user_id');
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser, signOut, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
