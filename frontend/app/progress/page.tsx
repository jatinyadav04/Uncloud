'use client';

import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useUser } from '../../contexts/UserContext';
import { useRouter } from 'next/navigation';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Real data interfaces
interface GoalStats {
  achieved: number;
  missed: number;
  achievementRate: number;
  weeklyTargets: number[];
  weeklyActuals: (number | null)[];
  dailyEntries: Array<{
    date: string;
    target: number;
    actual: number;
  }>;
}

const dummyTriggerStats = {
  stress: 42,
  social: 23,
  boredom: 18,
  meals: 12,
  alcohol: 5
};

const dummyHealthImprovements = [
  { day: 1, improvement: "Carbon monoxide levels in blood return to normal" },
  { day: 2, improvement: "Nicotine is eliminated from the body" },
  { day: 3, improvement: "Sense of smell and taste begin to improve" },
  { day: 14, improvement: "Circulation improves and lung function increases" },
  { day: 30, improvement: "Lungs begin to cleanse themselves" },
  { day: 60, improvement: "Risk of heart attack begins to decrease" },
];

export default function ProgressPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [chartData, setChartData] = useState<any>(null);
  const [triggerData, setTriggerData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  // Real data state
  const [goalStats, setGoalStats] = useState<GoalStats>({
    achieved: 0,
    missed: 0,
    achievementRate: 0,
    weeklyTargets: [],
    weeklyActuals: [],
    dailyEntries: [],
  });
  
  // User data state for progress calculations
  const [userData, setUserData] = useState({
    startDate: '',
    currentWeek: 1,
    streak: 0,
    streakStartDate: '',
    totalDays: 0,
    remainingDays: 0,
    progressPercentage: 0,
    totalWeeks: 8,
  });

  // Redirect to home if no user is logged in
  if (!userLoading && !user) {
    router.push('/');
    return null;
  }

  // Load real data from API
  useEffect(() => {
    if (!user) return;
    
    const loadProgressData = async () => {
      try {
        const userId = user.userId;
        const api = (await import('../../services/api')).default;
        
        // Load user data, daily logs, and plan
        const [userData, dailyLogs, plan] = await Promise.all([
          api.getUser(userId),
          api.getDailyLogs(userId),
          api.getPlan(userId)
        ]);
        
        // Calculate real goal statistics
        const startDate = new Date(userData.profile.startDate);
        const today = new Date();
        const startDateFixed = new Date(userData.profile.startDate + 'T00:00:00'); // Ensure consistent timezone
        const todayFixed = new Date();
        todayFixed.setHours(0, 0, 0, 0); // Reset to start of day for consistent comparison
        
        const daysDiff = Math.floor((todayFixed.getTime() - startDateFixed.getTime()) / (1000 * 60 * 60 * 24));
        
        // Ensure we're always at least in week 1 (day 0 = week 1, day 7 = week 2, etc.)
        const totalWeeks = plan.weeklyGoals?.length || 8;
        const currentWeek = Math.min(Math.max(Math.floor(Math.max(daysDiff, 0) / 7) + 1, 1), totalWeeks);
        
        // Calculate streak (consecutive days meeting targets or smoke-free)
        let streak = 0;
        let streakStartDate = '';
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
              if (i === 0) { // Most recent entry
                streakStartDate = groupedLog.date;
              }
            } else {
              break; // Streak broken
            }
          }
        }
        
        // Calculate journey progress
        const totalJourneyDays = totalWeeks * 7;
        const completedDays = Math.min(daysDiff, totalJourneyDays);
        const remainingDays = Math.max(0, totalJourneyDays - completedDays);
        const progressPercentage = Math.round((completedDays / totalJourneyDays) * 100);
        
        // Update user data state
        setUserData({
          startDate: userData.profile.startDate,
          currentWeek: currentWeek,
          streak: Math.max(0, streak),
          streakStartDate: streakStartDate,
          totalDays: totalJourneyDays,
          remainingDays: remainingDays,
          progressPercentage: progressPercentage,
          totalWeeks: totalWeeks,
        });
        
        let achieved = 0;
        let missed = 0;
        const dailyEntries = [];
        
        // Sort daily logs by date to ensure chronological order
        const sortedLogs = dailyLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Group logs by date and sum cigarettes for the same date (like dashboard does)
        const groupedLogs = sortedLogs.reduce((acc, log) => {
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
        
        // Convert grouped logs to daily entries and calculate achievements
        Object.values(groupedLogs).forEach(groupedLog => {
          const logDate = new Date(groupedLog.date + 'T00:00:00'); // Ensure local timezone interpretation
          const daysFromStart = Math.floor((logDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.floor(daysFromStart / 7);
          const target = plan.weeklyGoals?.[weekIndex]?.dailyLimit || userData.profile.cigarettesPerDay;
          
          dailyEntries.push({
            date: logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // Proper date format
            target: target,
            actual: groupedLog.cigarettesSmoked
          });
          
          if (groupedLog.cigarettesSmoked <= target) {
            achieved++;
          } else {
            missed++;
          }
        });
        
        // Calculate weekly actuals based on real data
        const weeklyActuals = [];
        for (let week = 0; week < totalWeeks; week++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const weekLogs = Object.values(groupedLogs).filter(log => {
            const logDate = new Date(log.date + 'T00:00:00'); // Ensure local timezone interpretation
            return logDate >= weekStart && logDate <= weekEnd;
          });
          
          if (weekLogs.length > 0) {
            const totalCigarettes = weekLogs.reduce((sum, log) => sum + log.cigarettesSmoked, 0);
            
            // Calculate days in this week (might be partial week for current week)
            const today = new Date();
            const actualWeekEnd = week === Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) 
              ? today 
              : weekEnd;
            const daysInWeek = Math.min(7, Math.floor((actualWeekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            
            // Use logged days average (more accurate for tracking actual consumption)
            const averagePerLoggedDay = Math.round((totalCigarettes / weekLogs.length) * 10) / 10;
            weeklyActuals.push(averagePerLoggedDay);
          } else {
            weeklyActuals.push(null);
          }
        }
        
        // Calculate achievement rate
        const totalDays = achieved + missed;
        const achievementRate = totalDays > 0 ? Math.round((achieved / totalDays) * 100) : 0;
        
        // Update goal stats with real values
        setGoalStats({
          achieved,
          missed,
          achievementRate,
          weeklyTargets: plan.weeklyGoals?.map(goal => goal.dailyLimit) || [],
          weeklyActuals: weeklyActuals,
          dailyEntries,
        });
        
        // Create doughnut chart data for goal achievement rate
        const goalData = {
          labels: ['Achieved', 'Missed'],
          datasets: [
            {
              data: [achieved, missed],
              backgroundColor: ['#8A2BE2', '#e2e2e2'],
              borderColor: ['#8A2BE2', '#e2e2e2'],
              borderWidth: 1,
            },
          ],
        };

        // Create bar chart data for trigger analysis (using dummy data for now)
        const triggerLabels = Object.keys(dummyTriggerStats);
        const triggerValues = Object.values(dummyTriggerStats);
        const triggerData = {
          labels: triggerLabels,
          datasets: [
            {
              label: 'Triggers',
              data: triggerValues,
              backgroundColor: 'rgba(147, 112, 219, 0.6)',
              borderColor: '#8A2BE2',
              borderWidth: 1,
            },
          ],
        };

        setChartData(goalData);
        setTriggerData(triggerData);

      } catch (error) {
        console.error('Error loading progress data:', error);
        // Set empty data if API fails
        setGoalStats({
          achieved: 0,
          missed: 0,
          achievementRate: 0,
          weeklyTargets: [],
          weeklyActuals: [],
          dailyEntries: [],
        });
        
        setUserData({
          startDate: '',
          currentWeek: 1,
          streak: 0,
          streakStartDate: '',
          totalDays: 56,
          remainingDays: 56,
          progressPercentage: 0,
        });
        
        const goalData = {
          labels: ['Achieved', 'Missed'],
          datasets: [
            {
              data: [0, 0],
              backgroundColor: ['#8A2BE2', '#e2e2e2'],
              borderColor: ['#8A2BE2', '#e2e2e2'],
              borderWidth: 1,
            },
          ],
        };

        const triggerLabels = Object.keys(dummyTriggerStats);
        const triggerValues = Object.values(dummyTriggerStats);
        const triggerData = {
          labels: triggerLabels,
          datasets: [
            {
              label: 'Triggers',
              data: triggerValues,
              backgroundColor: 'rgba(147, 112, 219, 0.6)',
              borderColor: '#8A2BE2',
              borderWidth: 1,
            },
          ],
        };

        setChartData(goalData);
        setTriggerData(triggerData);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProgressData();
  }, [user, refreshTrigger]);

  // Add refresh function
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    const reportElement = reportContentRef.current;

    if (reportElement) {
      const canvas = await html2canvas(reportElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
      pdf.save('progress-report.pdf');
    }

    setIsDownloading(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-600">Loading your progress data...</p>
        </div>
      </MainLayout>
    );
  }

  const renderDailyProgress = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-primary/10 text-gray-700">
              <th className="py-2 px-4 text-left rounded-tl-lg">Date</th>
              <th className="py-2 px-4 text-left">Target</th>
              <th className="py-2 px-4 text-left">Actual</th>
              <th className="py-2 px-4 text-left rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {goalStats.dailyEntries.slice().reverse().map((entry, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{entry.date}</td>
                <td className="py-3 px-4">{entry.target}</td>
                <td className="py-3 px-4">{entry.actual}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.actual <= entry.target 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entry.actual <= entry.target ? 'Achieved' : 'Exceeded'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWeeklyProgress = () => {
    // Group daily entries by actual weeks
    const weeklyData = [];
    const startDate = new Date(userData.startDate);
    
    for (let week = 0; week < Math.min(userData.totalWeeks ?? 8, userData.currentWeek); week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Find entries for this week using the same grouped logic
      const weekEntries = goalStats.dailyEntries.filter(entry => {
        // Convert entry date back to Date object for comparison
        const entryDate = new Date(entry.date + ', ' + new Date().getFullYear());
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
      
      // Group entries by date for this week to get accurate count
      const groupedWeekEntries = weekEntries.reduce((acc, entry) => {
        const dateKey = entry.date;
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: entry.date,
            target: entry.target,
            actual: 0
          };
        }
        acc[dateKey].actual += entry.actual;
        return acc;
      }, {} as Record<string, { date: string; target: number; actual: number }>);
      
      const uniqueWeekEntries = Object.values(groupedWeekEntries);
      
      const weekTarget = goalStats.weeklyTargets[week];
      const weekActual = goalStats.weeklyActuals[week];
      
      if (weekTarget !== undefined) {
        weeklyData.push({
          weekNum: week + 1,
          weekTarget,
          weekActual,
          weekEntries: uniqueWeekEntries,
          hasData: uniqueWeekEntries.length > 0
        });
      }
    }
    
    return (
      <div className="space-y-4">
        {weeklyData.map(({ weekNum, weekTarget, weekActual, weekEntries, hasData }) => (
          <Card key={weekNum} variant="purple" hoverable className="overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Week {weekNum}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                weekActual && weekActual <= weekTarget 
                  ? 'bg-green-100 text-green-800' 
                  : weekActual 
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {weekActual 
                  ? weekActual <= weekTarget 
                    ? 'Target Achieved' 
                    : 'Target Missed'
                  : hasData ? 'In Progress' : 'No Data'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Daily Target</p>
                <p className="text-xl font-bold text-primary">{weekTarget} cigarettes</p>
                
                {weekActual && (
                  <>
                    <p className="text-sm text-gray-600 mt-3 mb-1">Average per Logged Day</p>
                    <p className={`text-xl font-bold ${
                      weekActual <= weekTarget ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {weekActual} cigarettes
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {weekEntries.length} day{weekEntries.length !== 1 ? 's' : ''} logged
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Daily Breakdown</h4>
                <div className="space-y-2">
                  {weekEntries.length > 0 ? (
                    weekEntries.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm">{entry.date}</span>
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            entry.actual <= entry.target ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.actual}
                          </span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-sm text-gray-600">{entry.target}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No entries for this week yet</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{weekActual ? '100%' : hasData ? '50%' : '0%'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2" 
                  style={{ width: weekActual ? '100%' : hasData ? '50%' : '0%' }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8" ref={reportContentRef}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Your Progress</h1>
          <Button 
            onClick={handleDownloadReport}
            isLoading={isDownloading}
            className="mt-2 md:mt-0 flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Progress Report
          </Button>
        </div>
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="gradient" hoverable className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-600 font-medium">Achievement Rate</h3>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">Goals</span>
            </div>
            <div className="flex items-center">
              <div className="w-20 h-20">
                {chartData && (
                  <Doughnut 
                    data={chartData}
                    options={{
                      cutout: '70%',
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(138, 43, 226, 0.8)',
                        }
                      }
                    }}
                  />
                )}
              </div>
              <div className="ml-4">
                <span className="text-3xl font-bold text-primary">{goalStats.achievementRate}%</span>
                <p className="text-sm text-gray-500">Daily targets achieved</p>
              </div>
            </div>
          </Card>
          
          <Card variant="gradient" hoverable className="flex flex-col text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Current Streak</h3>
              <span className="bg-primary/10 px-2 py-1 rounded text-xs font-medium">Days</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold">{userData.streak}</span>
                <span className="text-lg ml-1">days</span>
                <p className="text-sm ">
                  {userData.streak > 0 
                    ? `${userData.streak} consecutive days on target` 
                    : 'No current streak'}
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
            </div>
          </Card>
          
          <Card variant="gradient" hoverable className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-600 font-medium">Journey Progress</h3>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">Week {userData.currentWeek}/{userData.totalWeeks ?? 8}</span>
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Progress</span>
                <span>{userData.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary rounded-full h-3" 
                  style={{ width: `${userData.progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 pt-1">
                {Math.max(0, userData.totalDays - userData.remainingDays)} days completed, {userData.remainingDays} days remaining
              </p>
            </div>
          </Card>
        </div>
        
        {/* Tabs navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-3 px-6 font-medium ${
              activeTab === 'daily'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            Daily Progress
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-3 px-6 font-medium ${
              activeTab === 'weekly'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            Weekly Progress
          </button>
        </div>
        
        {/* Tab content */}
        <div className="mb-8">
          {activeTab === 'daily' ? renderDailyProgress() : renderWeeklyProgress()}
        </div>
        
        {/* Health Improvements */}
        <Card className="mb-8" variant="accent">
          <h2 className="text-xl font-bold mb-6 text-primary">Health Improvements Timeline</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-primary/30"></div>
            
            <div className="space-y-6">
              {dummyHealthImprovements.map((item, index) => (
                <div key={index} className="flex">
                  <div className="flex-shrink-0 relative">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white z-10 relative">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-grow">
                    <span className="font-bold text-primary">Day {item.day}</span>
                    <p className="mt-1">{item.improvement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        
        {/* Triggers Analysis */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-6 text-primary">Smoking Triggers Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="mb-4 text-gray-600">
                Understanding your triggers can help you develop effective strategies to manage cravings and avoid relapse. Based on your journal entries, here are your most common smoking triggers:
              </p>
              <div className="space-y-3 mt-6">
                {Object.entries(dummyTriggerStats).map(([trigger, count], index) => (
                  <div key={trigger} className="flex items-center">
                    <div className="w-24 text-sm font-medium">{trigger}</div>
                    <div className="flex-1 mx-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(count as number / 42) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-sm text-gray-600">{count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-64 flex items-center justify-center">
              {triggerData && (
                <Bar 
                  data={triggerData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: 'rgba(138, 43, 226, 0.8)',
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}