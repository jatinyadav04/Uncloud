'use client';

import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

const CommunityPage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Community</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Discussion Board</h2>
                <button className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  New Post
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <div className="flex items-start">
                    <img src="https://randomuser.me/api/portraits/women/42.jpg" alt="User" className="w-10 h-10 rounded-full mr-3" />
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">Sarah Lin</h3>
                        <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full ml-2">3 weeks smoke-free</span>
                      </div>
                      <p className="text-gray-500 text-sm">Posted 8 hours ago</p>
                      <div className="mt-2">
                        <h4 className="font-medium mb-2">Tips for dealing with cravings at social events?</h4>
                        <p className="text-gray-600">I've got a wedding to attend this weekend, and I'm worried about being around other smokers. What strategies have worked for you in social settings?</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-3">
                        <button className="text-gray-500 hover:text-primary flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                          </svg>
                          18 Likes
                        </button>
                        <button className="text-gray-500 hover:text-primary flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
                          </svg>
                          7 Replies
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-b pb-6">
                  <div className="flex items-start">
                    <img src="https://randomuser.me/api/portraits/men/55.jpg" alt="User" className="w-10 h-10 rounded-full mr-3" />
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">David Chen</h3>
                        <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full ml-2">2 months smoke-free</span>
                      </div>
                      <p className="text-gray-500 text-sm">Posted 1 day ago</p>
                      <div className="mt-2">
                        <h4 className="font-medium mb-2">My journey so far - breathing easier!</h4>
                        <p className="text-gray-600">Just wanted to share a win - I jogged my first full mile yesterday without stopping. Two months ago I couldn't make it halfway down the block without coughing. Stay strong everyone!</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-3">
                        <button className="text-gray-500 hover:text-primary flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                          </svg>
                          32 Likes
                        </button>
                        <button className="text-gray-500 hover:text-primary flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
                          </svg>
                          14 Replies
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            {/* Community Stats */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Community Stats</h2>
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">1,248</p>
                  <p className="text-sm text-gray-600">Active Members</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-primary">86</p>
                    <p className="text-xs text-gray-600">Posts Today</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-primary">12k+</p>
                    <p className="text-xs text-gray-600">Total Success Stories</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Contributors */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Contributors</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img src="https://randomuser.me/api/portraits/women/33.jpg" alt="User" className="w-8 h-8 rounded-full mr-3 border border-primary" />
                    <div>
                      <p className="font-medium text-gray-800">Maria F.</p>
                      <p className="text-xs text-gray-500">156 helpful posts</p>
                    </div>
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    #1
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img src="https://randomuser.me/api/portraits/men/45.jpg" alt="User" className="w-8 h-8 rounded-full mr-3 border border-primary" />
                    <div>
                      <p className="font-medium text-gray-800">James T.</p>
                      <p className="text-xs text-gray-500">132 helpful posts</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                    #2
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="User" className="w-8 h-8 rounded-full mr-3 border border-primary" />
                    <div>
                      <p className="font-medium text-gray-800">Lucia R.</p>
                      <p className="text-xs text-gray-500">121 helpful posts</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                    #3
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CommunityPage;