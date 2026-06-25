'use client';

import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import ChatBot from '../../components/ChatBot';
import { generateSmokingCessationPlan } from '../../services/gemini';
import Card from '@/components/ui/Card';

type UserData = {
  age: number;
  cigarettesPerDay: number;
  cigaretteType: string;
};

type Plan = {
  weeklyTargets?: number[];
  strategies?: string[];
  weeklyPlans?: {
    week: number;
    goal: string;
    techniques: string[];
    dailyTarget: number;
  }[];
  weeklyGoals?: {
    week: number;
    dailyLimit: number;
    strategies: string[];
    tips: string[];
  }[];
  healthImprovements?: {
    day: number;
    improvement: string;
  }[];
};

const ChatbotPage = () => {
  const [planGenerated, setPlanGenerated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChatbotComplete = async (data: UserData) => {
    setUserData(data);
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the Gemini service to generate a real plan through the backend
      console.log('Sending user data to generate plan:', data);
      const plan = await generateSmokingCessationPlan(data);
      console.log('Received plan from backend:', plan);
      
      // Safety check to verify the data structure
      if (!plan || (typeof plan !== 'object')) {
        throw new Error('Received invalid plan data from backend');
      }
      
      setGeneratedPlan(plan);
      setPlanGenerated(true);
    } catch (err) {
      console.error("Failed to generate plan:", err);
      setError("Failed to generate your plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">AI Smoking Cessation Assistant</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg text-gray-600">Generating your personalized plan...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment as our AI analyzes your data</p>
          </div>
        ) : error ? (
          <div className="max-w-lg mx-auto">
            <Card variant="purple" className="p-6">
              <h3 className="text-lg font-bold mb-2">Error</h3>
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            </Card>
          </div>
        ) : !planGenerated ? (
          <>
            <div className="max-w-2xl mx-auto mb-8">
              <p className="text-gray-700 text-center text-lg">
                Our AI assistant will help you create a personalized 8-week plan to quit smoking based on your habits and preferences.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <ChatBot onComplete={handleChatbotComplete} className="w-full" />
            </div>
          </>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-primary to-secondary p-6 ">
                <h2 className="text-2xl font-bold">Your Personalized Plan is Ready!</h2>
                <p className="opacity-90">Based on your profile, we've created an 8-week cessation plan tailored to your needs.</p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-6 p-4 bg-primary/5 rounded-lg">
                  <div className="mr-4 bg-primary/10 p-3 rounded-full">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Your Profile</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Age:</span> <span className="font-medium">{userData?.age}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Daily cigarettes:</span> <span className="font-medium">{userData?.cigarettesPerDay}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cigarette type:</span> <span className="font-medium">{userData?.cigaretteType}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Your 8-Week Journey</h3>
                
                <div className="space-y-4">
                  {generatedPlan?.weeklyPlans ? (
                    // Using the old weeklyPlans format
                    generatedPlan.weeklyPlans.map((week, index) => (
                      <div key={week.week} 
                        className={`border border-gray-200 rounded-lg p-4 ${
                          index === 0 ? 'bg-blue-50/50' : 'bg-gray-50'
                        }`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className={`font-medium ${index === 0 ? 'text-primary' : 'text-gray-500'}`}>
                            Week {week.week}: {week.goal.split(':')[1]}
                          </h4>
                          {index === 0 && (
                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">Current</span>
                          )}
                        </div>
                        <p className={`text-sm ${index === 0 ? 'text-gray-600' : 'text-gray-500'}`}>
                          {week.dailyTarget > 0 
                            ? `Reduce to ${week.dailyTarget} cigarettes per day. Focus on: ${week.techniques[0]}`
                            : `Maintain smoke-free status. Focus on: ${week.techniques[0]}`
                          }
                        </p>
                        {index === 0 && week.techniques.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {week.techniques.slice(0, 3).map((technique, i) => (
                              <span key={i} className="bg-gray-100 text-xs px-2 py-1 rounded-full">
                                {technique.split(':').pop()?.trim().substring(0, 20) || technique.substring(0, 20)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : generatedPlan?.weeklyGoals ? (
                    // Using the new weeklyGoals format from backend
                    generatedPlan.weeklyGoals.map((week, index) => (
                      <div key={week.week} 
                        className={`border border-gray-200 rounded-lg p-4 ${
                          index === 0 ? 'bg-blue-50/50' : 'bg-gray-50'
                        }`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className={`font-medium ${index === 0 ? 'text-primary' : 'text-gray-500'}`}>
                            Week {week.week}: {week.dailyLimit} cigarettes per day
                          </h4>
                          {index === 0 && (
                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">Current</span>
                          )}
                        </div>
                        <p className={`text-sm ${index === 0 ? 'text-gray-600' : 'text-gray-500'}`}>
                          {week.dailyLimit > 0 
                            ? `Reduce to ${week.dailyLimit} cigarettes per day. Focus on: ${week.strategies[0] || 'Gradual reduction'}`
                            : `Maintain smoke-free status. Focus on: ${week.strategies[0] || 'Staying smoke-free'}`
                          }
                        </p>
                        {index === 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {week.strategies.slice(0, 2).map((strategy, i) => (
                              <span key={i} className="bg-gray-100 text-xs px-2 py-1 rounded-full">
                                {strategy.split(':').pop()?.trim().substring(0, 20) || strategy.substring(0, 20)}
                              </span>
                            ))}
                            {week.tips.slice(0, 1).map((tip, i) => (
                              <span key={i} className="bg-blue-50 text-xs px-2 py-1 rounded-full text-blue-600">
                                {tip.split(':').pop()?.trim().substring(0, 20) || tip.substring(0, 20)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No plan data available. Please try again.</p>
                  )}
                </div>
                
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ChatbotPage;