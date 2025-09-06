export interface Question {
  text: string; // The expression, e.g., "(2*x + 3)^2"
  xValue: number; // The value of x to substitute
  answer: number;
}

export enum QuizState {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Finished = 'Finished',
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  time: number;
}
