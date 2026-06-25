'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MainLayout from '@/components/layout/MainLayout';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useUser } from '../../contexts/UserContext';
import { useRouter } from 'next/navigation';
import SOSModal from '@/components/SOSModal';
import AdaptivePlanCard from '@/components/AdaptivePlanCard';
import RiskTrendChart from '@/components/RiskTrendChart';
import BadgesCard from '@/components/BadgesCard';
import WeeklySummaryCard from '@/components/WeeklySummaryCard';
import TriggerInsightsCard from '@/components/TriggerInsightsCard';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// User data state
interface UserData {
  name: string;
  age: number;
  startDate: string;
  initialCigarettes: number;
  currentWeek: number;
  streak: number;
  totalWeeks: number;
}

interface WeeklyGoal {
  week: number;
  dailyLimit: number;
  actualAverage: number | null;
  completed: boolean;
}

interface DailyEntry {
  date: string;
  count: number;
  notes: string;
}

// Calculate achievements based on real data
const calculateAchievements = (userData: UserData, dailyEntries: DailyEntry[]) => {
  if (dailyEntries.length === 0 || !userData.initialCigarettes || userData.initialCigarettes === 0) {
    return {
      totalReduction: 0,
      percentReduction: 0,
      cigarettesAvoided: 0,
      moneySaved: '0.00',
      daysSmokeFree: 0,
    };
  }

  const latestEntry = dailyEntries[dailyEntries.length - 1];
  const totalReduction = Math.max(0, userData.initialCigarettes - latestEntry.count);
  const percentReduction = Math.round((totalReduction / userData.initialCigarettes) * 100);
  const cigarettesAvoided = dailyEntries.reduce((total, entry) => {
    return total + Math.max(0, userData.initialCigarettes - entry.count);
  }, 0);
  const moneySaved = cigarettesAvoided * 0.5; // Assuming $0.50 per cigarette
  
  return {
    totalReduction,
    percentReduction,
    cigarettesAvoided,
    moneySaved: moneySaved.toFixed(2),
    daysSmokeFree: 0, // None yet in this early stage
  };
};

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export default function Dashboard() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEntryForm, setShowAddEntryForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    count: '',
    notes: '',
    mood: 'okay',
    cravingIntensity: 5,
    sleepHours: '',
    stressLevel: 5,
    triggers: [] as string[],
    heart_rate_avg: '',
    resting_heart_rate: '',
    heart_rate_variability: '',
    step_count: '',
    active_minutes: '',
  });
  const [cigarettesData, setCigarettesData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Relapse risk card state
  const [riskResult, setRiskResult] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState('');
  // SOS modal
  const [showSOS, setShowSOS] = useState(false);
  // Plan refresh trigger
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  // Biometrics section toggle
  const [showBiometrics, setShowBiometrics] = useState(false);
  // Connect Device modal
  const [showConnectDevice, setShowConnectDevice] = useState(false);
  // Notification banners
  const [notifLogReminder, setNotifLogReminder] = useState(false);
  const [notifRiskAlert, setNotifRiskAlert] = useState(false);
  const [notifDismissed, setNotifDismissed] = useState<string[]>([]);
  
  // Real user data state
  const [userData, setUserData] = useState<UserData>({
    name: 'User',
    age: 0,
    startDate: '',
    initialCigarettes: 0,
    currentWeek: 1,
    streak: 0,
    totalWeeks: 8,
  });
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  
  // Redirect to home if no user is logged in
  if (!userLoading && !user) {
    router.push('/');
    return null;
  }
  
  // Load real data from API
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      try {
        const userId = user.userId;
        const api = (await import('../../services/api')).default;
        
        // Load user data, daily logs, and plan
        const [userData, dailyLogs, plan] = await Promise.all([
          api.getUser(userId),
          api.getDailyLogs(userId),
          api.getPlan(userId)
        ]);
        
        // Update user data with real data
        const startDate = new Date(userData.profile.startDate + 'T00:00:00'); // Ensure consistent timezone
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day for consistent comparison
        
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Ensure we're always at least in week 1 (day 0 = week 1, day 7 = week 2, etc.)
        const totalWeeks = plan.weeklyGoals?.length || 8;
        const currentWeek = Math.min(Math.max(Math.floor(Math.max(daysDiff, 0) / 7) + 1, 1), totalWeeks);
        
        // Calculate streak (consecutive days meeting targets or smoke-free)
        let streak = 0;
        if (dailyLogs.length > 0) {
          // Group logs by date and sum cigarettes for the same date (like progress page)
          const groupedLogs = dailyLogs.reduce((acc, log) => {
            const dateKey = log.date.split('T')[0]; // Use YYYY-MM-DD as key
            if (!acc[dateKey]) {
              acc[dateKey] = {
                date: dateKey,
                cigarettesSmoked: 0
              };
            }
            acc[dateKey].cigarettesSmoked += log.cigarettesSmoked;
            return acc;
          }, {} as Record<string, { date: string; cigarettesSmoked: number }>);
          
          // Sort grouped logs by date (most recent first)
          const sortedGroupedLogs = Object.values(groupedLogs).sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          // Calculate streak by checking consecutive days from most recent
          for (let i = 0; i < sortedGroupedLogs.length; i++) {
            const groupedLog = sortedGroupedLogs[i];
            const logDate = new Date(groupedLog.date + 'T00:00:00');
            const daysFromStart = Math.floor((logDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const weekIndex = Math.floor(daysFromStart / 7);
            const target = plan.weeklyGoals?.[weekIndex]?.dailyLimit || userData.profile.cigarettesPerDay;
            
            // Check if this day met the target (or was smoke-free)
            if (groupedLog.cigarettesSmoked <= target) {
              streak++;
            } else {
              break; // Streak broken
            }
          }
        }
        
        setUserData({
          name: "User", // Keep generic name
          age: userData.profile.age,
          startDate: userData.profile.startDate,
          initialCigarettes: userData.profile.cigarettesPerDay,
          currentWeek: currentWeek,
          streak: Math.max(0, streak),
          totalWeeks: totalWeeks,
        });
        
        // Process weekly goals with real plan data
        const processedWeeklyGoals: WeeklyGoal[] = [];
        
        if (plan.weeklyGoals && plan.weeklyGoals.length > 0) {
          plan.weeklyGoals.forEach((planGoal, index) => {
            const goal: WeeklyGoal = {
              week: planGoal.week,
              dailyLimit: planGoal.dailyLimit,
              actualAverage: null,
              completed: false,
            };
            
            // Calculate actual average from daily logs for completed weeks
            if (index < currentWeek - 1) {
              const weekStart = new Date(startDate);
              weekStart.setDate(weekStart.getDate() + (index * 7));
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              
              const weekLogs = dailyLogs.filter(log => {
                const logDate = new Date(log.date + 'T00:00:00'); // Ensure local timezone interpretation
                return logDate >= weekStart && logDate <= weekEnd;
              });
              
              if (weekLogs.length > 0) {
                const totalCigarettes = weekLogs.reduce((sum, log) => sum + log.cigarettesSmoked, 0);
                goal.actualAverage = Math.round((totalCigarettes / weekLogs.length) * 10) / 10;
                goal.completed = goal.actualAverage <= goal.dailyLimit;
              }
            }
            
            processedWeeklyGoals.push(goal);
          });
        }
        setWeeklyGoals(processedWeeklyGoals);
        
        // If no plan exists, generate one automatically
        if (processedWeeklyGoals.length === 0) {
          console.log('No plan found, attempting to generate one...');
          try {
            const userInput = {
              age: userData.profile.age,
              cigarettesPerDay: userData.profile.cigarettesPerDay,
              cigaretteType: userData.profile.cigaretteType
            };
            
            // Generate plan automatically
            api.generatePlan(userId, userInput).then((generatedPlan) => {
              console.log('Auto-generated plan:', generatedPlan);
              // Reload the page to show the new plan
              window.location.reload();
            }).catch((error) => {
              console.error('Failed to auto-generate plan:', error);
            });
          } catch (error) {
            console.error('Error auto-generating plan:', error);
          }
        }
        
        // Sort daily logs by date to ensure chronological order
        const sortedLogs = dailyLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Group logs by date and sum cigarettes for the same date
        const groupedLogs = sortedLogs.reduce((acc, log) => {
          const date = log.date;
          if (!acc[date]) {
            acc[date] = {
              date: date,
              cigarettesSmoked: 0,
              notes: []
            };
          }
          acc[date].cigarettesSmoked += log.cigarettesSmoked;
          if (log.notes) {
            acc[date].notes.push(log.notes);
          }
          return acc;
        }, {} as Record<string, { date: string; cigarettesSmoked: number; notes: string[] }>);
        
        // Convert grouped logs to daily entries format
        const processedDailyEntries: DailyEntry[] = Object.values(groupedLogs).map(log => ({
          date: log.date,
          count: log.cigarettesSmoked,
          notes: log.notes.join('; ') || '',
        }));
        setDailyEntries(processedDailyEntries);
        
        // Prepare chart data from grouped logs
        const chartLabels = processedDailyEntries.map(entry => formatDate(entry.date));
        const chartData = processedDailyEntries.map(entry => entry.count);
        
        // Calculate goal data based on real plan
        const goalData = processedDailyEntries.map(entry => {
          // Force local-timezone parsing by appending T00:00:00 — same as startDate
          const entryDate = new Date(entry.date + 'T00:00:00');
          const daysDiff = Math.floor((entryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          // Clamp to valid range: day 0 is week 1 (index 0), never go negative
          const weekIndex = Math.max(0, Math.floor(daysDiff / 7));
          const goal = plan.weeklyGoals?.[weekIndex];
          // Fall back to the last week's limit if weekIndex exceeds plan length
          if (goal) return goal.dailyLimit;
          const lastGoal = plan.weeklyGoals?.[plan.weeklyGoals.length - 1];
          return lastGoal?.dailyLimit ?? 0;
        });
        
        setCigarettesData({
          labels: chartLabels,
          datasets: [
            {
              label: 'Daily Cigarettes',
              data: chartData,
              borderColor: '#8A2BE2',
              backgroundColor: 'rgba(138, 43, 226, 0.5)',
              tension: 0.3,
            },
            {
              label: 'Daily Target',
              data: goalData,
              borderColor: '#9370DB',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              tension: 0.1,
              pointRadius: 0,
            },
          ],
        });
        
        // Calculate achievements with the processed user data
        const processedUserData = {
          name: "User",
          age: userData.profile.age,
          startDate: userData.profile.startDate,
          initialCigarettes: userData.profile.cigarettesPerDay,
          currentWeek: currentWeek,
          streak: Math.max(0, streak),
        };
        
        console.log('Debug - processedUserData:', processedUserData);
        console.log('Debug - processedDailyEntries:', processedDailyEntries);
        
        const achievements = calculateAchievements(processedUserData, processedDailyEntries);
        console.log('Debug - calculated achievements:', achievements);
        setAchievements(achievements);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        // Set empty data if API fails
        setUserData({
          name: 'User',
          age: 0,
          startDate: '',
          initialCigarettes: 0,
          currentWeek: 1,
          streak: 0,
          totalWeeks: 8,
        });
        setWeeklyGoals([]);
        setDailyEntries([]);
        setCigarettesData(null);
        setAchievements({
          totalReduction: 0,
          percentReduction: 0,
          cigarettesAvoided: 0,
          moneySaved: '0.00',
          daysSmokeFree: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [user]);

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.count) return;
    
    setIsSubmitting(true);
    
    try {
      if (!user) return;
      const userId = user.userId;
      
      const logData = {
        date: new Date().toLocaleDateString('en-CA'),
        cigarettesSmoked: parseInt(newEntry.count),
        mood: newEntry.mood,
        cravingIntensity: newEntry.cravingIntensity,
        sleepHours: newEntry.sleepHours ? parseFloat(newEntry.sleepHours) : undefined,
        stressLevel: newEntry.stressLevel,
        notes: newEntry.notes || undefined,
        triggers: newEntry.triggers.length > 0 ? newEntry.triggers : undefined,
        heart_rate_avg: newEntry.heart_rate_avg ? parseFloat(newEntry.heart_rate_avg) : undefined,
        resting_heart_rate: newEntry.resting_heart_rate ? parseFloat(newEntry.resting_heart_rate) : undefined,
        heart_rate_variability: newEntry.heart_rate_variability ? parseFloat(newEntry.heart_rate_variability) : undefined,
        step_count: newEntry.step_count ? parseInt(newEntry.step_count) : undefined,
        active_minutes: newEntry.active_minutes ? parseInt(newEntry.active_minutes) : undefined,
      };
      
      const api = (await import('../../services/api')).default;
      await api.addDailyLog(userId, logData);
      
      setIsSubmitting(false);
      setShowAddEntryForm(false);
      setShowBiometrics(false);
      setNewEntry({ count: '', notes: '', mood: 'okay', cravingIntensity: 5, sleepHours: '', stressLevel: 5, triggers: [], heart_rate_avg: '', resting_heart_rate: '', heart_rate_variability: '', step_count: '', active_minutes: '' });
      
      alert('Cigarette count logged successfully!');
      window.location.reload();
      
    } catch (error) {
      console.error('Error logging cigarettes:', error);
      setIsSubmitting(false);
      alert('Failed to log cigarettes. Please try again.');
    }
  };

  const handleAnalyzeWeek = async () => {
    if (!user) return;
    setRiskLoading(true);
    setRiskError('');
    setRiskResult(null);
    try {
      const api = (await import('../../services/api')).default;
      const result = await api.getUserRelapseRisk(user.userId);
      setRiskResult(result);
    } catch (err: any) {
      setRiskError(err.message || 'Failed to analyse risk. Make sure you have logged at least one day.');
    } finally {
      setRiskLoading(false);
    }
  };

  // Fetch notification status once data is loaded
  useEffect(() => {
    if (!user || isLoading) return;
    const today = new Date().toLocaleDateString('en-CA');
    const dismissKey = `notif_dismissed_${today}`;
    const dismissed: string[] = JSON.parse(localStorage.getItem(dismissKey) || '[]');
    setNotifDismissed(dismissed);

    (async () => {
      try {
        const api = (await import('../../services/api')).default;
        const status = await api.getNotificationStatus(user.userId);
        // Only show if not already dismissed today
        if (status.needs_log_reminder && !dismissed.includes('log_reminder')) {
          // Only show after 8 PM local time
          const hour = new Date().getHours();
          if (hour >= 20) setNotifLogReminder(true);
        }
        if (status.proactive_risk_alert && !dismissed.includes('risk_alert')) {
          setNotifRiskAlert(true);
        }
      } catch { /* silent — notifications are non-critical */ }
    })();
  }, [user, isLoading]);

  const dismissNotif = (key: 'log_reminder' | 'risk_alert') => {
    const today = new Date().toLocaleDateString('en-CA');
    const dismissKey = `notif_dismissed_${today}`;
    const updated = [...notifDismissed, key];
    localStorage.setItem(dismissKey, JSON.stringify(updated));
    setNotifDismissed(updated);
    if (key === 'log_reminder') setNotifLogReminder(false);
    if (key === 'risk_alert') setNotifRiskAlert(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Notification banners */}
        {notifLogReminder && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-xl mt-0.5">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">You haven&apos;t logged your cigarettes today.</p>
              <p className="text-xs text-amber-700 mt-0.5">Take a moment to update your progress — it only takes a few seconds.</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { setShowAddEntryForm(true); dismissNotif('log_reminder'); }}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
              >
                Log Now
              </button>
              <button onClick={() => dismissNotif('log_reminder')} className="text-amber-400 hover:text-amber-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {notifRiskAlert && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-xl mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">You&apos;ve been above your target for the last few days.</p>
              <p className="text-xs text-red-700 mt-0.5">That can happen during difficult phases. Would you like to talk about cravings, stress, or adjust your quit plan?</p>
            </div>
            <div className="flex gap-2 items-center">
              <a href="/support" className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap">
                Talk to Assistant
              </a>
              <button onClick={() => dismissNotif('risk_alert')} className="text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Welcome back, {userData.name}</h1>
            <p className="text-gray-600">Week {userData.currentWeek} of your {userData.totalWeeks}-week journey • Started on {new Date(userData.startDate).toLocaleDateString()}</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <button
              onClick={() => setShowSOS(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold shadow-md transition"
            >
              🚨 SOS — I&apos;m Craving
            </button>
            <Button
              onClick={() => setShowAddEntryForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Log Today
            </Button>
            <Button
              onClick={() => setShowConnectDevice(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              ⌚ Connect Device
            </Button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="purple" hoverable className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Current Week Target</h3>
              <span className="bg-primary/10 px-2 py-1 rounded text-sm font-medium">Week {userData.currentWeek}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-bold">
                  {(() => {
                    if (weeklyGoals.length === 0) {
                      return <span className="text-2xl text-gray-500">Generating...</span>;
                    }
                    
                    const weekIndex = userData.currentWeek - 1;
                    const currentGoal = weeklyGoals[weekIndex];
                    
                    // If current week goal doesn't exist, try to find the closest available week
                    if (!currentGoal) {
                      // Find the last available week goal
                      const lastGoal = weeklyGoals[weeklyGoals.length - 1];
                      return lastGoal?.dailyLimit ?? '--';
                    }
                    
                    return currentGoal.dailyLimit;
                  })()}
                </span>
                {weeklyGoals.length > 0 && <span className="ml-2">cigarettes/day</span>}
              </div>
              <div className="text-right text-sm">
                <div>Current Avg:</div>
                <div className="font-bold text-black">
                  {(() => {
                    if (weeklyGoals.length === 0) return '-';
                    const weekIndex = userData.currentWeek - 1;
                    const currentGoal = weeklyGoals[weekIndex];
                    return currentGoal?.actualAverage ?? '-';
                  })()}
                </div>
              </div>
            </div>
          </Card>
          
          <Card variant="purple" hoverable className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Your Streak</h3>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">Days</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-primary">{userData.streak}</span>
                <span className="ml-2">days on target</span>
              </div>
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
            </div>
          </Card>
          
          <Card variant="purple" hoverable className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Overall Reduction</h3>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">Progress</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-primary">{achievements.percentReduction}%</span>
                <span className="ml-2">from start</span>
              </div>
              <div className="text-right text-sm">
                <div>From {userData.initialCigarettes} to</div>
                <div className="font-bold text-black">{dailyEntries[dailyEntries.length - 1]?.count || 0} per day</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart */}
        <div className="mb-8">
          <Card className="bg-white p-6">
            <h2 className="text-xl font-bold mb-4 text-primary">Your Progress</h2>
            {cigarettesData && (
              <div className="h-[400px]">
                <Line
                  data={cigarettesData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Cigarettes'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Date'
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                      tooltip: {
                        backgroundColor: 'rgba(138, 43, 226, 0.8)',
                      }
                    },
                  }}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Relapse Risk Card */}
        {(() => {
          const riskColors: Record<number, { bg: string; border: string; text: string; dot: string; label: string; emoji: string }> = {
            0: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500', label: 'Low Risk', emoji: '✅' },
            1: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Medium Risk', emoji: '⚠️' },
            2: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500', label: 'High Risk', emoji: '🚨' },
          };
          const cfg = riskResult ? riskColors[riskResult.relapse_risk_class as 0 | 1 | 2] : null;
          const confidence = riskResult
            ? (riskResult.probabilities[riskResult.relapse_risk_label as keyof typeof riskResult.probabilities] * 100).toFixed(1)
            : null;

          return (
            <div className="mb-8">
              <Card className={`border-2 transition-all ${cfg ? `${cfg.bg} ${cfg.border}` : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
                      <span>🧠</span> Weekly Relapse Risk
                    </h2>
                    <p className="text-sm text-gray-500">
                      Automatically analysed from your last 7 days of logs.
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyzeWeek}
                    disabled={riskLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium text-sm shadow hover:opacity-90 transition disabled:opacity-60 whitespace-nowrap"
                  >
                    {riskLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analyse My Week
                      </>
                    )}
                  </button>
                </div>

                {riskError && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                    {riskError}
                  </div>
                )}

                {riskResult && cfg && (
                  <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Risk badge */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                      <span className="text-3xl">{cfg.emoji}</span>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Risk Level</p>
                        <p className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</p>
                      </div>
                    </div>

                    {/* Confidence + days */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">Confidence</span>
                        <span className={`font-bold ${cfg.text}`}>{confidence}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${cfg.dot}`}
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Based on {riskResult.days_used} day{riskResult.days_used !== 1 ? 's' : ''} of data</span>
                        <span>Model: {riskResult.model_used}</span>
                      </div>
                    </div>
                  </div>
                )}

                {riskResult?.data_warning && (
                  <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ {riskResult.data_warning}
                  </p>
                )}
              </Card>
            </div>
          );
        })()}

        {/* Achievements and Weekly Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Achievements */}          <Card variant="gradient" hoverable className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 text-primary">Your Achievements</h2>
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cigarettes Avoided</p>
                  <p className="font-bold">{achievements.cigarettesAvoided} cigarettes</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Money Saved</p>
                  <p className="font-bold">${achievements.moneySaved}</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Health Milestone</p>
                  <p className="font-bold">Carbon Monoxide Levels Normalizing</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Reduction</p>
                  <p className="font-bold">{achievements.totalReduction} cigarettes per day</p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Right: Weekly Goals Progress */}
          <Card variant="gradient" className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-primary">{userData.totalWeeks}-Week Plan Progress</h2>
            <div className="space-y-4">
              {weeklyGoals.map((week) => (
                <div key={week.week} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Week {week.week}</h3>
                    <div>
                      {week.completed ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Completed</span>
                      ) : week.week === userData.currentWeek ? (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">Current</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">Upcoming</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-1">
                    <span className="text-sm text-gray-600 w-32">Daily Limit:</span>
                    <span className="font-medium">{week.dailyLimit} cigarettes</span>
                  </div>
                  
                  {week.actualAverage !== null && (
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-32">Your Average:</span>
                      <span className={`font-medium ${
                        week.actualAverage <= week.dailyLimit ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {week.actualAverage} cigarettes
                      </span>
                    </div>
                  )}
                  
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        week.completed 
                          ? 'bg-green-500' 
                          : week.week === userData.currentWeek 
                            ? 'bg-primary' 
                            : 'bg-gray-300'
                      }`}
                      style={{ 
                        width: `${week.completed ? '100' : week.week === userData.currentWeek ? '40' : '0'}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Feature 1: Adaptive Plan Card ── */}
        {user && riskResult && (
          <AdaptivePlanCard
            userId={user.userId}
            riskClass={riskResult.relapse_risk_class ?? null}
            onPlanUpdated={() => setPlanRefreshKey(k => k + 1)}
          />
        )}

        {/* ── Feature 2: Risk Trend Chart ── */}
        {user && <RiskTrendChart userId={user.userId} />}

        {/* ── Feature 4: Badges ── */}
        {user && <BadgesCard userId={user.userId} />}

        {/* ── Feature 5: Weekly Summary ── */}
        {user && <WeeklySummaryCard userId={user.userId} />}

        {/* ── Feature 6: Trigger Insights ── */}
        {user && <TriggerInsightsCard userId={user.userId} />}

        {/* Recent Entries */}
        <Card variant="gradient" className="mb-8 text-white">
          <h2 className="text-xl font-bold mb-4 text-primary">Recent Entries</h2>          <div className="overflow-x-auto">
            <table className="min-w-full ">
              <thead>
                <tr className="bg-primary/10 ">
                  <th className="py-2 px-4 text-left rounded-tl-lg">Date</th>
                  <th className="py-2 px-4 text-left">Cigarettes</th>
                  <th className="py-2 px-4 text-left">Target</th>
                  <th className="py-2 px-4 text-left rounded-tr-lg">Notes</th>
                </tr>
              </thead>
              <tbody>
                {dailyEntries.slice(-5).reverse().map((entry, index) => {
                  // Calculate which week's target applies
                  const entryDate = new Date(entry.date);
                  const startDate = new Date(userData.startDate);
                  const dayDiff = Math.floor((entryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  const weekIndex = Math.floor(dayDiff / 7);
                  const target = weeklyGoals[weekIndex]?.dailyLimit;
                  const isOverTarget = entry.count > (target || 0);
                  
                  return (
                    <tr key={entry.date} className="border-b hover:bg-purple-300">
                      <td className="py-3 px-4">{formatDate(entry.date)}</td>
                      <td className={`py-3 px-4 font-medium ${isOverTarget ? 'text-red-600' : 'text-green-600'}`}>
                        {entry.count}
                      </td>
                      <td className="py-3 px-4">
                        {target}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {entry.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        
        {/* Modal for adding new entry */}
        {showAddEntryForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-primary">Log Today's Data</h3>
                  <button 
                    onClick={() => setShowAddEntryForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmitEntry} className="space-y-4">
                  {/* Cigarettes */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Cigarettes Smoked Today</label>
                    <input
                      type="number"
                      min="0"
                      value={newEntry.count}
                      onChange={(e) => setNewEntry({ ...newEntry, count: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 5"
                      required
                    />
                  </div>

                  {/* Sleep Hours */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Sleep Hours Last Night</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      step="0.5"
                      value={newEntry.sleepHours}
                      onChange={(e) => setNewEntry({ ...newEntry, sleepHours: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 7.0"
                    />
                  </div>

                  {/* Mood */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">How are you feeling?</label>
                    <select
                      value={newEntry.mood}
                      onChange={(e) => setNewEntry({ ...newEntry, mood: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="great">😄 Great</option>
                      <option value="good">🙂 Good</option>
                      <option value="okay">😐 Okay</option>
                      <option value="bad">😟 Bad</option>
                      <option value="terrible">😣 Terrible</option>
                    </select>
                  </div>

                  {/* Craving Intensity */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-gray-700 font-medium">Craving Intensity</label>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{newEntry.cravingIntensity}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">1 = no craving, 10 = intense</p>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.cravingIntensity}
                      onChange={(e) => setNewEntry({ ...newEntry, cravingIntensity: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>10</span></div>
                  </div>

                  {/* Stress Level */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-gray-700 font-medium">Stress Level</label>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{newEntry.stressLevel}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">1 = relaxed, 10 = very stressed</p>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.stressLevel}
                      onChange={(e) => setNewEntry({ ...newEntry, stressLevel: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>10</span></div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Notes (optional)</label>
                    <textarea
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Any triggers or challenges today?"
                    />
                  </div>

                  {/* Triggers */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">What triggered your cravings today?</label>
                    <div className="flex flex-wrap gap-2">
                      {['Stress','Boredom','After Meals','Social Situations','Alcohol','Work Pressure','Loneliness','Morning Routine'].map(t => {
                        const active = newEntry.triggers.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewEntry(prev => ({
                              ...prev,
                              triggers: active ? prev.triggers.filter(x => x !== t) : [...prev.triggers, t]
                            }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              active
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-primary/50'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Biometrics — collapsible */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowBiometrics(b => !b)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-gray-600">
                        📊 Optional — Body Stats Today
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${showBiometrics ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showBiometrics && (
                      <div className="px-4 py-4 space-y-3 bg-white">
                        <p className="text-xs text-gray-400 mb-3">All fields are optional. Fill in what you have from your fitness tracker or smartwatch.</p>
                        {[
                          { key: 'heart_rate_avg',        label: '❤️ Heart Rate (avg bpm)',       placeholder: 'e.g. 72',  min: 30,  max: 220 },
                          { key: 'resting_heart_rate',    label: '💤 Resting Heart Rate (bpm)',   placeholder: 'e.g. 60',  min: 30,  max: 220 },
                          { key: 'heart_rate_variability',label: '📈 HRV (ms)',                   placeholder: 'e.g. 45',  min: 10,  max: 100 },
                          { key: 'step_count',            label: '🚶 Steps Today',                placeholder: 'e.g. 8000',min: 0,   max: 80000 },
                          { key: 'active_minutes',        label: '⚡ Active Minutes',             placeholder: 'e.g. 30',  min: 0,   max: 300 },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                            <input
                              type="number"
                              min={field.min}
                              max={field.max}
                              placeholder={field.placeholder}
                              value={(newEntry as any)[field.key]}
                              onChange={e => setNewEntry(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 pt-2">
                    <Button type="button" variant="outline" fullWidth onClick={() => setShowAddEntryForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" fullWidth isLoading={isSubmitting} className="bg-gradient-to-r from-primary to-secondary">
                      Save Entry
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SOS Modal */}
        {showSOS && <SOSModal onClose={() => setShowSOS(false)} />}

        {/* Connect Device Modal */}
        {showConnectDevice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-primary">⌚ Connect a Device</h3>
                  <button
                    onClick={() => setShowConnectDevice(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { name: 'Apple Watch', emoji: '⌚', bg: 'bg-gray-50' },
                    { name: 'Fitbit',      emoji: '📟', bg: 'bg-blue-50' },
                    { name: 'Garmin',      emoji: '🏃', bg: 'bg-green-50' },
                    { name: 'Samsung Health', emoji: '💙', bg: 'bg-indigo-50' },
                  ].map(device => (
                    <div
                      key={device.name}
                      className={`${device.bg} border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 relative`}
                    >
                      <span className="text-3xl">{device.emoji}</span>
                      <p className="text-sm font-semibold text-gray-700 text-center">{device.name}</p>
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Coming Soon
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-xl px-4 py-3">
                  You can log your body stats manually using the <span className="font-semibold text-primary">Log Today</span> button.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}