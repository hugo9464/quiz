import { useParams } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import { getDisplayState } from "../lib/api";
import { useCountdown } from "../useCountdown";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function DisplayPage() {
  const { quizId: id } = useParams({ from: "/quiz/$quizId/display" });
  const state = useLiveQuery(
    () => getDisplayState({ quizId: id }),
    [id],
    ["control_state", "questions", "rounds", "quizzes"],
    id,
  );
  const remaining = useCountdown(state?.timerEndsAt ?? null);

  if (state === undefined) {
    return <Screen>…</Screen>;
  }

  // Écran d'attente.
  if (state.phase === "idle" || !state.question) {
    return (
      <Screen>
        <div className="text-center">
          <div className="mb-6 text-8xl">🍻</div>
          <h1 className="text-6xl font-black tracking-tight md:text-8xl">
            {state.quizTitle || "Quiz du bar"}
          </h1>
          <p className="mt-6 text-3xl text-zinc-400">
            Le quiz va bientôt commencer…
          </p>
        </div>
      </Screen>
    );
  }

  const q = state.question;
  const revealed = state.phase === "reveal";

  return (
    <Screen>
      {/* En-tête : manche + numéro + timer */}
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold uppercase tracking-widest text-violet-400 md:text-3xl">
          {state.roundTitle}
        </div>
        <div className="text-2xl text-zinc-500 md:text-3xl">
          Question {state.questionNumber} / {state.totalQuestions}
        </div>
      </div>

      {/* Énoncé */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
          {q.text}
        </h1>

        {q.type === "mcq" && q.choices && (
          <div className="mt-12 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {q.choices.map((c, i) => {
              const highlight = revealed && c.correct;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-5 rounded-2xl border-2 px-7 py-5 text-3xl font-semibold transition-all duration-300 md:text-4xl ${
                    highlight
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-100"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black ${
                      highlight
                        ? "bg-emerald-400 text-zinc-950"
                        : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span>{c.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Réponse libre révélée */}
        {q.type === "text" && revealed && (
          <div className="mt-12 rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 px-10 py-6">
            <div className="text-2xl uppercase tracking-widest text-emerald-400">
              Réponse
            </div>
            <div className="mt-2 text-5xl font-black text-emerald-200 md:text-6xl">
              {q.answer}
            </div>
          </div>
        )}
      </div>

      {/* Pied : timer */}
      <div className="flex h-24 items-center justify-center">
        {remaining !== null && (
          <div
            className={`font-mono text-7xl font-black tabular-nums transition-colors md:text-8xl ${
              remaining <= 10 ? "text-red-500" : "text-zinc-100"
            }`}
          >
            {remaining}
          </div>
        )}
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 p-10 text-zinc-50 md:p-16">
      {children}
    </div>
  );
}
