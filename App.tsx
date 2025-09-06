import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question, QuizState, LeaderboardEntry } from './types';

const TOTAL_QUESTIONS = 15;
const LEADERBOARD_MAX_TIME = 300; // 5 minutes in seconds
const LEADERBOARD_KEY = 'algebraLeaderboard';
const LEADERBOARD_SIZE = 10;

// --- Helper Types ---
interface QuizHistoryEntry {
  question: Question;
  userAnswer: string;
}

// --- Question Generation ---

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randNoZero = (min: number, max: number) => {
  let value = 0;
  while (value === 0) value = rand(min, max);
  return value;
};

const generateQuestions = (): Question[] => {
  const questions: Question[] = [];
  const questionGenerators = [
    () => { // Template: a(x + b)^2
      const a = rand(2, 5);
      const b = randNoZero(-5, 5);
      const xValue = randNoZero(-4, 4);
      const text = `${a}(x ${b > 0 ? '+' : '-'} ${Math.abs(b)})^2`;
      const answer = a * Math.pow(xValue + b, 2);
      return { text, xValue, answer };
    },
    () => { // Template: ax^2 + bx + c
      const a = rand(2, 5);
      const b = randNoZero(-7, 7);
      const c = rand(-10, 10);
      const xValue = randNoZero(-3, 3);
      let text = `${a}x^2`;
      text += ` ${b > 0 ? '+' : '-'} ${Math.abs(b)}x`;
      if (c !== 0) text += ` ${c > 0 ? '+' : '-'} ${Math.abs(c)}`;
      const answer = a * Math.pow(xValue, 2) + b * xValue + c;
      return { text, xValue, answer };
    },
    () => { // Template: (ax + b) / c (guaranteed integer result)
      const a = rand(2, 5);
      const xValue = rand(1, 5);
      const c = rand(2, 5);
      let b, result;
      do {
        result = rand(2, 10);
        b = result * c - a * xValue;
      } while (b === 0);
      const text = `(${a}x ${b > 0 ? '+' : '-'} ${Math.abs(b)}) / ${c}`;
      return { text, xValue, answer: result };
    },
    () => { // Template: (x + a)(x + b)
      const a = randNoZero(-6, 6);
      const b = randNoZero(-6, 6);
      const xValue = randNoZero(-4, 4);
      const text = `(x ${a > 0 ? '+' : '-'} ${Math.abs(a)})(x ${b > 0 ? '+' : '-'} ${Math.abs(b)})`;
      const answer = (xValue + a) * (xValue + b);
      return { text, xValue, answer };
    }
  ];

  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const generator = questionGenerators[Math.floor(Math.random() * questionGenerators.length)];
    questions.push(generator());
  }
  return questions;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// --- Child Components ---

interface LeaderboardProps {
  scores: LeaderboardEntry[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ scores }) => (
  <div className="w-full max-w-md bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-white/20 mt-8">
    <h2 className="text-3xl font-bold text-white text-center mb-4">Leaderboard</h2>
    {scores.length === 0 ? (
      <p className="text-center text-indigo-200">No scores yet. Be the first!</p>
    ) : (
      <ol className="space-y-3">
        {scores.map((entry, index) => (
          <li key={`${entry.name}-${entry.score}-${entry.time}-${index}`} className="flex justify-between items-center text-lg p-2 rounded-md bg-black/20 animate-fade-in" style={{animationDelay: `${index * 50}ms`}}>
            <span className="font-bold text-white w-8">#{index + 1}</span>
            <span className="text-indigo-200 flex-grow">{entry.name}</span>
            <span className="text-green-400 font-semibold w-20 text-right">{entry.score} pts</span>
            <span className="text-yellow-300 font-semibold w-24 text-right">{formatTime(entry.time)}</span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

interface StartScreenProps {
  onStart: (name: string) => void;
  leaderboard: LeaderboardEntry[];
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, leaderboard }) => {
  const [name, setName] = useState('');

  const handleStart = () => {
    if (name.trim()) {
      onStart(name.trim());
    }
  };

  return (
    <div className="text-center animate-fade-in flex flex-col items-center">
      <h1 className="text-5xl font-bold text-white mb-4">Algebra Speed Test</h1>
      <p className="text-xl text-indigo-200 mb-8 max-w-2xl">Enter your name and test your algebra skills. Finish in under 2 minutes to make the leaderboard!</p>
      
      <div className="w-full max-w-sm">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          className="w-full text-center text-2xl p-3 mb-4 rounded-lg bg-gray-900/50 text-white border-2 border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition"
          placeholder="Enter Your Name"
          aria-label="Enter Your Name"
        />
        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
        >
          Start Quiz
        </button>
      </div>

      <Leaderboard scores={leaderboard} />
    </div>
  );
};

interface QuizScreenProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  elapsedTime: number;
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({
  question, questionNumber, totalQuestions, elapsedTime, userAnswer, setUserAnswer, handleSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [question]);

  return (
    <div className="w-full max-w-2xl mx-auto animate-slide-in-up">
      <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6 text-indigo-200">
          <div className="text-lg font-semibold">Question {questionNumber}/{totalQuestions}</div>
          <div className="text-lg font-bold bg-indigo-500/50 text-white px-4 py-1 rounded-md">{formatTime(elapsedTime)}</div>
        </div>
        <div className="text-center mb-8">
          <p className="text-2xl text-indigo-200 mb-2" aria-label={`For x equals ${question.xValue}`}>For x = {question.xValue}</p>
          <p className="text-5xl md:text-6xl font-bold text-white tracking-wider" aria-label={`The expression is ${question.text.replace(/\^2/g, ' squared')}`}>
            {question.text.replace(/\^2/g, '²')} = ?
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef} type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full text-center text-4xl p-4 rounded-lg bg-gray-900/50 text-white border-2 border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition"
            placeholder="Your answer" autoComplete="off"
          />
          <button type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg text-2xl transition-transform transform hover:scale-105 shadow-lg">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

interface ResultsScreenProps {
  correctCount: number;
  totalQuestions: number;
  totalTime: number;
  onRestart: () => void;
  leaderboard: LeaderboardEntry[];
  madeLeaderboard: boolean;
  quizHistory: QuizHistoryEntry[];
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ correctCount, totalQuestions, totalTime, onRestart, leaderboard, madeLeaderboard, quizHistory }) => (
  <div className="text-center animate-fade-in w-full max-w-3xl flex flex-col items-center">
    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-white/20 w-full">
      <h2 className="text-4xl font-bold text-white mb-4">Quiz Complete!</h2>
      {madeLeaderboard && <p className="text-2xl text-green-400 mb-4 animate-pulse">You made the leaderboard!</p>}
      <div className="my-8 space-y-4">
        <div className="text-2xl text-indigo-200">
          You scored: <span className="font-bold text-5xl text-green-400 block">{correctCount} / {totalQuestions}</span>
        </div>
        <div className="text-2xl text-indigo-200">
          Total Time: <span className="font-bold text-5xl text-yellow-300 block">{formatTime(totalTime)}</span>
        </div>
      </div>
      
      <div className="mt-10 w-full">
        <h3 className="text-2xl font-bold text-white mb-4">Answer Review</h3>
        <div className="max-h-72 overflow-y-auto bg-black/20 p-2 sm:p-4 rounded-lg border border-white/10">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="text-indigo-300">
                <th className="p-2 font-semibold">Question</th>
                <th className="p-2 font-semibold text-center">Your Answer</th>
                <th className="p-2 font-semibold text-center">Correct Answer</th>
              </tr>
            </thead>
            <tbody>
              {quizHistory.map((entry, index) => {
                const isCorrect = parseInt(entry.userAnswer, 10) === entry.question.answer;
                return (
                  <tr key={index} className="border-t border-white/10">
                    <td className="p-2 text-white">{`For x=${entry.question.xValue}, ${entry.question.text.replace(/\^2/g, '²')}`}</td>
                    <td className={`p-2 text-center font-bold ${isCorrect ? 'text-green-400' : 'text-red-500'}`}>{entry.userAnswer}</td>
                    <td className="p-2 text-center text-yellow-300 font-semibold">{entry.question.answer}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={onRestart} className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition-transform transform hover:scale-105 shadow-lg">
        Play Again
      </button>
    </div>
    <Leaderboard scores={leaderboard} />
  </div>
);

// --- Main App Component ---

export default function App() {
  const [quizState, setQuizState] = useState<QuizState>(QuizState.NotStarted);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [madeLeaderboard, setMadeLeaderboard] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEntry[]>([]);

  const timerRef = useRef<number | null>(null);

  // Load leaderboard from localStorage on initial render
  useEffect(() => {
    // In a real app, this would be an API call to your backend
    try {
      const savedLeaderboard = localStorage.getItem(LEADERBOARD_KEY);
      if (savedLeaderboard) {
        setLeaderboard(JSON.parse(savedLeaderboard));
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    }
  }, []);

  const startTimer = useCallback(() => {
    const start = Date.now();
    setStartTime(start);
    timerRef.current = window.setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const end = Date.now();
    setEndTime(end);
    return end;
  }, []);
  
  const startQuiz = useCallback((name: string) => {
    setPlayerName(name);
    const newQuestions = generateQuestions();
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setUserAnswer('');
    setElapsedTime(0);
    setMadeLeaderboard(false);
    setQuizHistory([]);
    setQuizState(QuizState.InProgress);
    startTimer();
  }, [startTimer]);

  const restartQuiz = useCallback(() => {
    setQuizState(QuizState.NotStarted);
  }, []);

  // Effect to handle leaderboard update after the quiz is finished
  useEffect(() => {
    if (quizState === QuizState.Finished && startTime > 0 && endTime > 0) {
      const totalTime = Math.floor((endTime - startTime) / 1000);
      
      if (totalTime < LEADERBOARD_MAX_TIME) {
        const newEntry: LeaderboardEntry = { name: playerName, score: correctCount, time: totalTime };

        const updatedLeaderboard = [...leaderboard, newEntry]
          .sort((a, b) => {
            if (a.score !== b.score) {
              return b.score - a.score; // Higher score first
            }
            return a.time - b.time; // Lower time first
          })
          .slice(0, LEADERBOARD_SIZE);

        setLeaderboard(updatedLeaderboard);
        setMadeLeaderboard(updatedLeaderboard.includes(newEntry));

        // In a real app, this would be an API call to save the score
        try {
          localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedLeaderboard));
        } catch (error) {
          console.error("Failed to save leaderboard:", error);
        }
      }
    }
  }, [quizState, startTime, endTime, correctCount, playerName, leaderboard]);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer === '') return;

    const currentQuestion = questions[currentQuestionIndex];
    
    if (parseInt(userAnswer, 10) === currentQuestion.answer) {
      setCorrectCount(prev => prev + 1);
    }
    
    const historyEntry: QuizHistoryEntry = {
      question: currentQuestion,
      userAnswer: userAnswer,
    };
    setQuizHistory(prev => [...prev, historyEntry]);
    
    setUserAnswer('');

    if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      stopTimer();
      setQuizState(QuizState.Finished);
    }
  }, [userAnswer, questions, currentQuestionIndex, stopTimer]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const renderContent = () => {
    switch (quizState) {
      case QuizState.InProgress:
        return <QuizScreen
          question={questions[currentQuestionIndex]}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={TOTAL_QUESTIONS}
          elapsedTime={elapsedTime}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          handleSubmit={handleSubmit}
        />;
      case QuizState.Finished:
        return <ResultsScreen
          correctCount={correctCount}
          totalQuestions={TOTAL_QUESTIONS}
          totalTime={Math.floor((endTime - startTime) / 1000)}
          onRestart={restartQuiz}
          leaderboard={leaderboard}
          madeLeaderboard={madeLeaderboard}
          quizHistory={quizHistory}
        />;
      case QuizState.NotStarted:
      default:
        return <StartScreen onStart={startQuiz} leaderboard={leaderboard} />;
    }
  };

  return (
    <main className="bg-gray-900 min-h-screen flex items-center justify-center p-4 font-sans bg-gradient-to-br from-indigo-900 via-gray-900 to-purple-900">
      {renderContent()}
    </main>
  );
}
