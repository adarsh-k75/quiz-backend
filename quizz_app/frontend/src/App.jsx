import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Crown, 
  Timer, 
  Trophy, 
  User, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Sparkles, 
  Medal, 
  ArrowRight, 
  Lock, 
  ShieldAlert,
  BookOpen
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export default function App() {
  // App Phase States: 'A' (Gatekeeper), 'B' (Quiz), 'SUBMITTING', 'C' (Leaderboard), 'DISQUALIFIED', 'ERROR'
  const [phase, setPhase] = useState('A');
  
  // User Registration State
  const [name, setName] = useState('');
  const [batch, setBatch] = useState('');
  const [inputError, setInputError] = useState('');

  // Quiz Engine State
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(10.0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Leaderboard & Results State
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Session Invalidation Check (Cheating Prevention)
  useEffect(() => {
    const quizStatus = sessionStorage.getItem('quiz_status');
    const savedName = sessionStorage.getItem('quiz_username');
    const savedBatch = sessionStorage.getItem('quiz_batch');

    if (quizStatus === 'in_progress') {
      // User refreshed the page during the quiz! Mark as disqualified.
      sessionStorage.setItem('quiz_status', 'disqualified');
      setPhase('DISQUALIFIED');
    } else if (quizStatus === 'completed' && savedName && savedBatch) {
      // If they already finished, direct them to leaderboard and fetch it
      setName(savedName);
      setBatch(savedBatch);
      fetchLeaderboard();
      setPhase('C');
    }
  }, []);

  // Fetch Questions for the Quiz
  const startQuiz = async () => {
    try {
      setPhase('LOADING');
      const response = await axios.get(`${API_BASE}/questions`);
      setQuestions(response.data);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setSecondsLeft(10.0);
      setSelectedOption(null);
      setIsLocked(false);

      // Lock session to prevent cheating
      sessionStorage.setItem('quiz_status', 'in_progress');
      sessionStorage.setItem('quiz_username', name);
      sessionStorage.setItem('quiz_batch', batch);

      setPhase('B');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load quiz questions. Please check if the backend is running.');
      setPhase('ERROR');
    }
  };

  // Fetch Leaderboard and Podium
  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_BASE}/leaderboard`);
      setLeaderboard(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // High-Precision Countdown Timer (Managed via robust useEffect interval loop)
  useEffect(() => {
    if (phase !== 'B' || !questions.length || isLocked) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          // Handle timeout automatically when timer reaches 0
          handleTimeout();
          return 0.0;
        }
        // Decrement by 0.1s and format to keep 1 decimal place precision
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, currentQuestionIndex, questions, isLocked]);

  // Timeout handler: transitions immediately to next question with null option and 0.0s left
  const handleTimeout = () => {
    saveAnswer(null, 0.0);
  };

  // Save current question's answers and proceed
  const saveAnswer = (option, timeRemaining) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = [
      ...answers,
      {
        question_id: currentQuestion.id,
        selected_option: option,
        seconds_left: timeRemaining
      }
    ];
    setAnswers(newAnswers);

    // Reset option states
    setSelectedOption(null);
    setIsLocked(false);
    setSecondsLeft(10.0);

    if (currentQuestionIndex < 4) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All 5 questions completed -> Fire payload
      submitQuiz(newAnswers);
    }
  };

  // Click handler on Options: Lock UI, capture time left, transition after 400ms delay
  const handleOptionClick = (optionKey) => {
    if (isLocked) return;
    setIsLocked(true);
    setSelectedOption(optionKey);

    setTimeout(() => {
      saveAnswer(optionKey, secondsLeft);
    }, 400);
  };

  // Submit compiled answers payload to Backend
  const submitQuiz = async (compiledAnswers) => {
    setPhase('SUBMITTING');
    try {
      const payload = {
        name,
        batch,
        answers: compiledAnswers
      };
      const response = await axios.post(`${API_BASE}/submit`, payload);
      
      // Save submission to highlight in the leaderboard
      setCurrentSubmission(response.data);
      
      // Mark session as completed
      sessionStorage.setItem('quiz_status', 'completed');
      
      // Load leaderboard and transition to Phase C
      await fetchLeaderboard();
      setPhase('C');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to submit your answers. Please check your network connection.');
      setPhase('ERROR');
    }
  };

  // Validate user join input fields
  const handleLaunch = (e) => {
    e.preventDefault();
    const alphanumericRegex = /^[a-zA-Z0-9 ]+$/;
    
    if (!name.trim() || !batch.trim()) {
      setInputError('Please fill in both Name and Batch fields.');
      return;
    }

    if (!alphanumericRegex.test(name) || !alphanumericRegex.test(batch)) {
      setInputError('Fields must contain only alphanumeric characters and spaces.');
      return;
    }

    setInputError('');
    startQuiz();
  };

  // Reset session and play again
  const handlePlayAgain = () => {
    sessionStorage.removeItem('quiz_status');
    sessionStorage.removeItem('quiz_username');
    sessionStorage.removeItem('quiz_batch');
    setName('');
    setBatch('');
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentSubmission(null);
    setPhase('A');
  };

  // Helper to extract podium items (Top 3)
  const podiumList = leaderboard.slice(0, 3);
  
  // Helper to extract rest of leaderboard
  const remainingList = leaderboard.slice(3);

  // Loading Screen
  if (phase === 'LOADING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        </div>
        <p className="mt-6 text-slate-400 font-medium animate-pulse">Initializing Arena questions...</p>
      </div>
    );
  }

  // Submitting Screen
  if (phase === 'SUBMITTING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-400 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-400 animate-spin [animation-duration:1.5s]"></div>
        </div>
        <h2 className="mt-8 text-xl font-bold text-slate-200">Analyzing Performance</h2>
        <p className="mt-2 text-slate-400 font-medium animate-pulse">Running Backend Validation Scoring Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              DevShowdown
            </h1>
            <p className="text-xs text-slate-400 font-medium">Real-Time Web Dev Trivia Arena</p>
          </div>
        </div>
        {phase === 'B' && (
          <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Session Protected</span>
          </div>
        )}
      </header>

      {/* Main Content Areas */}
      <main className="flex-grow flex items-center justify-center w-full">
        
        {/* Phase A: Guest Gatekeeper */}
        {phase === 'A' && (
          <div className="w-full max-w-md p-8 rounded-2xl glass-card animate-slide-up">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20 mb-3">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Enter the Arena</h2>
              <p className="text-sm text-slate-400 mt-2">Test your web development speed and precision. 5 questions. 5 seconds each. Highest speed wins.</p>
            </div>

            <form onSubmit={handleLaunch} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Participant Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Batch identifier</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Users className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cohort 2026"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {inputError && (
                <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{inputError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transform hover:-translate-y-0.5 transition active:translate-y-0 flex items-center justify-center space-x-2"
              >
                <span>Launch Quiz</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
              <button 
                onClick={() => { fetchLeaderboard(); setPhase('C'); }}
                className="text-xs text-slate-400 hover:text-indigo-400 font-semibold transition"
              >
                Skip to Leaderboards
              </button>
            </div>
          </div>
        )}

        {/* Phase B: High-Precision Timed Engine (Quiz) */}
        {phase === 'B' && questions.length > 0 && (
          <div className="w-full p-6 sm:p-8 rounded-2xl glass-card animate-scale-in">
            {/* Header: Progress and Timer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Step {currentQuestionIndex + 1} of 5</span>
                <h3 className="text-lg font-bold text-slate-300">Question Path</h3>
              </div>
              
              {/* High precision countdown timer container */}
              <div className="flex items-center space-x-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 min-w-[120px] justify-center">
                <Timer className={`w-5 h-5 ${secondsLeft <= 1.5 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                <span className={`font-mono text-lg font-bold ${secondsLeft <= 1.5 ? 'text-rose-500' : 'text-slate-200'}`}>
                  {secondsLeft.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Micro Countdown progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-2 mb-8 overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-100 ease-linear ${
                  secondsLeft <= 1.5 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                    : 'bg-gradient-to-r from-emerald-400 to-indigo-500'
                }`}
                style={{ width: `${(secondsLeft / 10) * 100}%` }}
              ></div>
            </div>

            {/* Question Text */}
            <div className="bg-slate-950/40 p-6 rounded-xl border border-slate-800/60 mb-8 min-h-[100px] flex items-center">
              <p className="text-lg sm:text-xl font-bold leading-relaxed text-slate-100">
                {questions[currentQuestionIndex].text}
              </p>
            </div>

            {/* Answers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'A', text: questions[currentQuestionIndex].opt_a },
                { key: 'B', text: questions[currentQuestionIndex].opt_b },
                { key: 'C', text: questions[currentQuestionIndex].opt_c },
                { key: 'D', text: questions[currentQuestionIndex].opt_d },
              ].map((opt) => {
                const isSelected = selectedOption === opt.key;
                
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleOptionClick(opt.key)}
                    disabled={isLocked}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-600/35 border-indigo-500 text-white shadow-md shadow-indigo-600/10' 
                        : isLocked 
                          ? 'bg-slate-900/30 border-slate-800/40 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 pr-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected 
                          ? 'bg-indigo-500 text-white' 
                          : isLocked 
                            ? 'bg-slate-950 text-slate-600'
                            : 'bg-slate-950 text-slate-400 group-hover:text-white'
                      }`}>
                        {opt.key}
                      </span>
                      <span className="font-semibold text-sm sm:text-base">{opt.text}</span>
                    </div>
                    {isSelected && (
                      <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Anti-cheat disclaimer */}
            <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-center space-x-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>Session isolated. Refreshing the browser will automatically void this quiz run.</span>
            </div>
          </div>
        )}

        {/* Phase C: The Winner's Circle (Leaderboards) */}
        {phase === 'C' && (
          <div className="w-full space-y-8 animate-fade-in">
            
            {/* Session success notification banner */}
            {currentSubmission && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full"></div>
                <div className="inline-flex p-2.5 bg-emerald-500/15 text-emerald-400 rounded-full mb-3 border border-emerald-500/25">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white">Quiz Successfully Logged!</h3>
                <p className="text-sm text-slate-300 mt-1.5 max-w-lg mx-auto">
                  Nice work, <span className="font-bold text-indigo-300">{currentSubmission.name}</span>! 
                  Your performance was submitted to the smart scoring system.
                </p>
                <div className="flex items-center justify-center gap-6 mt-4 max-w-sm mx-auto">
                  <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-center flex-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Score</span>
                    <span className="text-lg font-black text-emerald-400">{currentSubmission.score}</span>
                  </div>
                  <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-center flex-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Total Speed</span>
                    <span className="text-lg font-black text-teal-400">{currentSubmission.speed_bonus.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            )}

            {/* Podium (Top 3 Rank Holders) */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-extrabold text-white flex items-center justify-center space-x-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>The Podium</span>
                </h3>
                <p className="text-xs text-slate-400">Highest scores of the current showdown</p>
              </div>

              {podiumList.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-1.5 pt-8 pb-4">
                  {/* Rank 2 - Silver (Left) */}
                  {podiumList[1] && (
                    <div className="w-full sm:w-1/3 flex flex-col items-center order-2 sm:order-1">
                      <div className="relative group flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-400 bg-slate-900 flex items-center justify-center mb-2 shadow-lg">
                          <Medal className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-200 max-w-[120px] truncate text-center">{podiumList[1].name}</span>
                        <span className="text-[10px] text-slate-400">{podiumList[1].batch}</span>
                      </div>
                      <div className="w-full sm:w-[150px] bg-gradient-to-t from-slate-900 to-slate-800/80 border border-slate-700/40 rounded-t-xl h-24 sm:h-28 mt-3 flex flex-col justify-center items-center p-3 shadow-2xl">
                        <span className="text-sm font-bold text-slate-400">Rank 2</span>
                        <span className="text-lg font-extrabold text-white mt-1">{podiumList[1].score}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({podiumList[1].speed_bonus.toFixed(1)}s left)</span>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 - Gold (Center) */}
                  {podiumList[0] && (
                    <div className="w-full sm:w-1/3 flex flex-col items-center order-1 sm:order-2 z-10">
                      <div className="relative group flex flex-col items-center">
                        <Crown className="w-8 h-8 text-yellow-400 animate-bounce absolute -top-8" />
                        <div className="w-16 h-16 rounded-full border-2 border-yellow-400 bg-slate-900 flex items-center justify-center mb-2 shadow-lg ring-4 ring-yellow-400/20">
                          <Trophy className="w-8 h-8 text-yellow-400" />
                        </div>
                        <span className="text-base font-extrabold text-white max-w-[140px] truncate text-center">{podiumList[0].name}</span>
                        <span className="text-[10px] text-slate-400">{podiumList[0].batch}</span>
                      </div>
                      <div className="w-full sm:w-[160px] bg-gradient-to-t from-slate-900 to-slate-800/80 border-t-2 border-yellow-400/80 border-x border-slate-700/60 rounded-t-2xl h-32 sm:h-36 mt-3 flex flex-col justify-center items-center p-3 shadow-2xl ring-2 ring-yellow-400/10">
                        <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Champion</span>
                        <span className="text-2xl font-black text-white mt-1">{podiumList[0].score}</span>
                        <span className="text-[10px] text-yellow-400/80 font-medium">({podiumList[0].speed_bonus.toFixed(1)}s left)</span>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 - Bronze (Right) */}
                  {podiumList[2] && (
                    <div className="w-full sm:w-1/3 flex flex-col items-center order-3 sm:order-3">
                      <div className="relative group flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-600 bg-slate-900 flex items-center justify-center mb-2 shadow-lg">
                          <Medal className="w-6 h-6 text-amber-600" />
                        </div>
                        <span className="text-sm font-bold text-slate-200 max-w-[120px] truncate text-center">{podiumList[2].name}</span>
                        <span className="text-[10px] text-slate-400">{podiumList[2].batch}</span>
                      </div>
                      <div className="w-full sm:w-[150px] bg-gradient-to-t from-slate-900 to-slate-800/80 border border-slate-700/40 rounded-t-xl h-20 sm:h-24 mt-3 flex flex-col justify-center items-center p-3 shadow-2xl">
                        <span className="text-sm font-bold text-amber-600">Rank 3</span>
                        <span className="text-lg font-extrabold text-white mt-1">{podiumList[2].score}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({podiumList[2].speed_bonus.toFixed(1)}s left)</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                  <span className="text-sm text-slate-500">Standings are currently empty. Submit the first score!</span>
                </div>
              )}
            </div>

            {/* Markdown-Style Leaderboard Table */}
            <div className="space-y-4">
              <h3 className="text-md font-bold text-slate-300 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Scoreboard Summary</span>
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 shadow-inner">
                <table className="min-w-full divide-y divide-slate-800/80">
                  <thead>
                    <tr className="bg-slate-950/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 text-left">Rank</th>
                      <th className="py-3 px-4 text-left">Participant</th>
                      <th className="py-3 px-4 text-left">Batch</th>
                      <th className="py-3 px-4 text-center">Cumulative Time Left</th>
                      <th className="py-3 px-4 text-right">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {leaderboard.map((row, index) => {
                      const isCurrentUser = currentSubmission && row.id === currentSubmission.id;
                      
                      return (
                        <tr 
                          key={row.id} 
                          className={`transition duration-150 ${
                            isCurrentUser 
                              ? 'bg-indigo-950/40 border-y-2 border-indigo-500/40 font-bold text-indigo-200' 
                              : 'hover:bg-slate-900/40 text-slate-300'
                          }`}
                        >
                          <td className="py-3.5 px-4 text-sm font-semibold">
                            {index === 0 ? (
                              <span className="text-yellow-400">#1</span>
                            ) : index === 1 ? (
                              <span className="text-slate-400">#2</span>
                            ) : index === 2 ? (
                              <span className="text-amber-600">#3</span>
                            ) : (
                              `#${index + 1}`
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-sm">
                            <div className="flex items-center space-x-2.5">
                              <span>{row.name}</span>
                              {isCurrentUser && (
                                <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase font-black tracking-wide">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-sm text-slate-400">{row.batch}</td>
                          <td className="py-3.5 px-4 text-sm text-center font-mono text-teal-400/80">{row.speed_bonus.toFixed(1)}s</td>
                          <td className="py-3.5 px-4 text-sm text-right font-extrabold text-white">{row.score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
              <button
                onClick={handlePlayAgain}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <RotateCcw className="w-5 h-5 text-indigo-400" />
                <span>Take Quiz Again</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase: DISQUALIFIED Screen (Cheating Prevention) */}
        {phase === 'DISQUALIFIED' && (
          <div className="w-full max-w-md p-8 rounded-2xl glass-card border-rose-500/30 bg-rose-950/5/10 text-center animate-scale-in">
            <div className="inline-flex p-3.5 bg-rose-500/15 text-rose-500 rounded-full mb-4 border border-rose-500/25">
              <ShieldAlert className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-rose-400">Session Invalidated</h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Anti-cheating systems detected a browser reload or window navigation during an active quiz run.
            </p>
            <div className="bg-slate-950/80 p-4 rounded-xl border border-rose-500/10 text-xs text-slate-400 text-left space-y-2.5 mt-6 mb-8">
              <div className="flex items-start space-x-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>Page reloads reset questions, violating timed integrity.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>Active session tags are mapped to local state validation.</span>
              </div>
            </div>
            <button
              onClick={handlePlayAgain}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5 text-rose-400" />
              <span>Reset & Play Fairly</span>
            </button>
          </div>
        )}

        {/* Phase: ERROR Screen */}
        {phase === 'ERROR' && (
          <div className="w-full max-w-md p-8 rounded-2xl glass-card text-center animate-scale-in">
            <div className="inline-flex p-3 bg-amber-500/15 text-amber-500 rounded-full mb-4 border border-amber-500/25">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-200">Something went wrong</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{errorMsg}</p>
            <button
              onClick={handlePlayAgain}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Return to Entrance</span>
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-slate-800/60 text-center text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
        Secure Sandboxed Environment • v1.0.0
      </footer>
    </div>
  );
}
