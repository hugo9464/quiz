import { useParams } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import { getDisplayState } from "../lib/api";
import type { Theme } from "../lib/types";

// Palette d'affichage TV selon le thème piloté depuis la page Animer.
function palette(theme: Theme) {
  const dark = theme === "dark";
  return {
    screen: dark ? "bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900",
    subtle: dark ? "text-zinc-400" : "text-zinc-500",
    round: dark ? "text-violet-400" : "text-violet-600",
    choice: dark
      ? "border-zinc-700 bg-zinc-900/60 text-zinc-100"
      : "border-zinc-300 bg-white text-zinc-900",
    choiceOk: dark
      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
      : "border-emerald-500 bg-emerald-500/15 text-emerald-700",
    answerBox: dark
      ? "border-emerald-400 bg-emerald-500/20"
      : "border-emerald-500 bg-emerald-500/10",
    answerLabel: dark ? "text-emerald-400" : "text-emerald-600",
    answerText: dark ? "text-emerald-200" : "text-emerald-700",
  };
}

// Taille des propositions QCM : moins il y en a, plus c'est gros (l'écran est rempli).
function choiceTextSize(n: number): string {
  if (n <= 2) return "text-5xl md:text-7xl";
  if (n <= 4) return "text-4xl md:text-6xl";
  return "text-3xl md:text-5xl"; // 5 propositions ou plus
}

export function DisplayPage() {
  const { quizId: id } = useParams({ from: "/quiz/$quizId/display" });
  const state = useLiveQuery(
    () => getDisplayState({ quizId: id }),
    [id],
    ["control_state", "questions", "rounds", "quizzes"],
    id,
  );
  const p = palette(state?.theme ?? "dark");

  if (state === undefined) {
    return <Screen className={p.screen}>…</Screen>;
  }

  // Fin de manche : on invite les équipes à attendre la correction.
  if (state.phase === "round_end") {
    return (
      <Screen className={p.screen}>
        <div className="m-auto text-center">
          <div
            className={`text-3xl font-semibold uppercase tracking-widest md:text-4xl ${p.round}`}
          >
            {state.isLastRound ? "Fin du quiz" : "Fin de la manche"}
          </div>
          {state.roundTitle && !state.isLastRound && (
            <h1 className="mt-4 text-6xl font-black tracking-tight md:text-8xl">
              {state.roundTitle}
            </h1>
          )}
          <p className={`mt-8 text-3xl md:text-4xl ${p.subtle}`}>
            Nous allons passer vous corriger
          </p>
        </div>
      </Screen>
    );
  }

  // Écran d'attente.
  if (state.phase === "idle" || !state.question) {
    return (
      <Screen className={p.screen}>
        <div className="m-auto text-center">
          <h1 className="text-6xl font-black tracking-tight md:text-8xl">
            {state.quizTitle || "Quiz du bar"}
          </h1>
          <p className={`mt-6 text-3xl ${p.subtle}`}>
            Le quiz va bientôt commencer…
          </p>
        </div>
      </Screen>
    );
  }

  const q = state.question;
  const revealed = state.phase === "reveal";

  return (
    <Screen className={p.screen}>
      {/* Énoncé */}
      <div
        className={`flex flex-1 flex-col text-center ${
          q.type === "text" ? "items-center justify-center" : "min-h-0"
        }`}
      >
        <h1 className="shrink-0 text-5xl font-black leading-tight tracking-tight md:text-7xl">
          {q.text}
        </h1>

        {q.type === "mcq" && q.choices && (
          <div
            className={`mt-6 grid min-h-0 flex-1 auto-rows-fr gap-3 md:mt-10 md:gap-5 ${
              q.choices.length <= 3 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {q.choices.map((c, i) => {
              const highlight = revealed && c.correct;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-center rounded-2xl border-2 px-6 py-3 text-center font-bold leading-tight transition-all duration-300 ${choiceTextSize(
                    q.choices!.length,
                  )} ${highlight ? p.choiceOk : p.choice}`}
                >
                  {c.text}
                </div>
              );
            })}
          </div>
        )}

        {/* Réponse libre révélée */}
        {q.type === "text" && revealed && (
          <div className={`mt-12 rounded-2xl border-2 px-10 py-6 ${p.answerBox}`}>
            <div
              className={`text-2xl uppercase tracking-widest ${p.answerLabel}`}
            >
              Réponse
            </div>
            <div className={`mt-2 text-5xl font-black md:text-6xl ${p.answerText}`}>
              {q.answer}
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}

function Screen({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-screen w-screen flex-col p-10 transition-colors duration-300 md:p-16 ${className}`}
    >
      {children}
    </div>
  );
}
