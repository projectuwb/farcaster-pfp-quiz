import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Zap, Users, MessageCircle, Eye, Flame, Star, Settings, X, LogOut } from 'lucide-react';

const LEVELS = [
  { name: 'Wanderer', min: 0, max: 999, color: '#8B7355' },
  { name: 'Seeker', min: 1000, max: 1999, color: '#6B8E23' },
  { name: 'Mystic', min: 2000, max: 2999, color: '#4B0082' },
  { name: 'Oracle', min: 3000, max: 3999, color: '#9370DB' },
  { name: 'Champion', min: 4000, max: 4999, color: '#FFD700' },
  { name: 'Sage', min: 5000, max: 5999, color: '#00CED1' },
  { name: 'Archmage', min: 6000, max: 6999, color: '#FF1493' },
  { name: 'Titan', min: 7000, max: 7999, color: '#FF4500' },
  { name: 'Demigod', min: 8000, max: 8999, color: '#DC143C' },
  { name: 'Eternal', min: 9000, max: Infinity, color: '#9400D3' }
];

const THEMES = {
  cosmic: {
    name: 'Cosmic',
    primary: 'from-purple-600 via-pink-500 to-orange-500',
    secondary: 'from-indigo-600 via-purple-600 to-pink-600',
    game: 'from-slate-900 via-purple-900 to-slate-900',
    button: 'from-purple-500 to-pink-500',
    accent: 'from-blue-500 to-cyan-500'
  },
  base: {
    name: 'Base Blue',
    primary: 'from-blue-600 via-cyan-500 to-blue-400',
    secondary: 'from-blue-700 via-blue-600 to-cyan-600',
    game: 'from-slate-900 via-blue-900 to-slate-900',
    button: 'from-blue-500 to-cyan-500',
    accent: 'from-cyan-500 to-blue-400'
  },
  rainbow: {
    name: 'Rainbow',
    primary: 'from-red-500 via-yellow-500 to-green-500',
    secondary: 'from-purple-600 via-pink-500 to-orange-500',
    game: 'from-slate-900 via-indigo-900 to-slate-900',
    button: 'from-pink-500 via-purple-500 to-indigo-500',
    accent: 'from-green-500 to-cyan-500'
  }
};

export default function FarcasterPFPQuiz() {
  const [screen, setScreen] = useState('welcome');
  const [mode, setMode] = useState(null);
  const [questionCount, setQuestionCount] = useState('endless');
  const [totalScore, setTotalScore] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [prestige, setPrestige] = useState(0);
  const [combo, setCombo] = useState(1);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userData, setUserData] = useState(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [alltimeLeaderboard, setAlltimeLeaderboard] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState('daily');
  const [userFid, setUserFid] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [timer, setTimer] = useState(5);
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerActive, setTimerActive] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [showGreenFlash, setShowGreenFlash] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const autoAdvanceTimerRef = useRef(null);
  
  const [settings, setSettings] = useState({
    timerDuration: 5,
    darkMode: false,
    theme: 'cosmic'
  });

  const currentTheme = THEMES[settings.theme];

  const loadSettings = async () => {
    try {
      const result = await window.storage.get('settings', false);
      if (result) {
        const savedSettings = JSON.parse(result.value);
        setSettings(savedSettings);
        setTimer(savedSettings.timerDuration);
      }
    } catch (error) {
      console.log('No settings found');
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await window.storage.set('settings', JSON.stringify(newSettings), false);
      setSettings(newSettings);
      setTimer(newSettings.timerDuration);
    } catch (error) {
      console.error('Failed to save settings');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (timerActive && timeLeft > 0 && !gamePaused) {
      const countdown = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(countdown);
    } else if (timerActive && timeLeft === 0 && !gamePaused) {
      handleTimeout();
    }
  }, [timerActive, timeLeft, gamePaused]);

  const handleTimeout = () => {
    setTimerActive(false);
    setTimedOut(true);
    setShowFeedback(true);
    setCombo(1);
    setQuestionsAnswered(prev => prev + 1);
    
    // Add to game history
    setGameHistory(prev => [...prev, {
      question: currentQuestion,
      userAnswer: null,
      correct: false,
      timedOut: true,
      timestamp: Date.now()
    }]);

    const isLastQuestion = questionCount !== 'endless' && questionsAnswered + 1 >= parseInt(questionCount);
    
    // Always set auto-advance timer
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (!gamePaused) {
        if (isLastQuestion) {
          // End game after timer
          saveUserData(sessionScore);
          saveToLeaderboards();
          setScreen('result');
        } else {
          // Next question
          setShowFeedback(false);
          setTimedOut(false);
          setShowGreenFlash(false);
          generateMockQuestion();
        }
      }
    }, 2500);
  };

  const getCurrentLevel = () => {
    const scoreInCycle = totalScore % 9000;
    return LEVELS.find(level => scoreInCycle >= level.min && scoreInCycle <= level.max) || LEVELS[0];
  };

  const getPrestigeLevel = () => {
    return Math.floor(totalScore / 9000);
  };

  const checkStreak = async () => {
    if (!userFid) return;

    try {
      const userDataResult = await window.storage.get(`user:${userFid}`, false);
      
      if (userDataResult) {
        const savedData = JSON.parse(userDataResult.value);
        const today = new Date().toISOString().split('T')[0];
        const lastPlayed = savedData.lastPlayedDate;
        
        if (lastPlayed) {
          const lastPlayedDate = new Date(lastPlayed);
          const todayDate = new Date(today);
          const diffTime = todayDate - lastPlayedDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            setStreak(savedData.streak || 0);
          } else if (diffDays === 1) {
            setStreak((savedData.streak || 0) + 1);
          } else {
            setStreak(1);
          }
        } else {
          setStreak(1);
        }
        
        setTotalScore(savedData.totalScore || 0);
        setPrestige(getPrestigeLevel());
      } else {
        setStreak(1);
        setTotalScore(0);
        setPrestige(0);
      }
    } catch (error) {
      setStreak(1);
      setTotalScore(0);
      setPrestige(0);
    }
  };

  const saveUserData = async (scoreToAdd = 0) => {
    if (!userFid) return;

    const newTotalScore = totalScore + scoreToAdd;
    const today = new Date().toISOString().split('T')[0];

    const userDataToSave = {
      fid: userFid,
      totalScore: newTotalScore,
      streak: streak,
      lastPlayedDate: today,
      username: userData?.username || `user${userFid}`,
      pfp: userData?.pfp_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userFid}`
    };

    try {
      await window.storage.set(`user:${userFid}`, JSON.stringify(userDataToSave), false);
      setTotalScore(newTotalScore);
      setPrestige(Math.floor(newTotalScore / 9000));
    } catch (error) {
      console.error('Failed to save');
    }
  };

  const loadLeaderboards = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const dailyResult = await window.storage.list('daily:', true);
      const alltimeResult = await window.storage.list('alltime:', true);
      
      if (dailyResult && dailyResult.keys) {
        const entries = await Promise.all(
          dailyResult.keys.map(async (key) => {
            const data = await window.storage.get(key, true);
            if (!data) return null;
            const entry = JSON.parse(data.value);
            return entry.date === today ? entry : null;
          })
        );
        const sorted = entries.filter(e => e).sort((a, b) => b.dailyScore - a.dailyScore).slice(0, 50);
        setDailyLeaderboard(sorted);
      }

      if (alltimeResult && alltimeResult.keys) {
        const entries = await Promise.all(
          alltimeResult.keys.map(async (key) => {
            const data = await window.storage.get(key, true);
            return data ? JSON.parse(data.value) : null;
          })
        );
        const sorted = entries.filter(e => e).sort((a, b) => b.totalScore - a.totalScore).slice(0, 50);
        setAlltimeLeaderboard(sorted);
      }
    } catch (error) {
      setDailyLeaderboard([]);
      setAlltimeLeaderboard([]);
    }
  };

  const saveToLeaderboards = async () => {
    if (!userFid || !userData) return;
    
    const today = new Date().toISOString().split('T')[0];
    const level = getCurrentLevel();
    const prestigeLevel = getPrestigeLevel();

    try {
      const dailyKey = `daily:${today}:${userFid}`;
      let dailyScore = sessionScore;
      
      try {
        const existingDaily = await window.storage.get(dailyKey, true);
        if (existingDaily) {
          const existing = JSON.parse(existingDaily.value);
          dailyScore = existing.dailyScore + sessionScore;
        }
      } catch (error) {
        // New entry
      }

      const dailyEntry = {
        fid: userFid,
        username: userData.username,
        pfp: userData.pfp_url,
        dailyScore: dailyScore,
        streak: streak,
        date: today,
        timestamp: Date.now()
      };

      await window.storage.set(dailyKey, JSON.stringify(dailyEntry), true);

      const alltimeEntry = {
        fid: userFid,
        username: userData.username,
        pfp: userData.pfp_url,
        totalScore: totalScore,
        prestige: prestigeLevel,
        level: level.name,
        streak: streak,
        timestamp: Date.now()
      };

      await window.storage.set(`alltime:${userFid}`, JSON.stringify(alltimeEntry), true);
      await loadLeaderboards();
    } catch (error) {
      console.error('Failed to save leaderboards');
    }
  };

  const mockFarcasterLogin = async () => {
    const mockFid = Math.floor(Math.random() * 100000);
    setUserFid(mockFid);
    setUserData({
      fid: mockFid,
      username: `user${mockFid}`,
      pfp_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockFid}`,
      display_name: `User ${mockFid}`,
      bio: 'Farcaster user exploring the network!'
    });
    
    await checkStreak();
  };

  const generateMockQuestion = () => {
    const correctUser = {
      fid: Math.floor(Math.random() * 100000),
      username: `user${Math.floor(Math.random() * 10000)}`,
      pfp_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
      display_name: `User ${Math.floor(Math.random() * 10000)}`
    };

    const wrongUsers = Array.from({ length: 3 }, () => ({
      fid: Math.floor(Math.random() * 100000),
      username: `user${Math.floor(Math.random() * 10000)}`,
      pfp_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
      display_name: `User ${Math.floor(Math.random() * 10000)}`
    }));

    const allChoices = [correctUser, ...wrongUsers].sort(() => Math.random() - 0.5);

    setCurrentQuestion({ correct: correctUser, choices: allChoices });
    setTimeLeft(timer);
    setTimerActive(true);
    setTimedOut(false);
  };

  const handleAnswer = (choice) => {
    setTimerActive(false);
    setSelectedAnswer(choice);
    const correct = choice.username === currentQuestion.correct.username;
    setIsCorrect(correct);
    
    // Add to game history
    setGameHistory(prev => [...prev, {
      question: currentQuestion,
      userAnswer: choice,
      correct: correct,
      timestamp: Date.now()
    }]);
    
    if (!correct) {
      // Red flash for wrong answer, then green flash for correct answer
      setShowRedFlash(true);
      setTimeout(() => {
        setShowRedFlash(false);
        setShowGreenFlash(true);
        setTimeout(() => setShowGreenFlash(false), 400);
      }, 400);
    }
    
    setShowFeedback(true);

    if (correct) {
      const points = 100 * combo;
      setSessionScore(prev => prev + points);
      setCombo(prev => Math.min(prev + 1, 5));
      setCorrectAnswers(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setCombo(1);
    }

    setQuestionsAnswered(prev => prev + 1);

    const isLastQuestion = questionCount !== 'endless' && questionsAnswered + 1 >= parseInt(questionCount);
    
    // Always set auto-advance timer (will be cleared if user views profile)
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (!gamePaused) {
        if (isLastQuestion) {
          // End game after timer
          saveUserData(sessionScore + (correct ? 100 * combo : 0));
          saveToLeaderboards();
          setScreen('result');
        } else {
          // Next question
          setShowFeedback(false);
          setSelectedAnswer(null);
          setShowRedFlash(false);
          setShowGreenFlash(false);
          generateMockQuestion();
        }
      }
    }, 2500);
  };

  const startGame = () => {
    setSessionScore(0);
    setCombo(1);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setShowFeedback(false);
    setSelectedAnswer(null);
    setShowConfetti(false);
    setTimedOut(false);
    setGamePaused(false);
    setGameHistory([]);
    generateMockQuestion();
    setScreen('game');
  };

  const resetGame = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setMode(null);
    setQuestionCount('endless');
    setSessionScore(0);
    setCombo(1);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setCurrentQuestion(null);
    setShowFeedback(false);
    setSelectedAnswer(null);
    setShowConfetti(false);
    setViewingProfile(null);
    setTimerActive(false);
    setTimedOut(false);
    setGamePaused(false);
    setScreen('modeSelect');
  };

  const quitGame = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    saveUserData(sessionScore);
    saveToLeaderboards();
    setScreen('result');
  };

  const viewProfile = () => {
    setGamePaused(true);
    setTimerActive(false);
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setViewingProfile(currentQuestion.correct);
    setScreen('profile');
  };

  const returnToGame = () => {
    const isLastQuestion = questionCount !== 'endless' && questionsAnswered >= parseInt(questionCount);
    
    if (isLastQuestion) {
      // End the game
      saveUserData(sessionScore);
      saveToLeaderboards();
      setScreen('result');
    } else {
      // Continue game
      setScreen('game');
      setGamePaused(false);
      
      if (showFeedback) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          setShowFeedback(false);
          setSelectedAnswer(null);
          setShowRedFlash(false);
          setShowGreenFlash(false);
          setTimedOut(false);
          generateMockQuestion();
        }, 2500);
      }
    }
  };

  useEffect(() => {
    if (screen === 'leaderboard') {
      loadLeaderboards();
    }
  }, [screen]);

  useEffect(() => {
    if (userFid) {
      checkStreak();
    }
  }, [userFid]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="absolute animate-fall" style={{ left: `${Math.random() * 100}%`, top: '-10px', animationDelay: `${Math.random() * 0.5}s`, animationDuration: `${2 + Math.random()}s` }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#FFD700', '#FF69B4', '#00CED1', '#FF4500', '#9400D3'][Math.floor(Math.random() * 5)] }} />
        </div>
      ))}
      <style jsx>{`
        @keyframes fall {
          to { transform: translateY(100vh) rotate(360deg); }
        }
        .animate-fall { animation: fall linear forwards; }
      `}</style>
    </div>
  );

  const PrestigeBadge = ({ prestige }) => {
    if (prestige === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 ml-2">
        {Array.from({ length: Math.min(prestige, 5) }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {prestige > 5 && <span className="text-xs font-bold text-yellow-400">x{prestige}</span>}
      </span>
    );
  };

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Timer Duration</h3>
          <div className="grid grid-cols-2 gap-3">
            {[5, 10].map(duration => (
              <button key={duration} onClick={() => saveSettings({ ...settings, timerDuration: duration })} className={`py-3 rounded-xl font-semibold transition-all ${settings.timerDuration === duration ? `bg-gradient-to-r ${currentTheme.button} text-white` : 'bg-gray-200 text-gray-700'}`}>
                {duration} seconds
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Color Theme</h3>
          <div className="space-y-3">
            {Object.entries(THEMES).map(([key, theme]) => (
              <button key={key} onClick={() => saveSettings({ ...settings, theme: key })} className={`w-full py-3 rounded-xl font-semibold transition-all bg-gradient-to-r ${theme.button} text-white ${settings.theme === key ? 'ring-4 ring-offset-2 ring-purple-500' : ''}`}>
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (screen === 'welcome') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.primary} flex items-center justify-center p-4`}>
        {showSettings && <SettingsModal />}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative">
          <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <Settings className="w-6 h-6" />
          </button>
          <div className="text-6xl mb-4">🎭</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">PFP Quiz</h1>
          <p className="text-gray-600 mb-6">Guess who's behind the profile picture!</p>
          <button onClick={async () => { await mockFarcasterLogin(); setScreen('modeSelect'); }} className={`w-full bg-gradient-to-r ${currentTheme.button} text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all`}>
            Sign in with Farcaster
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'modeSelect') {
    const level = getCurrentLevel();
    const prestigeLevel = getPrestigeLevel();
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.secondary} flex items-center justify-center p-4`}>
        {showSettings && <SettingsModal />}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
          <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <Settings className="w-6 h-6" />
          </button>
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-gray-800">{totalScore} pts</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold text-gray-800">{streak} day streak</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold px-3 py-1 rounded-full inline-flex items-center" style={{ backgroundColor: level.color + '20', color: level.color }}>
                {level.name}
                <PrestigeBadge prestige={prestigeLevel} />
              </span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Choose Your Mode</h2>
          <div className="space-y-4">
            <button onClick={() => { setMode('followers'); setScreen('questionSelect'); }} className={`w-full bg-gradient-to-r ${currentTheme.accent} text-white py-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-3`}>
              <Users className="w-6 h-6" /> Explore Your Followers
            </button>
            <button onClick={() => { setMode('following'); setScreen('questionSelect'); }} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-3">
              <Eye className="w-6 h-6" /> Explore Your Follows
            </button>
            <button onClick={() => { setMode('interactions'); setScreen('questionSelect'); }} className={`w-full bg-gradient-to-r ${currentTheme.button} text-white py-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-3`}>
              <MessageCircle className="w-6 h-6" /> Explore Your Interactions
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'questionSelect') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.primary} flex items-center justify-center p-4`}>
        {showSettings && <SettingsModal />}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
          <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <Settings className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">How Many Questions?</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => { setQuestionCount('5'); startGame(); }} className={`bg-gradient-to-r ${currentTheme.button} text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all`}>
              5 Questions
            </button>
            <button onClick={() => { setQuestionCount('10'); startGame(); }} className={`bg-gradient-to-r ${currentTheme.button} text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all`}>
              10 Questions
            </button>
          </div>
          <button onClick={() => { setQuestionCount('endless'); startGame(); }} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all">
            ♾️ Endless Mode
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'game' && currentQuestion) {
    const level = getCurrentLevel();
    const prestigeLevel = getPrestigeLevel();
    const scoreInCycle = totalScore % 9000;
    const nextLevelThreshold = level.max + 1;
    const progressToNextLevel = ((scoreInCycle - level.min) / (nextLevelThreshold - level.min)) * 100;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.game} p-4 transition-colors duration-300 ${showRedFlash ? '!bg-red-600' : showGreenFlash ? '!bg-green-600' : ''}`}>
        {showConfetti && <Confetti />}
        <div className="max-w-2xl mx-auto mb-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="font-bold text-sm">Session: {sessionScore}</div>
                  <div className="text-xs opacity-75">Total: {totalScore}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold">{streak}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <span className="font-bold">{combo}x</span>
                </div>
              </div>
              <div className="text-sm">{questionsAnswered}/{questionCount === 'endless' ? '∞' : questionCount}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold inline-flex items-center" style={{ color: level.color }}>
                {level.name}
                <PrestigeBadge prestige={prestigeLevel} />
              </span>
              <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500" style={{ width: `${progressToNextLevel}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Who is this?</h2>
              {timerActive && (
                <div className={`text-2xl font-bold ${timeLeft <= 2 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                  {timeLeft}s
                </div>
              )}
            </div>
            
            <div className="flex justify-center mb-8">
              <div className={`relative ${showFeedback && isCorrect ? 'animate-bounce' : ''}`}>
                <img src={currentQuestion.correct.pfp_url} alt="Profile" className="w-48 h-48 rounded-full border-8 border-purple-500 shadow-xl" />
                {showFeedback && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`text-6xl ${isCorrect ? 'animate-ping' : ''}`}>
                      {timedOut ? '⏰' : isCorrect ? '✅' : '❌'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.choices.map((choice, idx) => {
                const isSelected = selectedAnswer?.username === choice.username;
                const isCorrectAnswer = choice.username === currentQuestion.correct.username;
                let buttonStyle = `bg-gradient-to-r ${currentTheme.button} text-white`;
                if (showFeedback) {
                  if (isCorrectAnswer) {
                    buttonStyle = 'bg-green-500 text-white border-4 border-green-300';
                  } else if (isSelected && !isCorrect) {
                    buttonStyle = 'bg-red-500 text-white border-4 border-red-300';
                  } else {
                    buttonStyle = 'bg-gray-300 text-gray-600';
                  }
                }
                return (
                  <button key={idx} onClick={() => !showFeedback && handleAnswer(choice)} disabled={showFeedback} className={`${buttonStyle} py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:shadow-lg disabled:cursor-not-allowed ${showFeedback && !isCorrect && isSelected ? 'animate-pulse' : ''}`}>
                    {choice.username}{showFeedback && isCorrectAnswer && ' ✓'}{showFeedback && isSelected && !isCorrect && ' ✗'}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div className="mt-6">
                <div className="text-center mb-4">
                  <div className={`text-xl font-bold ${isCorrect ? 'text-green-600' : timedOut ? 'text-orange-600' : 'text-red-600'}`}>
                    {isCorrect ? `+${100 * combo} points! 🎉` : timedOut ? 'Time\'s up! ⏰' : 'Not quite! 💭'}
                  </div>
                </div>
                <div className={`grid ${questionCount === 'endless' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  <button onClick={viewProfile} className={`bg-gradient-to-r ${currentTheme.accent} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                    👤 View Profile
                  </button>
                  {questionCount === 'endless' && (
                    <button onClick={quitGame} className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      <LogOut className="w-5 h-5" /> Quit Game
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'profile' && viewingProfile) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.game} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`h-32 bg-gradient-to-r ${currentTheme.button}`} />
            <div className="p-8 -mt-16">
              <img src={viewingProfile.pfp_url} alt={viewingProfile.username} className="w-32 h-32 rounded-full border-8 border-white shadow-xl mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{viewingProfile.display_name}</h2>
              <p className="text-purple-600 font-semibold mb-4">@{viewingProfile.username}</p>
              <p className="text-gray-600 mb-6">{viewingProfile.bio || 'Exploring the Farcaster universe! 🚀'}</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Latest Cast:</p>
                <p className="text-gray-800">Just minted my first NFT on Base! The future is onchain 🎨✨</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={returnToGame} className={`bg-gradient-to-r ${currentTheme.button} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                  ← Back to Game
                </button>
                <button onClick={() => window.open(`https://warpcast.com/${viewingProfile.username}`, '_blank')} className={`bg-gradient-to-r ${currentTheme.accent} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                  View on Warpcast →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'leaderboard') {
    const comingFromResult = questionsAnswered > 0 && (questionCount === 'endless' || questionsAnswered >= parseInt(questionCount));
    const currentLeaderboard = leaderboardTab === 'daily' ? dailyLeaderboard : alltimeLeaderboard;
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.game} p-4`}>
        {showSettings && <SettingsModal />}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Leaderboard
              </h2>
              <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gray-600">
                <Settings className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button onClick={() => setLeaderboardTab('daily')} className={`flex-1 py-3 rounded-xl font-semibold transition-all ${leaderboardTab === 'daily' ? `bg-gradient-to-r ${currentTheme.button} text-white` : 'bg-gray-200 text-gray-700'}`}>
                Today
              </button>
              <button onClick={() => setLeaderboardTab('alltime')} className={`flex-1 py-3 rounded-xl font-semibold transition-all ${leaderboardTab === 'alltime' ? `bg-gradient-to-r ${currentTheme.button} text-white` : 'bg-gray-200 text-gray-700'}`}>
                All Time
              </button>
            </div>

            {currentLeaderboard.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No scores yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {currentLeaderboard.map((entry, idx) => {
                  const isCurrentUser = entry.fid === userFid;
                  return (
                    <div key={entry.fid} className={`flex items-center gap-4 p-4 rounded-xl ${isCurrentUser ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50'}`}>
                      <div className="text-2xl font-bold text-gray-400 w-8">{idx + 1}</div>
                      <img src={entry.pfp} alt={entry.username} className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 flex items-center">
                          {entry.username}
                          {leaderboardTab === 'alltime' && <PrestigeBadge prestige={entry.prestige} />}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          {leaderboardTab === 'alltime' && entry.level && (
                            <span className="text-purple-600">{entry.level}</span>
                          )}
                          {entry.streak > 0 && (
                            <span className="flex items-center gap-1 text-orange-500">
                              <Flame className="w-3 h-3" />{entry.streak}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">
                          {leaderboardTab === 'daily' ? entry.dailyScore : entry.totalScore}
                        </p>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-6">
              {comingFromResult ? (
                <>
                  <button onClick={() => setScreen('result')} className={`bg-gradient-to-r ${currentTheme.accent} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                    ← Back to Score
                  </button>
                  <button onClick={resetGame} className={`bg-gradient-to-r ${currentTheme.button} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                    Play Again
                  </button>
                </>
              ) : (
                <button onClick={() => setScreen('game')} className={`col-span-2 bg-gradient-to-r ${currentTheme.button} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                  Back to Game
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'result') {
    const level = getCurrentLevel();
    const prestigeLevel = getPrestigeLevel();
    const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.game} p-4 flex items-center justify-center`}>
        {showSettings && <SettingsModal />}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative">
          <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <Settings className="w-6 h-6" />
          </button>
          <div className="text-6xl mb-4">🎊</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over!</h2>
          <p className="text-gray-600 mb-6">Great job exploring profiles!</p>
          <div className={`bg-gradient-to-r ${currentTheme.button} text-white rounded-2xl p-6 mb-6`}>
            <div className="text-lg mb-1">Session Points</div>
            <div className="text-5xl font-bold mb-4">{sessionScore}</div>
            <div className="text-sm opacity-90">Total Points: {totalScore}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800">{correctAnswers}</div>
              <div className="text-xs text-gray-600">Correct</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800">{accuracy}%</div>
              <div className="text-xs text-gray-600">Accuracy</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-800">{streak}</div>
              <div className="text-xs text-gray-600">Streak</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="font-semibold inline-flex items-center justify-center" style={{ color: level.color }}>
              Level: {level.name}
              <PrestigeBadge prestige={prestigeLevel} />
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={resetGame} className={`bg-gradient-to-r ${currentTheme.button} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
              Play Again
            </button>
            <button onClick={() => setScreen('summary')} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
              Summary
            </button>
            <button onClick={() => setScreen('leaderboard')} className={`bg-gradient-to-r ${currentTheme.accent} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
              Ranks
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'summary') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.game} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Game Summary</h2>
            
            <div className="space-y-3 mb-6">
              {gameHistory.map((entry, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 transition-all">
                  <div className="text-xl font-bold text-gray-400 w-8">
                    {idx + 1}
                  </div>
                  <button 
                    onClick={() => {
                      setViewingProfile(entry.question.correct);
                      setScreen('profile');
                    }}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    <img 
                      src={entry.question.correct.pfp_url} 
                      alt={entry.question.correct.username}
                      className="w-16 h-16 rounded-full border-4 border-purple-500 shadow-lg cursor-pointer"
                    />
                  </button>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{entry.question.correct.username}</p>
                    {entry.timedOut ? (
                      <p className="text-sm text-orange-600">Time expired ⏰</p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        You guessed: <span className={entry.correct ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {entry.userAnswer.username}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {entry.correct ? (
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-2xl">✓</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-2xl text-white">✗</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setScreen('result')} className={`bg-gradient-to-r ${currentTheme.accent} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                ← Back to Results
              </button>
              <button onClick={resetGame} className={`bg-gradient-to-r ${currentTheme.button} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
