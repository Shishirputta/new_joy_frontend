import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, UserPlus, BarChart as ChartBar, ArrowLeft } from 'lucide-react';
import EmotionTrackingReport from './EmotionTrackingReport';

export function AdminDashboard({ adminUsername }) {
  const [activeTab, setActiveTab] = useState('children');
  const [children, setChildren] = useState([]);
  const [gameData, setGameData] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [newChild, setNewChild] = useState({ username: '', password: '', hint: '' });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedChildName, setSelectedChildName] = useState('');

  // 🔃 Fetch children from DB
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/children?admin=${adminUsername}`);
        const data = await res.json();
        if (res.ok) {
          setChildren(data);
        } else {
          console.error('Error loading children:', data.error);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchChildren();
  }, [adminUsername]);

  // 🔃 Fetch game data for all children and group by session
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/game_data?admin=${adminUsername}`);
        const data = await res.json();
        if (res.ok) {
          console.log('Raw game data from API:', data); // Debug raw data
          const organizedData = data.reduce((acc, entry) => {
            if (!acc[entry.username]) {
              acc[entry.username] = [];
            }
            acc[entry.username].push(entry);
            return acc;
          }, {});
          setGameData(organizedData);
          
          const sessionsByChild = {};
          Object.entries(organizedData).forEach(([childName, entries]) => {
            const sessions = groupEntriesByTimeGapAndLevelReset(entries);
            sessionsByChild[childName] = sessions;
          });
          
          setSessionData(sessionsByChild);
        } else {
          console.error('Error loading game data:', data.error);
        }
      } catch (err) {
        console.error('Fetch game data error:', err);
      }
    };

    fetchGameData();
  }, [adminUsername]);

  // Group entries by time gap (>2 minutes) and level resets
  const groupEntriesByTimeGapAndLevelReset = (entries) => {
    if (!entries || entries.length === 0) {
      return [];
    }
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log('Sorted entries for user:', sortedEntries.map(e => ({
      username: e.username,
      score: e.score,
      wordsFound: e.wordsFound,
      timestamp: e.timestamp
    }))); // Debug sorted entries
    
    const sessions = [];
    let currentSessionEntries = [sortedEntries[0]];
    
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentEntry = sortedEntries[i];
      const previousEntry = sortedEntries[i - 1];
      
      const currentTime = new Date(currentEntry.timestamp).getTime();
      const previousTime = new Date(previousEntry.timestamp).getTime();
      
      // If time gap > 2 minutes (120,000 ms), start a new session
      if (currentTime - previousTime > 120000) {
        if (currentSessionEntries.length > 0) {
          sessions.push(currentSessionEntries);
        }
        currentSessionEntries = [currentEntry];
      } else {
        currentSessionEntries.push(currentEntry);
      }
    }
    
    if (currentSessionEntries.length > 0) {
      sessions.push(currentSessionEntries);
    }
    
    const processedSessions = sessions.map((sessionEntries, sessionIndex) => {
      const levels = [];
      let currentLevelEntries = [sessionEntries[0]];
      
      for (let i = 1; i < sessionEntries.length; i++) {
        const currentEntry = sessionEntries[i];
        const previousEntry = sessionEntries[i - 1];
        
        // Simplified level reset: only for word-based games
        let isLevelReset = false;
        if ('wordsFound' in currentEntry && 'wordsFound' in previousEntry && currentEntry.wordsFound !== null && previousEntry.wordsFound !== null) {
          isLevelReset = previousEntry.wordsFound === 4 && currentEntry.wordsFound === 0;
        }
        
        if (isLevelReset) {
          if (currentLevelEntries.length > 0) {
            levels.push(currentLevelEntries);
          }
          currentLevelEntries = [currentEntry];
        } else {
          currentLevelEntries.push(currentEntry);
        }
      }
      
      if (currentLevelEntries.length > 0) {
        levels.push(currentLevelEntries);
      }
      
      const processedLevels = levels.map((levelEntries, levelIndex) => {
        let totalScore = 0;
        let wordsCompleted = 0;
        
        // Use score of the last entry in the level
        const lastEntry = levelEntries[levelEntries.length - 1];
        totalScore = Number(lastEntry.score) || 0;
        
        // Fallback to wordsFound if no valid score
        if (totalScore === 0 && levelEntries.some(entry => 'wordsFound' in entry && entry.wordsFound !== null)) {
          wordsCompleted = levelEntries.filter(entry => entry.wordsFound === 4).length;
          totalScore = wordsCompleted * 10;
        }
        
        const completed = totalScore > 0 || wordsCompleted > 0;
        
        return {
          id: `level-${levelIndex + 1}`,
          name: `Level ${levelIndex + 1}`,
          entries: levelEntries,
          wordsCompleted: wordsCompleted,
          totalScore: totalScore,
          completed: completed
        };
      });
      
      let totalWordsCompleted = processedLevels.reduce((sum, level) => sum + level.wordsCompleted, 0);
      // Use score of the last entry in the session
      const lastEntry = sessionEntries[sessionEntries.length - 1];
      let totalScore = Number(lastEntry.score) || 0;
      if (totalScore === 0 && totalWordsCompleted > 0) {
        totalScore = totalWordsCompleted * 10;
      }
      
      // Debug log to verify score calculation
      console.log(`Session ${sessionIndex + 1} for ${sessionEntries[0].username}:`, {
        entries: sessionEntries.map(e => ({ score: e.score, wordsFound: e.wordsFound, timestamp: e.timestamp })),
        totalWordsCompleted,
        totalScore,
        lastEntryScore: lastEntry.score
      });
      
      const dominantEmotion = calculateDominantEmotion(sessionEntries);
      const startTime = new Date(sessionEntries[0].timestamp);
      const endTime = new Date(sessionEntries[sessionEntries.length - 1].timestamp);
      
      return {
        id: `session-${sessionIndex + 1}`,
        name: `Session #${sessionIndex + 1}`,
        entries: sessionEntries,
        levels: processedLevels,
        totalWordsCompleted: totalWordsCompleted,
        totalScore: totalScore,
        dominantEmotion: dominantEmotion,
        startTime: startTime,
        endTime: endTime
      };
    });
    
    // Sort sessions by endTime (most recent first)
    return processedSessions.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
  };

  // Calculate dominant emotion in a session
  const calculateDominantEmotion = (entries) => {
    const validEmotions = ['happy', 'sad', 'disgust', 'neutral', 'fear', 'angry', 'surprised'];
    const emotionCounts = {
      happy: 0,
      sad: 0,
      disgust: 0,
      neutral: 0,
      fear: 0,
      angry: 0,
      surprised: 0
    };
    
    entries.forEach(entry => {
      const emotion = entry.emotion ? entry.emotion.toLowerCase() : 'neutral';
      if (validEmotions.includes(emotion)) {
        emotionCounts[emotion]++;
      } else {
        emotionCounts.neutral++;
      }
    });
    
    let dominantEmotion = 'neutral';
    let maxCount = 0;
    
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    });
    
    return dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1);
  };

  // Calculate session duration
  const calculateSessionDuration = (startTime, endTime) => {
    if (!startTime || !endTime) {
      return '0 min';
    }
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = Math.floor(durationMs / (1000 * 60));
    const durationSec = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (durationMin === 0) {
      return `${durationSec} sec`;
    } else if (durationSec === 0) {
      return `${durationMin} min`;
    } else {
      return `${durationMin} min ${durationSec} sec`;
    }
  };

  // ➕ Add child to DB
  const handleAddChild = async (e) => {
    e.preventDefault();
    if (newChild.username && newChild.password && newChild.hint) {
      try {
        const response = await fetch('http://localhost:3002/api/children', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...newChild, adminId: adminUsername })
        });

        const data = await response.json();

        if (response.ok) {
          setChildren((prev) => [...prev, data]);
          setNewChild({ username: '', password: '', hint: '' });
        } else {
          alert(data.error || 'Something went wrong');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Failed to connect to backend');
      }
    }
  };

  // ✉️ Send feedback
  const handleSendFeedback = (e) => {
    e.preventDefault();
    if (feedbackMessage.trim()) {
      const newFeedback = {
        message: feedbackMessage,
        adminName: adminUsername,
        date: new Date().toISOString().split('T')[0]
      };
      setFeedbacks([...feedbacks, newFeedback]);
      setFeedbackMessage('');
    }
  };

  // View detailed report for a session
  const viewDetailedReport = (childName, session) => {
    setSelectedChildName(childName);
    setSelectedSession(session);
  };

  // Back to game reports list
  const backToReportsList = () => {
    setSelectedSession(null);
    setSelectedChildName('');
  };

  // Aggregate emotion data from all entries in a session
  const aggregateSessionEmotionData = (entries) => {
    const emotionCounts = {
      happy: 0,
      sad: 0,
      disgust: 0,
      neutral: 0,
      fear: 0,
      angry: 0,
      surprised: 0
    };
    
    if (!entries || entries.length === 0) {
      return emotionCounts;
    }
    
    entries.forEach(entry => {
      const emotion = entry.emotion ? entry.emotion.toLowerCase() : 'neutral';
      if (emotion in emotionCounts) {
        emotionCounts[emotion]++;
      } else {
        emotionCounts.neutral++;
      }
    });
    
    return emotionCounts;
  };

  // Transform session data for EmotionTrackingReport
  const transformSessionDataForReport = (childName, session) => {
    const emotionCounts = aggregateSessionEmotionData(session.entries);
    const sessionDuration = calculateSessionDuration(session.startTime, session.endTime);
    
    // Use totalScore from session (last entry's score)
    const score = session.totalScore;
    
    // Create timestamps array for emotion vs. time graph
    const timestamps = session.entries.map(entry => ({
      time: entry.timestamp,
      emotion: entry.emotion ? entry.emotion.toLowerCase() : 'neutral'
    }));
    
    // Debug log to verify data passed to report
    console.log(`Report for ${childName}, ${session.name}:`, {
      score,
      totalWordsCompleted: session.totalWordsCompleted,
      entries: session.entries.map(e => ({ score: e.score, wordsFound: e.wordsFound, timestamp: e.timestamp, emotion: e.emotion })),
      timestamps,
      emotionCounts
    });
    
    const uniqueEmotions = Object.values(emotionCounts).filter(count => count > 0).length;
    const engagementScore = Math.min(10, Math.max(1, Math.round((uniqueEmotions * 1.5 + score * 0.5) * 10) / 10));
    
    const levelInfo = session.levels.map(level => ({
      name: level.name,
      completed: level.completed,
      wordsCompleted: level.wordsCompleted,
      totalScore: level.totalScore
    }));
    
    return {
      studentName: childName,
      sessionNumber: session.name,
      sessionDate: session.startTime.toLocaleDateString(),
      sessionDuration: sessionDuration,
      dominantEmotion: session.dominantEmotion,
      score: score,
      engagementScore: `${engagementScore}/10`,
      levels: levelInfo,
      emotionCounts: emotionCounts,
      timestamps: timestamps
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-comic text-blue-600">Admin Dashboard</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('children')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'children' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <Users size={20} />
            Manage Children
          </button>
          <button
            onClick={() => {
              setActiveTab('reports');
              setSelectedSession(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'reports' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <ChartBar size={20} />
            Reports
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'feedback' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <MessageSquare size={20} />
            Send Feedback
          </button>
        </div>
      </div>

      {activeTab === 'children' && (
        <div className="space-y-8">
          <form onSubmit={handleAddChild} className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-comic mb-4 flex items-center gap-2">
              <UserPlus size={24} className="text-green-500" />
              Create Child Account
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={newChild.username}
                onChange={(e) => setNewChild({ ...newChild, username: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={newChild.password}
                onChange={(e) => setNewChild({ ...newChild, password: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Password Hint"
                value={newChild.hint}
                onChange={(e) => setNewChild({ ...newChild, hint: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Create Account
            </button>
          </form>

          <div>
            <h3 className="text-xl font-comic mb-4">Child Accounts</h3>
            <div className="space-y-4">
              {children.map((child) => (
                <div
                  key={child.username}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div>
                    <p className="text-lg font-semibold">{child.username}</p>
                    <p className="text-sm text-gray-600">Hint: {child.hint}</p>
                  </div>
                </div>
              ))}
              {children.length === 0 && (
                <p className="text-gray-500 text-center py-4">No child accounts created yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          {selectedSession ? (
            <div>
              <button 
                onClick={backToReportsList}
                className="flex items-center gap-2 mb-4 text-indigo-600 hover:text-indigo-800"
              >
                <ArrowLeft size={16} />
                Back to Reports
              </button>
              <EmotionTrackingReport gameData={transformSessionDataForReport(selectedChildName, selectedSession)} />
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-comic mb-4">Game Reports</h3>
              <div className="space-y-4">
                {children.map((child) => (
                  <div key={child.username} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2">{child.username}</h4>
                    {sessionData[child.username] && sessionData[child.username].length > 0 ? (
                      <div className="space-y-2">
                        {sessionData[child.username].map((session, index) => (
                          <div key={index} className="flex justify-between items-center py-2">
                            <div>
                              <span className="mr-4">{session.name}</span>
                              <span className="mr-4">Score: {session.totalScore}</span>
                              <span>Emotion: {session.dominantEmotion}</span>
                            </div>
                            <div>
                              <button
                                onClick={() => viewDetailedReport(child.username, session)}
                                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-sm hover:bg-indigo-200 transition"
                              >
                                View Detailed Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No game data recorded yet</p>
                    )}
                  </div>
                ))}
                {children.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No children to show reports for</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-8">
          <form onSubmit={handleSendFeedback} className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-comic mb-4">Send Feedback to Super Admin</h3>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Type your feedback message here..."
              className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 h-32"
            />
            <button
              type="submit"
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Send Feedback
            </button>
          </form>

          <div>
            <h3 className="text-xl font-comic mb-4">Sent Feedback</h3>
            <div className="space-y-4">
              {feedbacks.map((feedback, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-gray-700">{feedback.message}</p>
                    <span className="text-sm text-gray-500">{feedback.date}</span>
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && (
                <p className="text-gray-500 text-center py-4">No feedback messages sent yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
