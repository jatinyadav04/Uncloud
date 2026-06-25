'use client';

import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

const ResourcesPage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Resources</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Educational Resources */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Educational Content</h2>
            </div>
            <ul className="space-y-3">
              <li>
                <a href="https://www.cdc.gov/tobacco/data_statistics/fact_sheets/health_effects/effects_cig_smoking/index.htm" target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="mr-3 text-lg">📊</span>
                  <span className="flex-1">Health Effects of Smoking (CDC)</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </a>
              </li>
              <li>
                <a href="https://smokefree.gov/quit-smoking/why-you-should-quit/benefits-of-quitting" target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="mr-3 text-lg">📈</span>
                  <span className="flex-1">Benefits of Quitting Timeline</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </a>
              </li>
              <li>
                <a href="https://www.mayoclinic.org/diseases-conditions/nicotine-dependence/symptoms-causes/syc-20351584" target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="mr-3 text-lg">🧠</span>
                  <span className="flex-1">Understanding Nicotine Addiction</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </a>
              </li>
            </ul>
          </div>
          
          {/* Videos */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Video Resources</h2>
            </div>
            <div className="space-y-4">
              <a href="https://www.youtube.com/watch?v=wHCM26GSyOE" target="_blank" rel="noopener noreferrer" className="block">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                  <img src="https://i.ytimg.com/vi/wHCM26GSyOE/hqdefault.jpg" alt="What Happens When You Quit Smoking" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary/80 rounded-full flex items-center justify-center text-white hover:bg-primary transition-colors cursor-pointer">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
              <h3 className="font-medium">What Happens When You Quit Smoking</h3>
              <p className="text-gray-600 text-sm">AsapSCIENCE explains the timeline of health benefits and body changes when you quit smoking.</p>
            </div>
          </div>
          
          {/* Tools */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Interactive Tools</h2>
            </div>
            <div className="space-y-3">
              <a href="https://smokefree.gov/tools-tips/how-to-quit/quit-smoking-calculator" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <h3 className="font-medium flex items-center">
                  <span className="mr-2">💰</span>
                  Savings Calculator
                </h3>
                <p className="text-gray-600 text-sm mt-1">See how much money you'll save by quitting smoking.</p>
              </a>
              <a href="/dashboard" className="block p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <h3 className="font-medium flex items-center">
                  <span className="mr-2">❤️</span>
                  Health Tracker
                </h3>
                <p className="text-gray-600 text-sm mt-1">Monitor your health improvements over time.</p>
              </a>
              <a href="/progress" className="block p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <h3 className="font-medium flex items-center">
                  <span className="mr-2">🏆</span>
                  Achievement System
                </h3>
                <p className="text-gray-600 text-sm mt-1">Earn badges and track your milestones.</p>
              </a>
            </div>
          </div>
          
          {/* Support Resources */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Support Options</h2>
            </div>
            <ul className="divide-y">
              <li className="py-3">
                <h3 className="font-medium">National Quitline</h3>
                <p className="text-gray-600 text-sm mt-1">Free phone counseling: <a href="tel:1-800-784-8669" className="text-primary font-medium">1-800-QUIT-NOW</a></p>
              </li>
              <li className="py-3">
                <h3 className="font-medium">Local Support Groups</h3>
                <p className="text-gray-600 text-sm mt-1">
                  <a href="https://www.nicotine-anonymous.org/find-a-meeting.html" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">Find Nicotine Anonymous meetings</a>
                </p>
              </li>
              <li className="py-3">
                <h3 className="font-medium">Online Support</h3>
                <p className="text-gray-600 text-sm mt-1">
                  <a href="/support" className="text-primary font-medium">Chat with our AI Support Assistant</a>
                </p>
              </li>
            </ul>
          </div>
          
          {/* Expert Advice */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Expert Advice</h2>
            </div>
            <div className="space-y-4">
              <div className="flex">
                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Expert" className="w-12 h-12 rounded-full mr-4" />
                <div>
                  <h3 className="font-medium">Dr. Michael Chen</h3>
                  <p className="text-gray-600 text-sm">Addiction Specialist</p>
                </div>
              </div>
              <blockquote className="italic text-gray-600 border-l-4 border-primary pl-4 py-2">
                "Remember that quitting isn't just about willpower—it's about changing habits and finding proper substitutes for the routines that trigger your smoking."
              </blockquote>
              <a href="https://www.mayoclinic.org/healthy-lifestyle/quit-smoking/in-depth/quit-smoking/art-20045452" target="_blank" rel="noopener noreferrer" className="text-primary font-medium flex items-center text-sm">
                Read more expert advice
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </a>
            </div>
          </div>
          
          {/* Mobile Apps */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Recommended Apps</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <a href="https://play.google.com/store/apps/details?id=com.fewlaps.quitnow" target="_blank" rel="noopener noreferrer" className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-3 flex items-center justify-center text-white text-xl">
                  Q
                </div>
                <h3 className="font-medium">QuitNow!</h3>
                <div className="flex text-yellow-400 text-xs mt-1">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Track your progress and connect with others</p>
              </a>
              <a href="https://smokefree.gov/tools-tips/apps/smokefree-app" target="_blank" rel="noopener noreferrer" className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl mb-3 flex items-center justify-center text-white text-xl">
                  S
                </div>
                <h3 className="font-medium">SmokeFree</h3>
                <div className="flex text-yellow-400 text-xs mt-1">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Official US government quit smoking app</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ResourcesPage;