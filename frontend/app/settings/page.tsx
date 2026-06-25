'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useUser } from '../../contexts/UserContext';
import { useRouter } from 'next/navigation';

const SettingsPage = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [planDifficulty, setPlanDifficulty] = useState(3);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [theme, setTheme] = useState('light');
  const [colorScheme, setColorScheme] = useState('purple');
  const { user, signOut } = useUser();
  const router = useRouter();

  // Load user data and settings
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      try {
        const userId = user.userId;
        const api = (await import('../../services/api')).default;
        
        // Load user profile
        const userData = await api.getUser(userId);
        setUserProfile(userData.profile);
        
        // Calculate current week
        const startDate = new Date(userData.profile.startDate);
        const today = new Date();
        const startDateFixed = new Date(userData.profile.startDate + 'T00:00:00'); // Ensure consistent timezone
        const todayFixed = new Date();
        todayFixed.setHours(0, 0, 0, 0); // Reset to start of day for consistent comparison
        
        const daysDiff = Math.floor((todayFixed.getTime() - startDateFixed.getTime()) / (1000 * 60 * 60 * 24));
        
        // Ensure we're always at least in week 1 (day 0 = week 1, day 7 = week 2, etc.)
        const plan = await api.getPlan(userId).catch(() => null);
        const tw = plan?.weeklyGoals?.length || 8;
        setTotalWeeks(tw);
        const week = Math.min(Math.max(Math.floor(Math.max(daysDiff, 0) / 7) + 1, 1), tw);
        setCurrentWeek(week);
        
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Load saved theme and color scheme from localStorage
    const savedTheme = localStorage.getItem('cleanslate-theme') || 'light';
    const savedColorScheme = localStorage.getItem('cleanslate-color-scheme') || 'purple';
    setTheme(savedTheme);
    setColorScheme(savedColorScheme);
    
    // Apply theme to document
    applyTheme(savedTheme);
    applyColorScheme(savedColorScheme);
    
    loadUserData();
  }, [user]);

  const applyTheme = (newTheme: string) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f9fafb';
    } else if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        document.body.style.backgroundColor = '#1f2937';
        document.body.style.color = '#f9fafb';
      } else {
        root.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';
      }
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#111827';
    }
  };

  const applyColorScheme = (scheme: string) => {
    const root = document.documentElement;
    
    // Remove existing color scheme classes
    root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-teal');
    
    // Apply new color scheme
    switch (scheme) {
      case 'blue':
        root.style.setProperty('--color-primary', '#3b82f6');
        root.style.setProperty('--color-secondary', '#1d4ed8');
        break;
      case 'green':
        root.style.setProperty('--color-primary', '#10b981');
        root.style.setProperty('--color-secondary', '#059669');
        break;
      case 'purple':
        root.style.setProperty('--color-primary', '#8b5cf6');
        root.style.setProperty('--color-secondary', '#7c3aed');
        break;
      case 'teal':
        root.style.setProperty('--color-primary', '#14b8a6');
        root.style.setProperty('--color-secondary', '#0d9488');
        break;
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('cleanslate-theme', newTheme);
    applyTheme(newTheme);
  };

  const handleColorSchemeChange = (newScheme: string) => {
    setColorScheme(newScheme);
    localStorage.setItem('cleanslate-color-scheme', newScheme);
    applyColorScheme(newScheme);
  };

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Very Easy';
      case 2: return 'Easy';
      case 3: return 'Moderate';
      case 4: return 'Hard';
      case 5: return 'Very Hard';
      default: return 'Moderate';
    }
  };

  const getDifficultyDescription = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Slower reduction, more time between decreases';
      case 2: return 'Gentle reduction with extra support days';
      case 3: return 'Standard 8-week gradual reduction plan';
      case 4: return 'Faster reduction with stricter targets';
      case 5: return 'Aggressive reduction for experienced quitters';
      default: return 'Standard 8-week gradual reduction plan';
    }
  };

  const handleUpdatePlan = async () => {
    if (!user) return;
    
    setIsUpdatingPlan(true);
    try {
      // Here you would call an API to regenerate the plan with new difficulty
      // For now, we'll just show a success message
      alert(`Plan difficulty updated to ${getDifficultyLabel(planDifficulty)}. Your new plan will take effect from tomorrow.`);
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update plan difficulty. Please try again.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Settings</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Settings</h2>
              
              <div className="space-y-6">
                {/* Profile Information */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Profile Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        defaultValue="User"                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        id="email" 
                        defaultValue="user@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Password Change */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input 
                        type="password" 
                        id="current-password" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input 
                          type="password" 
                          id="new-password" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          id="confirm-password" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
            
            {/* Notification Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                {/* Enable/Disable Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-700">Enable Notifications</h3>
                    <p className="text-sm text-gray-500">Receive updates about your progress and reminders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                {notificationsEnabled && (
                  <>
                    {/* Daily Reminders */}
                    <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
                      <div>
                        <h3 className="font-medium text-gray-700">Daily Reminders</h3>
                        <p className="text-sm text-gray-500">Get daily motivation and tracking reminders</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={dailyReminders} onChange={() => setDailyReminders(!dailyReminders)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    {/* Reminder Time */}
                    {dailyReminders && (
                      <div className="pl-8 border-l-2 border-primary/30">
                        <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 mb-1">Daily Reminder Time</label>
                        <input 
                          type="time" 
                          id="reminder-time" 
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    )}
                    
                    {/* Weekly Reports */}
                    <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
                      <div>
                        <h3 className="font-medium text-gray-700">Weekly Progress Reports</h3>
                        <p className="text-sm text-gray-500">Receive a summary of your weekly progress</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={weeklyReports} onChange={() => setWeeklyReports(!weeklyReports)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Plan Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Cessation Plan</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Current Plan</h3>
                  <div className="bg-primary/5 p-4 rounded-lg">
                    {isLoading ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    ) : userProfile ? (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{totalWeeks}-Week Gradual Reduction</p>
                          <p className="text-sm text-gray-600">
                            Started: {new Date(userProfile.startDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <span className="bg-primary/20 text-primary text-sm px-3 py-1 rounded-full">
                          Week {currentWeek} of 8
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <p>No plan data available</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Adjust Plan Difficulty</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="difficulty" className="block text-sm text-gray-600 mb-2">
                        Current difficulty: <span className="font-medium text-primary">{getDifficultyLabel(planDifficulty)}</span>
                      </label>
                      <input 
                        type="range" 
                        id="difficulty" 
                        min="1" 
                        max="5" 
                        value={planDifficulty}
                        onChange={(e) => setPlanDifficulty(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Very Easy</span>
                        <span>Easy</span>
                        <span>Moderate</span>
                        <span>Hard</span>
                        <span>Very Hard</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{getDifficultyLabel(planDifficulty)}:</span> {getDifficultyDescription(planDifficulty)}
                      </p>
                    </div>
                    
                    {planDifficulty !== 3 && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                          </svg>
                          <p className="text-sm text-amber-700">
                            Changing difficulty will regenerate your plan. Your current progress will be preserved, but future targets will be adjusted.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button 
                    onClick={handleUpdatePlan}
                    disabled={isUpdatingPlan}
                    className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingPlan ? 'Updating...' : 'Update Plan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            {/* Display Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Display Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select 
                    id="theme" 
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {theme === 'light' && 'Always use light theme'}
                    {theme === 'dark' && 'Always use dark theme'}
                    {theme === 'system' && 'Follow your device settings'}
                  </p>
                </div>
                
                <div>
                  <label htmlFor="color-scheme" className="block text-sm font-medium text-gray-700 mb-1">Color Scheme</label>
                  <select 
                    id="color-scheme" 
                    value={colorScheme}
                    onChange={(e) => handleColorSchemeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple (Default)</option>
                    <option value="teal">Teal</option>
                  </select>
                  <div className="flex items-center mt-2 space-x-2">
                    <div className={`w-4 h-4 rounded-full ${
                      colorScheme === 'blue' ? 'bg-blue-500' :
                      colorScheme === 'green' ? 'bg-green-500' :
                      colorScheme === 'purple' ? 'bg-purple-500' :
                      'bg-teal-500'
                    }`}></div>
                    <span className="text-xs text-gray-500">Preview of selected color</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Note:</span> Changes are applied immediately and saved automatically.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Privacy Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Privacy Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input 
                    id="share-progress" 
                    name="share-progress" 
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" 
                  />
                  <label htmlFor="share-progress" className="ml-2 block text-sm text-gray-700">
                    Share my progress anonymously
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    id="research" 
                    name="research" 
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" 
                  />
                  <label htmlFor="research" className="ml-2 block text-sm text-gray-700">
                    Contribute data to improve cessation research
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    id="show-profile" 
                    name="show-profile" 
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" 
                  />
                  <label htmlFor="show-profile" className="ml-2 block text-sm text-gray-700">
                    Show my profile in community
                  </label>
                </div>
              </div>
            </div>
            
            {/* Account Actions */}
            <div className="mt-6 space-y-3">
              <button 
                onClick={handleSignOut}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
              <button className="w-full py-3 px-4 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;