import { useParams } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import { useLocalTheme } from "../lib/useLocalTheme";
import {
  getControlState,
  getQuiz,
  hideAnswer as hide,
  listByQuiz,
  listRounds,
  nextControlPatch,
  nextQuestion as next,
  prevControlPatch,
  prevQuestion as prev,
  reset as resetControl,
  revealAnswer as reveal,
  setActiveQuestion as setActive,
  setTheme,
  updateControl,
} from "../lib/api";
import type { Phase, Question, Theme } from "../lib/types";
import { TopBar } from "./edit";

// Palette de l'interface Animer selon le thème LOCAL de l'appareil.
function hostPalette(theme: Theme) {
  const dark = theme === "dark";
  return {
    page: dark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900",
    panel: dark
      ? "border-zinc-800 bg-zinc-900/95"
      : "border-zinc-200 bg-white shadow-sm",
    muted: dark ? "text-zinc-400" : "text-zinc-500",
    strong: dark ? "text-zinc-100" : "text-zinc-900",
    neutral: dark
      ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
      : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300",
    ghost: dark
      ? "text-zinc-500 hover:text-zinc-300"
      : "text-zinc-400 hover:text-zinc-600",
    heading: dark ? "text-zinc-500" : "text-zinc-500",
    rowActive: dark
      ? "border-violet-500 bg-violet-600/15"
      : "border-violet-500 bg-violet-500/10",
    rowInactive: dark
      ? "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
      : "border-zinc-200 bg-white hover:border-zinc-300",
    rowAnswer: dark ? "text-emerald-400/90" : "text-emerald-600",
    card: dark
      ? "border-zinc-700 bg-zinc-950/50"
      : "border-zinc-200 bg-zinc-100",
    round: dark ? "text-violet-400" : "text-violet-600",
    choice: dark
      ? "border-zinc-700 text-zinc-200"
      : "border-zinc-300 text-zinc-700",
    choiceOk: dark
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
      : "border-emerald-500/60 bg-emerald-500/10 text-emerald-700",
    answerBox: dark
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700",
  };
}

export function HostPage() {
  const { quizId: id } = useParams({ from: "/quiz/$quizId/host" });
  const [localTheme, setLocalTheme] = useLocalTheme();
  const p = hostPalette(localTheme);

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

  if (quiz === null) {
    return (
      <div className={`flex h-screen items-center justify-center ${p.page}`}>
        Quiz introuvable.
      </div>
    );
  }

  const activeId = control?.activeQuestionId ?? null;
  const phase: Phase = control?.phase ?? "idle";
  const tvTheme = control?.theme ?? "dark";
  const reviewing = control?.reviewing ?? false;
  const atRoundEnd = phase === "round_end";
  const canReveal = !!activeId && !atRoundEnd;

  const phaseLabel =
    phase === "idle"
      ? "Au repos"
      : phase === "question"
        ? "Question affichée"
        : phase === "reveal"
          ? "Réponse révélée"
          : "Fin de manche";
  const stateLabel =
    reviewing && phase !== "idle" && phase !== "round_end"
      ? `Correction · ${phaseLabel}`
      : phaseLabel;

  const themeWord = (t: Theme) => (t === "dark" ? "Sombre" : "Clair");

  // Question actuellement à l'écran (pour l'aperçu en grand au-dessus des boutons).
  const orderedQs =
    rounds && questions
      ? (() => {
          const ro = new Map(rounds.map((r) => [r._id, r.order] as const));
          return [...questions].sort(
            (a, b) =>
              (ro.get(a.roundId) ?? 0) - (ro.get(b.roundId) ?? 0) ||
              a.order - b.order,
          );
        })()
      : [];
  const activeIndex = activeId
    ? orderedQs.findIndex((q) => q._id === activeId)
    : -1;
  const activeQuestion = activeIndex >= 0 ? orderedQs[activeIndex] : null;
  const activeRoundTitle =
    activeQuestion && rounds
      ? rounds.find((r) => r._id === activeQuestion.roundId)?.title ?? ""
      : "";

  // Chemin rapide : on calcule la cible côté client (données déjà en mémoire) et
  // on n'envoie qu'une seule écriture, au lieu de 3 allers-retours réseau.
  const navItems = orderedQs.map((q) => ({ id: q._id, roundId: q.roundId }));
  const goNext = () => {
    if (control && navItems.length) {
      const patch = nextControlPatch(
        {
          activeQuestionId: control.activeQuestionId,
          phase: control.phase,
          reviewing: control.reviewing,
        },
        navItems,
      );
      if (patch) void updateControl({ controlId: control._id, patch });
    } else {
      void next({ quizId: id });
    }
  };
  const goPrev = () => {
    if (control && navItems.length) {
      const patch = prevControlPatch(
        {
          activeQuestionId: control.activeQuestionId,
          phase: control.phase,
          reviewing: control.reviewing,
        },
        navItems,
      );
      if (patch) void updateControl({ controlId: control._id, patch });
    } else {
      void prev({ quizId: id });
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${p.page}`}>
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
        <TopBar
          quizId={id}
          title={quiz?.title ?? "…"}
          active="host"
          theme={localTheme}
        />

        {/* Barre de contrôle live — pensée mobile d'abord (l'animateur pilote au téléphone) */}
        <div
          className={`sticky top-2 z-10 mb-6 rounded-2xl border p-3 backdrop-blur sm:p-4 ${p.panel}`}
        >
          {/* Ligne d'état : phase */}
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm ${p.muted}`}>
              État :{" "}
              <span className={`font-semibold ${p.strong}`}>{stateLabel}</span>
            </span>
          </div>

          {/* Deux thèmes : écran TV (partagé) + ce téléphone (local à l'appareil) */}
          <div className="mt-2 flex items-center justify-end gap-2 text-xs">
            <span className={p.muted}>Thème —</span>
            <button
              onClick={() =>
                setTheme({
                  quizId: id,
                  theme: tvTheme === "dark" ? "light" : "dark",
                })
              }
              className={`rounded-lg px-2.5 py-1.5 font-medium ${p.neutral}`}
              title="Thème de l'écran TV (partagé)"
            >
              TV : {themeWord(tvTheme)}
            </button>
            <button
              onClick={() =>
                setLocalTheme(localTheme === "dark" ? "light" : "dark")
              }
              className={`rounded-lg px-2.5 py-1.5 font-medium ${p.neutral}`}
              title="Thème de ce téléphone (local)"
            >
              Téléphone : {themeWord(localTheme)}
            </button>
          </div>

          {/* Aperçu de la question à l'écran, en grand, au-dessus des boutons */}
          {activeQuestion && (phase === "question" || phase === "reveal") && (
            <CurrentQuestion
              q={activeQuestion}
              roundTitle={activeRoundTitle}
              number={activeIndex + 1}
              total={orderedQs.length}
              phase={phase}
              palette={p}
            />
          )}
          {atRoundEnd && (
            <div
              className={`mt-3 rounded-xl border p-4 text-center ${p.card}`}
            >
              <div className={`text-sm font-semibold uppercase tracking-wider ${p.round}`}>
                Fin de manche
              </div>
              <div className={`mt-1 text-sm ${p.muted}`}>
                Écran « nous allons venir corriger » — « Dévoiler les réponses »
                redéroule la manche pour révéler chaque réponse.
              </div>
            </div>
          )}

          {/* Navigation principale : gros boutons tactiles */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={goPrev}
              className={`flex-1 rounded-xl px-3 py-3.5 text-base font-medium active:scale-[0.98] ${p.neutral}`}
            >
              ← Préc.
            </button>
            <button
              onClick={goNext}
              className="flex-[2] rounded-xl bg-violet-600 px-3 py-3.5 text-base font-bold text-white active:scale-[0.98] hover:bg-violet-500"
            >
              {phase === "idle"
                ? "Démarrer →"
                : atRoundEnd
                  ? "Dévoiler les réponses →"
                  : "Suivant →"}
            </button>
          </div>

          {/* Actions secondaires : réponse, repos */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {phase === "reveal" ? (
              <button
                onClick={() => hide({ quizId: id })}
                className="rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                Cacher la réponse
              </button>
            ) : (
              <button
                onClick={() => reveal({ quizId: id })}
                disabled={!canReveal}
                className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Révéler la réponse
              </button>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => resetControl({ quizId: id })}
                className={`rounded-lg px-2 py-2.5 text-sm ${p.ghost}`}
                title="Écran d'attente"
              >
                Repos
              </button>
            </div>
          </div>
        </div>

        {/* Liste des questions cliquables */}
        {rounds === undefined || questions === undefined ? (
          <p className={p.muted}>Chargement…</p>
        ) : questions.length === 0 ? (
          <p className={p.muted}>
            Aucune question. Ajoute-en dans l'onglet Préparer.
          </p>
        ) : (
          <div className="space-y-6">
            {rounds.map((round) => {
              const qs = questions.filter((q) => q.roundId === round._id);
              if (qs.length === 0) return null;
              return (
                <section key={round._id}>
                  <h2
                    className={`mb-2 text-sm font-semibold uppercase tracking-wider ${p.heading}`}
                  >
                    {round.title}
                  </h2>
                  <ul className="space-y-2">
                    {qs.map((q) => (
                      <QuestionRow
                        key={q._id}
                        q={q}
                        active={q._id === activeId}
                        phase={phase}
                        palette={p}
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
    </div>
  );
}

function CurrentQuestion({
  q,
  roundTitle,
  number,
  total,
  phase,
  palette,
}: {
  q: Question;
  roundTitle: string;
  number: number;
  total: number;
  phase: Phase;
  palette: ReturnType<typeof hostPalette>;
}) {
  const revealed = phase === "reveal";
  return (
    <div className={`mt-3 rounded-xl border p-4 ${palette.card}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${palette.round}`}
        >
          {roundTitle}
        </span>
        <span className={`text-xs ${palette.muted}`}>
          Question {number} / {total}
          {revealed && " · réponse révélée"}
        </span>
      </div>

      <p className="text-xl font-bold leading-snug sm:text-2xl">{q.text}</p>

      {q.type === "mcq" && q.choices && (
        <ul className="mt-3 space-y-1.5">
          {q.choices.map((c, i) => (
            <li
              key={i}
              className={`rounded-lg border px-3 py-2 text-base font-medium ${
                c.correct ? palette.choiceOk : palette.choice
              }`}
            >
              {c.text}
            </li>
          ))}
        </ul>
      )}

      {q.type === "text" && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-base font-semibold ${palette.answerBox}`}
        >
          Réponse : {q.answer || "(vide)"}
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  q,
  active,
  phase,
  palette,
  onClick,
}: {
  q: Question;
  active: boolean;
  phase: Phase;
  palette: ReturnType<typeof hostPalette>;
  onClick: () => void;
}) {
  const badge =
    phase === "reveal"
      ? "RÉPONSE"
      : phase === "round_end"
        ? "FIN DE MANCHE"
        : "À L'ÉCRAN";
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full rounded-lg border px-4 py-3 text-left transition ${
          active ? palette.rowActive : palette.rowInactive
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">{q.text}</span>
          {active && (
            <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
              {badge}
            </span>
          )}
        </div>
        <div className={`mt-1 text-sm ${palette.rowAnswer}`}>
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
