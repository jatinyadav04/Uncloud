'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useUser } from '../../contexts/UserContext';
import { useRouter } from 'next/navigation';

const JournalPage = () => {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEntries: 0,
    positiveDays: 0,
    toughDays: 0
  });
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEntry, setNewEntry] = useState({
    cigarettesSmoked: '',
    mood: 'neutral',
    cravingIntensity: 3,
    notes: ''
  });

  // Redirect to home if no user is logged in
  if (!userLoading && !user) {
    router.push('/');
    return null;
  }

  useEffect(() => {
    if (!user) return;
    
    const loadJournalData = async () => {
      try {
        const userId = user.userId;
        const api = (await import('../../services/api')).default;
        
        // Load daily logs and user data from the API
        const [dailyLogs, userData] = await Promise.all([
          api.getDailyLogs(userId),
          api.getUser(userId)
        ]);
        
        // Get user's start date
        const startDate = new Date(userData.profile.startDate);
        
        // Convert daily logs to journal entries
        const entries = dailyLogs.map((log) => {
          const logDate = new Date(log.date + 'T00:00:00'); // Ensure local timezone interpretation
          // Calculate actual day number based on start date
          const daysDiff = Math.floor((logDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const dayNumber = daysDiff + 1; // +1 because day 1 is the start date
          
          // Determine mood color and text based on actual mood selection
          let moodColor = 'text-primary';
          let moodText = 'Neutral';
          
          switch (log.mood) {
            case 'positive':
              moodColor = 'text-green-500';
              moodText = 'Positive';
              break;
            case 'challenging':
              moodColor = 'text-amber-500';
              moodText = 'Challenging';
              break;
            case 'difficult':
              moodColor = 'text-red-500';
              moodText = 'Difficult';
              break;
            case 'neutral':
            default:
              moodColor = 'text-primary';
              moodText = 'Neutral';
              break;
          }
          
          // Determine craving level
          let cravingColor = 'text-green-500';
          let cravingText = 'Low';
          if (log.cravingIntensity >= 4) {
            cravingColor = 'text-red-500';
            cravingText = 'High';
          } else if (log.cravingIntensity >= 3) {
            cravingColor = 'text-amber-500';
            cravingText = 'Moderate';
          }
          
          return {
            date: logDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            dayNumber,
            cigarettesSmoked: log.cigarettesSmoked,
            mood: log.mood || 'neutral',
            cravingIntensity: log.cravingIntensity,
            notes: log.notes || '',
            moodColor,
            moodText,
            cravingColor,
            cravingText
          };
        }).reverse(); // Show most recent first
        
        setJournalEntries(entries);
        
        // Calculate stats
        const totalEntries = entries.length;
        const positiveDays = entries.filter(entry => entry.cravingIntensity <= 2).length;
        const toughDays = entries.filter(entry => entry.cravingIntensity >= 4).length;
        
        setStats({
          totalEntries,
          positiveDays,
          toughDays
        });
        
      } catch (error) {
        console.error('Error loading journal data:', error);
        // Fall back to sample data
        setJournalEntries([
          {
            date: "April 21, 2025",
            dayNumber: 14,
            cigarettesSmoked: 5,
            mood: "steady",
            cravingIntensity: 3,
            notes: "Today was challenging. I had strong cravings after lunch, but I managed to distract myself by taking a short walk instead. I'm proud that I didn't give in.",
            moodColor: "text-primary",
            moodText: "Steady",
            cravingColor: "text-amber-500",
            cravingText: "Moderate"
          },
          {
            date: "April 20, 2025",
            dayNumber: 13,
            cigarettesSmoked: 3,
            mood: "positive",
            cravingIntensity: 2,
            notes: "I noticed I'm starting to breathe easier, especially during my morning walk. My clothes don't smell like smoke anymore, which is a wonderful change. I'm feeling more confident about this journey.",
            moodColor: "text-green-500",
            moodText: "Positive",
            cravingColor: "text-green-500",
            cravingText: "Low"
          }
        ]);
        
        setStats({
          totalEntries: 2,
          positiveDays: 1,
          toughDays: 0
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadJournalData();
  }, [user]);

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.cigarettesSmoked || !user) return;
    
    setIsSubmitting(true);
    
    try {
      const userId = user.userId;
      
      const logData = {
        date: new Date().toLocaleDateString('en-CA'), // Today's date in YYYY-MM-DD format (local timezone)
        cigarettesSmoked: parseInt(newEntry.cigarettesSmoked),
        mood: newEntry.mood,
        cravingIntensity: newEntry.cravingIntensity,
        notes: newEntry.notes || undefined
      };
      
      // Import the API service
      const api = (await import('../../services/api')).default;
      await api.addDailyLog(userId, logData);
      
      // Reset form and close modal
      setNewEntry({
        cigarettesSmoked: '',
        mood: 'neutral',
        cravingIntensity: 3,
        notes: ''
      });
      setShowNewEntryForm(false);
      
      // Show success message
      alert('Journal entry added successfully!');
      
      // Refresh the page to show updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Error adding journal entry:', error);
      alert('Failed to add journal entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-600">Loading your journal...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">My Journal</h1>
        
        <div className="grid gap-6">
          {/* Journal entries section */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Daily Reflections</h2>
            
            {/* Create new entry */}
            <div className="mb-6">
              <button 
                onClick={() => setShowNewEntryForm(true)}
                className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                New Journal Entry
              </button>
            </div>
            
            {/* Journal entries list */}
            <div className="space-y-4">
              {journalEntries.length > 0 ? (
                journalEntries.map((entry, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-lg">{entry.date}</h3>
                      <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium">Day {entry.dayNumber}</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      Cigarettes smoked: <span className="font-medium">{entry.cigarettesSmoked}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-gray-600 mt-2">{entry.notes}</p>
                    )}
                    <div className="flex gap-4 mt-3">
                      <span className="text-xs text-gray-500 flex items-center">
                        <svg className={`w-4 h-4 mr-1 ${entry.moodColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Mood: {entry.moodText}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <svg className={`w-4 h-4 mr-1 ${entry.cravingColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        Craving Level: {entry.cravingText}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No journal entries yet. Start logging your daily progress!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Stats box */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Journal Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-lg font-bold text-primary">{stats.totalEntries}</p>
                <p className="text-sm text-gray-600">Journal Entries</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-lg font-bold text-primary">{stats.positiveDays}</p>
                <p className="text-sm text-gray-600">Positive Days</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-lg font-bold text-primary">{stats.toughDays}</p>
                <p className="text-sm text-gray-600">Tough Days Overcome</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal for adding new journal entry */}
        {showNewEntryForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-primary">New Journal Entry</h3>
                  <button 
                    onClick={() => setShowNewEntryForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmitEntry}>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">Cigarettes Smoked Today</label>
                    <input
                      type="number"
                      min="0"
                      value={newEntry.cigarettesSmoked}
                      onChange={(e) => setNewEntry({...newEntry, cigarettesSmoked: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter number"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">How are you feeling?</label>
                    <select
                      value={newEntry.mood}
                      onChange={(e) => setNewEntry({...newEntry, mood: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="challenging">Challenging</option>
                      <option value="difficult">Difficult</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">Craving Intensity (1-5)</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Low</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={newEntry.cravingIntensity}
                        onChange={(e) => setNewEntry({...newEntry, cravingIntensity: parseInt(e.target.value)})}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">High</span>
                      <span className="ml-2 font-medium text-primary">{newEntry.cravingIntensity}</span>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2 font-medium">Notes & Reflections</label>
                    <textarea
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="How was your day? Any triggers, challenges, or victories you'd like to note?"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowNewEntryForm(false)}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default JournalPage;