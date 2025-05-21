

import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const EmotionTrackingReport = ({ gameData }) => {
  // Refs for chart canvases
  const emotionPieChartRef = useRef(null);
  const emotionBarChartRef = useRef(null);
  
  // Chart instances
  const chartInstancesRef = useRef({
    pieChart: null,
    barChart: null
  });

  // Define emotion colors
  const emotionColors = {
    happy: '#10b981', // green
    sad: '#6366f1',   // indigo
    disgust: '#84cc16', // lime
    neutral: '#94a3b8', // slate
    fear: '#8b5cf6',  // violet
    angry: '#ef4444', // red
    surprised: '#f59e0b' // amber
  };

  // Initialize and update charts when component mounts
  useEffect(() => {
    // Clean up previous chart instances to prevent memory leaks
    const cleanupCharts = () => {
      Object.values(chartInstancesRef.current).forEach(chart => {
        if (chart) {
          chart.destroy();
        }
      });
    };

    // Initialize charts
    if (emotionPieChartRef.current && emotionBarChartRef.current) {
      cleanupCharts();
      
      // Get emotion data from props or use sample data if not available
      const emotionData = gameData.emotionCounts || {
        happy: 42,
        sad: 15,
        disgust: 8,
        neutral: 20,
        fear: 5,
        angry: 12,
        surprised: 18
      };
      
      // Calculate total for percentages
      const totalEmotions = Object.values(emotionData).reduce((sum, count) => sum + count, 0);
      
      // Prepare data for charts
      const labels = Object.keys(emotionData);
      const counts = Object.values(emotionData);
      const percentages = counts.map(count => (count / totalEmotions * 100).toFixed(1));
      const colors = labels.map(emotion => emotionColors[emotion] || '#94a3b8');
      
      // Initialize Emotion Pie Chart
      chartInstancesRef.current.pieChart = new Chart(emotionPieChartRef.current, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: percentages,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: {
                  family: "'Poppins', sans-serif",
                  size: 12
                },
                padding: 20
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed + '%';
                }
              }
            }
          },
          cutout: '70%'
        }
      });
      
      // Initialize Emotion Bar Chart
      chartInstancesRef.current.barChart = new Chart(emotionBarChartRef.current, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Emotion Counts',
            data: counts,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.1', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Count'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Emotions'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Emotion Counts for Session',
              font: {
                size: 16
              }
            }
          }
        }
      });
    }

    // Cleanup function to destroy charts when component unmounts
    return () => {
      cleanupCharts();
    };
  }, [gameData]);

  // Generate emotion cards from data
  const generateEmotionCards = () => {
    // Get emotion data from props or use sample data if not available
    const emotionData = gameData.emotionCounts || {
      happy: 42,
      sad: 15,
      disgust: 8,
      neutral: 20,
      fear: 5,
      angry: 12,
      surprised: 18
    };
    
    // Calculate total for percentages
    const totalEmotions = Object.values(emotionData).reduce((sum, count) => sum + count, 0);
    
    // Create cards data
    const cards = Object.entries(emotionData).map(([emotion, count]) => {
      const percentage = (count / totalEmotions * 100).toFixed(1);
      
      // Determine description based on percentage
      let description = 'Occasional';
      if (percentage > 30) description = 'Dominant emotion';
      else if (percentage > 20) description = 'Secondary emotion';
      else if (percentage > 10) description = 'Frequent';
      
      // Map emotion to color
      const color = emotion === 'happy' ? 'green' :
                    emotion === 'sad' ? 'blue' :
                    emotion === 'disgust' ? 'lime' :
                    emotion === 'neutral' ? 'slate' :
                    emotion === 'fear' ? 'violet' :
                    emotion === 'angry' ? 'red' : 'amber';
                    
      return {
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        description,
        count,
        percentage: Number(percentage),
        color,
        borderColor: `border-${color}-500`,
        bgColor: `bg-${color}-100`,
        textColor: `text-${color}-800`,
        barColor: `bg-${color}-500`
      };
    });
    
    // Sort by percentage (highest first)
    return cards.sort((a, b) => b.percentage - a.percentage);
  };

  // Custom CSS styles
  const customStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    
    .emotion-card {
      transition: all 0.3s ease;
    }
    
    .emotion-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    
    .chart-container {
      position: relative;
      height: 350px;
      width: 100%;
    }
    
    .face-mesh-container {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto;
    }
    
    .face-mesh {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      overflow: hidden;
      background-color: #e0e7ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }
    
    .pulse {
      animation: pulse 2s infinite;
    }
  `;

  // Get emotion cards
  const emotionCards = generateEmotionCards();

  return (
    <div className="min-h-screen">
      {/* Add custom styles */}
      <style>{customStyles}</style>
      
      {/* Student Info & Summary */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="face-mesh-container">
              <div className="face-mesh pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
                  {/* Simple face mesh representation */}
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                  <circle cx="35" cy="40" r="5" fill="#6366f1" />
                  <circle cx="65" cy="40" r="5" fill="#6366f1" />
                  <path d="M 30 65 Q 50 80 70 65" fill="none" stroke="#6366f1" strokeWidth="2" />
                  {/* Mesh points */}
                  <circle cx="25" cy="30" r="1" fill="#6366f1" />
                  <circle cx="75" cy="30" r="1" fill="#6366f1" />
                  <circle cx="50" cy="30" r="1" fill="#6366f1" />
                  <circle cx="30" cy="50" r="1" fill="#6366f1" />
                  <circle cx="70" cy="50" r="1" fill="#6366f1" />
                  <circle cx="50" cy="70" r="1" fill="#6366f1" />
                  <circle cx="40" cy="60" r="1" fill="#6366f1" />
                  <circle cx="60" cy="60" r="1" fill="#6366f1" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{gameData.studentName}</h2>
              <p className="text-gray-600">Session: {gameData.sessionNumber} • Date: {gameData.sessionDate}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-xs text-indigo-600 font-medium">SESSION DURATION</p>
              <p className="text-xl font-bold text-gray-800">{gameData.sessionDuration}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600 font-medium">DOMINANT EMOTION</p>
              <p className="text-xl font-bold text-gray-800">{emotionCards[0]?.name || 'Neutral'}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-xs text-amber-600 font-medium">SCORE</p>
              <p className="text-xl font-bold text-gray-800">{gameData.score || 0}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">ENGAGEMENT SCORE</p>
              <p className="text-xl font-bold text-gray-800">{gameData.engagementScore}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emotion Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Emotion Distribution</h3>
          <div className="chart-container">
            <canvas ref={emotionPieChartRef}></canvas>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Emotion Counts</h3>
          <div className="chart-container">
            <canvas ref={emotionBarChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Emotion Cards */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Emotions Detected</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {emotionCards.slice(0, 4).map((card, index) => (
            <div key={index} className={`emotion-card bg-white rounded-xl shadow-md p-5 border-l-4 ${card.borderColor}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{card.name}</h4>
                  <p className="text-gray-600">{card.description}</p>
                </div>
                <div className={`${card.bgColor} ${card.textColor} text-xs font-medium px-2.5 py-1 rounded`}>{card.percentage}%</div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${card.barColor} h-2 rounded-full`} style={{ width: `${card.percentage}%` }}></div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Count: {card.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Insights */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Key Observations</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Achieved score of {gameData.score || 0} during the session</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Dominant emotion was {emotionCards[0]?.name || 'Neutral'} ({emotionCards[0]?.percentage || 0}%)</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Secondary emotion was {emotionCards[1]?.name || 'None'} ({emotionCards[1]?.percentage || 0}%)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Recommendations</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Introduce more score-based challenges</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Increase difficulty of score-based tasks</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Try visual memory exercises to build confidence</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionTrackingReport;
