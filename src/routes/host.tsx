import { useParams } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import {
  clearTimer,
  getControlState,
  getQuiz,
  hideAnswer as hide,
  listByQuiz,
  listRounds,
  nextQuestion as next,
  prevQuestion as prev,
  reset as resetControl,
  revealAnswer as reveal,
  setActiveQuestion as setActive,
  startTimer,
} from "../lib/api";
import type { Phase, Question } from "../lib/types";
import { useCountdown } from "../useCountdown";
import { TopBar } from "./edit";

const TIMER_PRESETS = [30, 60, 90, 120];

export function HostPage() {
  const { quizId: id } = useParams({ from: "/quiz/$quizId/host" });

  const quiz = useLiveQuery(() => getQuiz({ quizId: id }), [id], ["quizzes"], id);
  const rounds = useLiveQuery(
    () => listRounds({ quizId: id }),
    [id],
    ["rounds"],
    id,
  );
  const questions = useLiveQuery(
    () => listByQuiz({ quizId: id }),
    [id],
    ["questions"],
    id,
  );
  const control = useLiveQuery(
    () => getControlState({ quizId: id }),
    [id],
    ["control_state"],
    id,
  );

  const remaining = useCountdown(control?.timerEndsAt ?? null);

  if (quiz === null) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-500">
        Quiz introuvable.
      </div>
    );
  }

  const activeId = control?.activeQuestionId ?? null;
  const phase: Phase = control?.phase ?? "idle";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <TopBar quizId={id} title={quiz?.title ?? "…"} active="host" />

      {/* Barre de contrôle live */}
      <div className="sticky top-4 z-10 mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-zinc-400">
            État :{" "}
            <span className="font-semibold text-zinc-100">
              {phase === "idle"
                ? "Au repos"
                : phase === "question"
                  ? "Question affichée"
                  : "Réponse révélée"}
            </span>
          </span>
          {remaining !== null && (
            <span
              className={`font-mono text-lg font-bold ${
                remaining <= 10 ? "text-red-400" : "text-zinc-100"
              }`}
            >
              ⏱ {remaining}s
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => prev({ quizId: id })}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700"
          >
            ← Précédente
          </button>
          <button
            onClick={() => next({ quizId: id })}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700"
          >
            Suivante →
          </button>

          {phase === "reveal" ? (
            <button
              onClick={() => hide({ quizId: id })}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Cacher la réponse
            </button>
          ) : (
            <button
              onClick={() => reveal({ quizId: id })}
              disabled={!activeId}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Révéler la réponse
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            {TIMER_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => startTimer({ quizId: id, seconds: s })}
                disabled={!activeId}
                className="rounded-lg bg-zinc-800 px-2.5 py-2 text-sm hover:bg-zinc-700 disabled:opacity-40"
              >
                {s}s
              </button>
            ))}
            {remaining !== null && (
              <button
                onClick={() => clearTimer({ quizId: id })}
                className="rounded-lg px-2 py-2 text-sm text-zinc-500 hover:text-zinc-300"
              >
                Stop
              </button>
            )}
            <button
              onClick={() => resetControl({ quizId: id })}
              className="rounded-lg px-2 py-2 text-sm text-zinc-500 hover:text-zinc-300"
              title="Écran d'attente"
            >
              ⏏ Repos
            </button>
          </div>
        </div>
      </div>

      {/* Liste des questions cliquables */}
      {rounds === undefined || questions === undefined ? (
        <p className="text-zinc-500">Chargement…</p>
      ) : questions.length === 0 ? (
        <p className="text-zinc-500">
          Aucune question. Ajoute-en dans l'onglet Préparer.
        </p>
      ) : (
        <div className="space-y-6">
          {rounds.map((round) => {
            const qs = questions.filter((q) => q.roundId === round._id);
            if (qs.length === 0) return null;
            return (
              <section key={round._id}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  {round.title}
                </h2>
                <ul className="space-y-2">
                  {qs.map((q) => (
                    <QuestionRow
                      key={q._id}
                      q={q}
                      active={q._id === activeId}
                      phase={phase}
                      onClick={() =>
                        setActive({ quizId: id, questionId: q._id })
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  q,
  active,
  phase,
  onClick,
}: {
  q: Question;
  active: boolean;
  phase: Phase;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full rounded-lg border px-4 py-3 text-left transition ${
          active
            ? "border-violet-500 bg-violet-600/15"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">{q.text}</span>
          {active && (
            <span className="ml-3 shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
              {phase === "reveal" ? "RÉPONSE" : "À L'ÉCRAN"}
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-emerald-400/90">
          {q.type === "text"
            ? `Réponse : ${q.answer || "(vide)"}`
            : q.choices
                ?.filter((c) => c.correct)
                .map((c) => c.text)
                .join(", ")}
        </div>
      </button>
    </li>
  );
}
