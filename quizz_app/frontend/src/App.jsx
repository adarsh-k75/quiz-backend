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
  BookOpen,
  Plus,
  Edit,
  Trash2,
  X,
  LogOut,
  ChevronLeft
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

  // Admin Panel State
  const [adminPassword, setAdminPassword] = useState('');
  const [adminQuestions, setAdminQuestions] = useState([]);
  const [adminError, setAdminError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptA, setNewOptA] = useState('');
  const [newOptB, setNewOptB] = useState('');
  const [newOptC, setNewOptC] = useState('');
  const [newOptD, setNewOptD] = useState('');
  const [newCorrect, setNewCorrect] = useState('A');

  // Bulk Panel State
  const createEmptyQuestions = () => Array.from({ length: 10 }, () => ({
    text: '',
    opt_a: '',
    opt_b: '',
    opt_c: '',
    opt_d: '',
    correct: 'A'
  }));

  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState(createEmptyQuestions());

  // Fetch questions for Admin Panel
  const fetchAdminQuestions = async (pass = adminPassword) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/questions`, {
        headers: { 'X-Admin-Password': pass }
      });
      setAdminQuestions(response.data);
      setAdminError('');
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Admin login handler
  const handleAdminLogin = async (pass) => {
    try {
      await fetchAdminQuestions(pass);
      setAdminPassword(pass);
      setPhase('ADMIN_DASHBOARD');
    } catch (err) {
      setAdminError(err.response?.data?.detail || 'Authentication failed. Please check the passcode.');
    }
  };

  // Add or edit a question
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newOptA.trim() || !newOptB.trim() || !newOptC.trim() || !newOptD.trim()) {
      setAdminError('Please fill in all question and option fields.');
      return;
    }
    const payload = {
      text: newQuestionText.trim(),
      opt_a: newOptA.trim(),
      opt_b: newOptB.trim(),
      opt_c: newOptC.trim(),
      opt_d: newOptD.trim(),
      correct: newCorrect.trim()
    };

    try {
      if (editingQuestion) {
        // Edit existing
        await axios.put(`${API_BASE}/admin/questions/${editingQuestion.id}`, payload, {
          headers: { 'X-Admin-Password': adminPassword }
        });
      } else {
        // Create new
        await axios.post(`${API_BASE}/admin/questions`, payload, {
          headers: { 'X-Admin-Password': adminPassword }
        });
      }
      // Reload and close modal
      await fetchAdminQuestions();
      setIsQuestionFormOpen(false);
      resetQuestionForm();
    } catch (err) {
      console.error(err);
      setAdminError(err.response?.data?.detail || 'Failed to save question.');
    }
  };

  const handleSaveBulkQuestions = async (e) => {
    e.preventDefault();
    const invalidIdx = bulkQuestions.findIndex(q => 
      !q.text.trim() || !q.opt_a.trim() || !q.opt_b.trim() || !q.opt_c.trim() || !q.opt_d.trim()
    );
    if (invalidIdx !== -1) {
      setAdminError(`Please fill in all fields for Question #${invalidIdx + 1}.`);
      return;
    }
    try {
      const payload = bulkQuestions.map(q => ({
        text: q.text.trim(),
        opt_a: q.opt_a.trim(),
        opt_b: q.opt_b.trim(),
        opt_c: q.opt_c.trim(),
        opt_d: q.opt_d.trim(),
        correct: q.correct.trim()
      }));
      await axios.post(`${API_BASE}/admin/questions/bulk`, payload, {
        headers: { 'X-Admin-Password': adminPassword }
      });
      await fetchAdminQuestions();
      setIsBulkFormOpen(false);
      setBulkQuestions(createEmptyQuestions());
      setAdminError('');
    } catch (err) {
      console.error(err);
      setAdminError(err.response?.data?.detail || 'Failed to save bulk questions.');
    }
  };

  const handleAutoFillBulkQuestions = () => {
    const samples = [
      { text: "Which HTTP status code represents 'Unauthorized' access?", opt_a: "400 Bad Request", opt_b: "401 Unauthorized", opt_c: "403 Forbidden", opt_d: "404 Not Found", correct: "B" },
      { text: "What is the primary purpose of the 'defer' attribute in a <script> tag?", opt_a: "It executes asynchronously", opt_b: "It delays script execution until the HTML document is fully parsed", opt_c: "It blocks page rendering", opt_d: "It executes the script in a web worker thread", correct: "B" },
      { text: "In CSS Flexbox, which property controls alignment along the main axis?", opt_a: "align-items", opt_b: "align-content", opt_c: "justify-content", opt_d: "flex-direction", correct: "C" },
      { text: "Which React Hook is designed to execute side effects in a functional component?", opt_a: "useState", opt_b: "useMemo", opt_c: "useEffect", opt_d: "useCallback", correct: "C" },
      { text: "What is the primary role of the Event Loop in the JavaScript runtime?", opt_a: "It executes DB operations", opt_b: "It manages memory allocation", opt_c: "It monitors call stack and queue", opt_d: "It runs synchronous code in workers", correct: "C" },
      { text: "Which HTML5 element displays self-contained thematic content?", opt_a: "picture", opt_b: "figure", opt_c: "image", opt_d: "aside", correct: "B" },
      { text: "What is the correct syntax in CSS to target elements with class 'highlight'?", opt_a: "#highlight", opt_b: ".highlight", opt_c: "highlight", opt_d: "*highlight", correct: "B" },
      { text: "Which SQL keyword sorts the result-set in ascending or descending order?", opt_a: "SORT BY", opt_b: "ORDER BY", opt_c: "GROUP BY", opt_d: "ALIGN BY", correct: "B" },
      { text: "In JavaScript, what is the value of typeof null?", opt_a: "object", opt_b: "null", opt_c: "undefined", opt_d: "boolean", correct: "A" },
      { text: "Which of the following is NOT a valid state in a Promise in JavaScript?", opt_a: "pending", opt_b: "fulfilled", opt_c: "rejected", opt_d: "processing", correct: "D" }
    ];
    setBulkQuestions(samples);
  };

  // Delete a question
  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/questions/${id}`, {
        headers: { 'X-Admin-Password': adminPassword }
      });
      await fetchAdminQuestions();
    } catch (err) {
      console.error(err);
      setAdminError(err.response?.data?.detail || 'Failed to delete question.');
    }
  };

  const handleResetQuestions = async () => {
    if (!window.confirm('Are you sure you want to reset all questions to the default seed list? This will delete all custom questions!')) return;
    try {
      await axios.post(`${API_BASE}/admin/questions/reset`, {}, {
        headers: { 'X-Admin-Password': adminPassword }
      });
      await fetchAdminQuestions();
    } catch (err) {
      console.error(err);
      setAdminError(err.response?.data?.detail || 'Failed to reset questions.');
    }
  };

  const handleResetSubmissions = async () => {
    if (!window.confirm('Are you sure you want to clear the entire leaderboard? This will permanently delete all student submissions!')) return;
    try {
      await axios.post(`${API_BASE}/admin/submissions/reset`, {}, {
        headers: { 'X-Admin-Password': adminPassword }
      });
      alert('Leaderboard has been successfully cleared!');
    } catch (err) {
      console.error(err);
      setAdminError(err.response?.data?.detail || 'Failed to reset leaderboard.');
    }
  };

  const resetQuestionForm = () => {
    setNewQuestionText('');
    setNewOptA('');
    setNewOptB('');
    setNewOptC('');
    setNewOptD('');
    setNewCorrect('A');
    setEditingQuestion(null);
    setAdminError('');
  };

  const openCreateForm = () => {
    resetQuestionForm();
    setIsQuestionFormOpen(true);
  };

  const openEditForm = (q) => {
    setEditingQuestion(q);
    setNewQuestionText(q.text);
    setNewOptA(q.opt_a);
    setNewOptB(q.opt_b);
    setNewOptC(q.opt_c);
    setNewOptD(q.opt_d);
    setNewCorrect(q.correct);
    setAdminError('');
    setIsQuestionFormOpen(true);
  };

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
      const savedSubmission = sessionStorage.getItem('quiz_current_submission');
      if (savedSubmission) {
        try {
          setCurrentSubmission(JSON.parse(savedSubmission));
        } catch (e) {
          console.error(e);
        }
      }
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
      const savedSubmission = sessionStorage.getItem('quiz_current_submission');
      if (savedSubmission) {
        try {
          setCurrentSubmission(JSON.parse(savedSubmission));
        } catch (e) {
          console.error(e);
        }
      }
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

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions completed -> Fire payload
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
      sessionStorage.setItem('quiz_current_submission', JSON.stringify(response.data));

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
  const handleLaunch = async (e) => {
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
    try {
      setPhase('LOADING');
      const checkResponse = await axios.get(`${API_BASE}/check-username`, {
        params: { name: name.trim() }
      });
      if (checkResponse.data.exists) {
        setInputError('This name is already taken. Please choose another name.');
        setPhase('A');
        return;
      }
      startQuiz();
    } catch (err) {
      console.error(err);
      setInputError('Failed to check username availability. Please try again.');
      setPhase('A');
    }
  };

  // Reset session and play again
  const handlePlayAgain = () => {
    sessionStorage.removeItem('quiz_status');
    sessionStorage.removeItem('quiz_username');
    sessionStorage.removeItem('quiz_batch');
    sessionStorage.removeItem('quiz_current_submission');
    setName('');
    setBatch('');
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentSubmission(null);
    setPhase('A');
  };

  // Helper to compute standard competition ranks dynamically
  const getRankedList = (list) => {
    let currentRank = 1;
    return list.map((row, index) => {
      if (index > 0) {
        const prevRow = list[index - 1];
        if (row.score !== prevRow.score || row.speed_bonus !== prevRow.speed_bonus) {
          currentRank = index + 1;
        }
      }
      return { ...row, rank: currentRank };
    });
  };

  const rankedLeaderboard = getRankedList(leaderboard);

  // Helper to extract podium items (Top 3)
  const podiumList = rankedLeaderboard.slice(0, 3);

  // Helper to extract rest of leaderboard
  const remainingList = rankedLeaderboard.slice(3);

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
            <p className="text-xs text-slate-400 font-medium">Real-Time Web Quizz</p>
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
              <p className="text-sm text-slate-400 mt-2">Test your mind speed and precision. 10 questions, 10 seconds each. Highest speed and correct answers win.</p>
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

            <div className="mt-6 pt-6 border-t border-slate-800/80 flex justify-between items-center px-2">
              <button
                onClick={() => { fetchLeaderboard(); setPhase('C'); }}
                className="text-xs text-slate-400 hover:text-indigo-400 font-semibold transition"
              >
                Skip to Leaderboards
              </button>
              <button
                onClick={() => { setAdminError(''); setPhase('ADMIN_LOGIN'); }}
                className="text-xs text-slate-400 hover:text-indigo-400 font-semibold transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Step {currentQuestionIndex + 1} of {questions.length}</span>
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
                className={`h-full transition-all duration-100 ease-linear ${secondsLeft <= 1.5
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
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${isSelected
                      ? 'bg-indigo-600/35 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                      : isLocked
                        ? 'bg-slate-900/30 border-slate-800/40 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:-translate-y-0.5'
                      }`}
                  >
                    <div className="flex items-center space-x-3.5 pr-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isSelected
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
                        <div className={`w-12 h-12 rounded-full border-2 ${podiumList[1].rank === 1 ? 'border-yellow-400 ring-4 ring-yellow-400/20' : 'border-slate-400'} bg-slate-900 flex items-center justify-center mb-2 shadow-lg`}>
                          {podiumList[1].rank === 1 ? (
                            <Trophy className="w-6 h-6 text-yellow-400" />
                          ) : (
                            <Medal className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-200 max-w-[120px] truncate text-center">{podiumList[1].name}</span>
                        <span className="text-[10px] text-slate-400">{podiumList[1].batch}</span>
                      </div>
                      <div className={`w-full sm:w-[150px] bg-gradient-to-t from-slate-900 to-slate-800/80 border ${podiumList[1].rank === 1 ? 'border-yellow-450/40 border-t-2 border-t-yellow-400' : 'border-slate-700/40'} rounded-t-xl h-24 sm:h-28 mt-3 flex flex-col justify-center items-center p-3 shadow-2xl`}>
                        <span className={`text-sm font-bold ${podiumList[1].rank === 1 ? 'text-yellow-450' : 'text-slate-400'}`}>
                          {podiumList[1].rank === 1 ? 'Champion' : `Rank ${podiumList[1].rank}`}
                        </span>
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
                        <div className={`w-12 h-12 rounded-full border-2 ${podiumList[2].rank === 1 ? 'border-yellow-400 ring-4 ring-yellow-400/20' : podiumList[2].rank === 2 ? 'border-slate-400' : 'border-amber-600'} bg-slate-900 flex items-center justify-center mb-2 shadow-lg`}>
                          {podiumList[2].rank === 1 ? (
                            <Trophy className="w-6 h-6 text-yellow-400" />
                          ) : podiumList[2].rank === 2 ? (
                            <Medal className="w-6 h-6 text-slate-400" />
                          ) : (
                            <Medal className="w-6 h-6 text-amber-600" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-200 max-w-[120px] truncate text-center">{podiumList[2].name}</span>
                        <span className="text-[10px] text-slate-400">{podiumList[2].batch}</span>
                      </div>
                      <div className={`w-full sm:w-[150px] bg-gradient-to-t from-slate-900 to-slate-800/80 border ${podiumList[2].rank === 1 ? 'border-yellow-450/40 border-t-2 border-t-yellow-400' : podiumList[2].rank === 2 ? 'border-slate-700/40' : 'border-amber-650/45 border-t border-t-amber-600'} rounded-t-xl h-20 sm:h-24 mt-3 flex flex-col justify-center items-center p-3 shadow-2xl`}>
                        <span className={`text-sm font-bold ${podiumList[2].rank === 1 ? 'text-yellow-400' : podiumList[2].rank === 2 ? 'text-slate-400' : 'text-amber-600'}`}>
                          {podiumList[2].rank === 1 ? 'Champion' : podiumList[2].rank === 2 ? 'Rank 2' : `Rank ${podiumList[2].rank}`}
                        </span>
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
                    {rankedLeaderboard.map((row, index) => {
                      const isCurrentUser = currentSubmission && row.id === currentSubmission.id;

                      return (
                        <tr
                          key={row.id}
                          className={`transition duration-150 ${isCurrentUser
                            ? 'bg-indigo-950/40 border-y-2 border-indigo-500/40 font-bold text-indigo-200'
                            : 'hover:bg-slate-900/40 text-slate-300'
                            }`}
                        >
                          <td className="py-3.5 px-4 text-sm font-semibold">
                            {row.rank === 1 ? (
                              <span className="text-yellow-400">#1</span>
                            ) : row.rank === 2 ? (
                              <span className="text-slate-400">#2</span>
                            ) : row.rank === 3 ? (
                              <span className="text-amber-600">#3</span>
                            ) : (
                              `#${row.rank}`
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
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 w-full">
              <button
                onClick={handlePlayAgain}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <RotateCcw className="w-5 h-5 text-indigo-400" />
                <span>Return to Home</span>
              </button>
              <button
                onClick={() => { setAdminError(''); setPhase('ADMIN_LOGIN'); }}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Admin Dashboard</span>
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

        {/* Phase: ADMIN_LOGIN Screen */}
        {phase === 'ADMIN_LOGIN' && (
          <div className="w-full max-w-md p-8 rounded-2xl glass-card animate-scale-in">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20 mb-3">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Admin Authentication</h2>
              <p className="text-sm text-slate-400 mt-2">Enter the administrator passcode to access the Question Manager dashboard.</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const pass = e.target.elements.adminPass.value;
              handleAdminLogin(pass);
            }} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Passcode</label>
                <input
                  name="adminPass"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-center tracking-widest font-bold"
                />
              </div>

              {adminError && (
                <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setPhase('A')}
                  className="w-1/2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition"
                >
                  Verify Access
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Phase: ADMIN_DASHBOARD Screen */}
        {phase === 'ADMIN_DASHBOARD' && (
          <div className="w-full space-y-6 animate-fade-in">
            {/* Admin Header Panel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                  <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <span>Question Repository Manager</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Add, update, or remove database trivia questions.</p>
              </div>
              <div className="flex space-x-3 w-full sm:w-auto font-bold text-xs">
                <button
                  onClick={openCreateForm}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Question</span>
                </button>
                <button
                  onClick={() => {
                    setBulkQuestions(createEmptyQuestions());
                    setAdminError('');
                    setIsBulkFormOpen(true);
                  }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4 text-violet-300" />
                  <span>Bulk Add (10)</span>
                </button>
                <button
                  onClick={handleResetQuestions}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/20 rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Default</span>
                </button>
                <button
                  onClick={handleResetSubmissions}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/20 rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Scores</span>
                </button>
                <button
                  onClick={() => {
                    setAdminPassword('');
                    setAdminQuestions([]);
                    setPhase('A');
                  }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center space-x-1.5 border border-slate-750 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-455" />
                  <span>Exit Admin</span>
                </button>
              </div>
            </div>

            {adminError && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            {/* Questions Grid/List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {adminQuestions.length === 0 ? (
                <div className="text-center p-12 bg-slate-900/20 border border-slate-800/60 rounded-2xl">
                  <p className="text-slate-400">No questions found in database.</p>
                  <button
                    onClick={openCreateForm}
                    className="mt-4 text-xs font-bold text-indigo-400 hover:underline"
                  >
                    Add the first question now
                  </button>
                </div>
              ) : (
                adminQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-905/40 border border-slate-850 hover:border-slate-800 transition flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <span className="bg-indigo-950/80 text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-500/20">
                          ID: {q.id}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditForm(q)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                            title="Edit Question"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-relaxed">{q.text}</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded-lg border ${q.correct === 'A' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950/40 border-slate-900 text-slate-400'}`}>
                        <span className="font-extrabold mr-1.5">A.</span> {q.opt_a}
                      </div>
                      <div className={`p-2.5 rounded-lg border ${q.correct === 'B' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950/40 border-slate-900 text-slate-400'}`}>
                        <span className="font-extrabold mr-1.5">B.</span> {q.opt_b}
                      </div>
                      <div className={`p-2.5 rounded-lg border ${q.correct === 'C' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950/40 border-slate-900 text-slate-400'}`}>
                        <span className="font-extrabold mr-1.5">C.</span> {q.opt_c}
                      </div>
                      <div className={`p-2.5 rounded-lg border ${q.correct === 'D' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950/40 border-slate-900 text-slate-400'}`}>
                        <span className="font-extrabold mr-1.5">D.</span> {q.opt_d}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Dialog Form overlay */}
            {isQuestionFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-4 animate-scale-in text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <h3 className="text-md font-extrabold text-white">
                      {editingQuestion ? 'Modify Question' : 'Add Question Details'}
                    </h3>
                    <button
                      onClick={() => setIsQuestionFormOpen(false)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveQuestion} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Text</label>
                      <textarea
                        required
                        rows={2}
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Type question content here..."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Options</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-500">A</span>
                          <input
                            type="text"
                            required
                            value={newOptA}
                            onChange={(e) => setNewOptA(e.target.value)}
                            placeholder="Option A description"
                            className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-500">B</span>
                          <input
                            type="text"
                            required
                            value={newOptB}
                            onChange={(e) => setNewOptB(e.target.value)}
                            placeholder="Option B description"
                            className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-500">C</span>
                          <input
                            type="text"
                            required
                            value={newOptC}
                            onChange={(e) => setNewOptC(e.target.value)}
                            placeholder="Option C description"
                            className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-500">D</span>
                          <input
                            type="text"
                            required
                            value={newOptD}
                            onChange={(e) => setNewOptD(e.target.value)}
                            placeholder="Option D description"
                            className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Correct Option</label>
                        <select
                          value={newCorrect}
                          onChange={(e) => setNewCorrect(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 transition"
                        >
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-3 border-t border-slate-800 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setIsQuestionFormOpen(false)}
                        className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg shadow-md transition"
                      >
                        Save Details
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {isBulkFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                <div className="w-full max-w-4xl max-h-[90vh] p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-4 animate-scale-in text-left overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-800 gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-white">
                        Bulk Add Questions (10 at once)
                      </h3>
                      <p className="text-xs text-slate-400">Fill in details for exactly 10 questions to import them in batch.</p>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleAutoFillBulkQuestions}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold transition"
                      >
                        Auto-Fill Sample Questions
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkQuestions(createEmptyQuestions())}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setIsBulkFormOpen(false)}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveBulkQuestions} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-2">
                      {bulkQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                              Question #{idx + 1}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Question Text</label>
                              <input
                                type="text"
                                required
                                value={q.text}
                                onChange={(e) => {
                                  const updated = [...bulkQuestions];
                                  updated[idx].text = e.target.value;
                                  setBulkQuestions(updated);
                                }}
                                placeholder={`Enter question text #${idx + 1}...`}
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Option A</label>
                              <input
                                type="text"
                                required
                                value={q.opt_a}
                                onChange={(e) => {
                                  const updated = [...bulkQuestions];
                                  updated[idx].opt_a = e.target.value;
                                  setBulkQuestions(updated);
                                }}
                                placeholder="Option A description"
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Option B</label>
                              <input
                                type="text"
                                required
                                value={q.opt_b}
                                onChange={(e) => {
                                  const updated = [...bulkQuestions];
                                  updated[idx].opt_b = e.target.value;
                                  setBulkQuestions(updated);
                                }}
                                placeholder="Option B description"
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Option C</label>
                              <input
                                type="text"
                                required
                                value={q.opt_c}
                                onChange={(e) => {
                                  const updated = [...bulkQuestions];
                                  updated[idx].opt_c = e.target.value;
                                  setBulkQuestions(updated);
                                }}
                                placeholder="Option C description"
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Option D</label>
                              <input
                                type="text"
                                required
                                value={q.opt_d}
                                onChange={(e) => {
                                  const updated = [...bulkQuestions];
                                  updated[idx].opt_d = e.target.value;
                                  setBulkQuestions(updated);
                                }}
                                placeholder="Option D description"
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Correct Option</label>
                              <select
                                value={q.correct}
                                onChange={(e) => {
                                  const updated = [...bulkQuestions];
                                  updated[idx].correct = e.target.value;
                                  setBulkQuestions(updated);
                                }}
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950/60 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 transition"
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-3 pt-3 border-t border-slate-800 text-xs font-bold mt-4">
                      <button
                        type="button"
                        onClick={() => setIsBulkFormOpen(false)}
                        className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-lg shadow-md transition"
                      >
                        Submit All 10 Questions
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
