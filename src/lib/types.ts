// Types domaine — remplacent les types générés par Convex (`Id`, `Doc`).
// Les IDs sont désormais des `string` (uuid Postgres). Les objets renvoyés par
// `api.ts` conservent les mêmes noms de champs camelCase que les anciens docs
// Convex (`_id`, `quizId`, `timerEndsAt`…) pour minimiser les changements côté UI.

export type Phase = "idle" | "question" | "reveal" | "round_end";
export type QuestionType = "text" | "mcq";
export type Choice = { text: string; correct: boolean };
export type Theme = "dark" | "light";

export type Quiz = {
  _id: string;
  title: string;
  createdAt: number;
};

export type Round = {
  _id: string;
  quizId: string;
  title: string;
  order: number;
};

export type Question = {
  _id: string;
  quizId: string;
  roundId: string;
  order: number;
  type: QuestionType;
  text: string;
  answer?: string;
  choices?: Choice[];
};

export type ControlState = {
  _id: string;
  quizId: string;
  activeQuestionId: string | null;
  phase: Phase;
  timerEndsAt: number | null;
  theme: Theme;
  // Vrai pendant la passe de correction (on redéroule la manche pour révéler les réponses).
  reviewing: boolean;
};

export type DisplayState = {
  quizTitle: string;
  phase: Phase;
  timerEndsAt: number | null;
  question: Question | null;
  roundTitle: string;
  questionNumber: number;
  totalQuestions: number;
  theme: Theme;
  // Renseigné en phase "round_end" : vrai si c'est la dernière manche du quiz.
  isLastRound: boolean;
};
