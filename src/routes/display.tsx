import { useLayoutEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import { getDisplayState } from "../lib/api";
import type { Theme } from "../lib/types";

// Agrandit la police au maximum pour que le texte remplisse son conteneur
// (largeur ET hauteur), sans déborder. Recalcule au redimensionnement et quand
// le texte change. C'est ce qui fait « prendre le plus de place possible ».
function FitText({
  text,
  className = "",
  max = 600,
  fill = 0.85,
  onFit,
}: {
  text: string;
  className?: string;
  max?: number;
  // Fraction de la taille maximale réellement appliquée (< 1 = un peu plus petit,
  // laisse une marge autour du texte).
  fill?: number;
  // Notifie la taille de police finale appliquée (px).
  onFit?: (px: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return;
    const fit = () => {
      const maxW = box.clientWidth;
      const maxH = box.clientHeight;
      if (!maxW || !maxH) return;
      let lo = 8;
      let hi = max;
      let best = 8;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollWidth <= maxW && el.scrollHeight <= maxH) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const applied = best * fill;
      el.style.fontSize = `${applied}px`;
      onFit?.(applied);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [text, max, fill, onFit]);

  return (
    <div
      ref={boxRef}
      className="flex h-full w-full items-center justify-center overflow-hidden text-center"
    >
      <div ref={textRef} className={className} style={{ width: "100%", lineHeight: 1.05 }}>
        {text}
      </div>
    </div>
  );
}

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

export function DisplayPage() {
  const { quizId: id } = useParams({ from: "/quiz/$quizId/display" });
  const state = useLiveQuery(
    () => getDisplayState({ quizId: id }),
    [id],
    ["control_state", "questions", "rounds", "quizzes"],
    id,
  );
  const p = palette(state?.theme ?? "dark");
  // Taille de police de l'énoncé QCM, pour plafonner les propositions en dessous.
  const [qSize, setQSize] = useState<number | null>(null);

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
      {q.type === "mcq" && q.choices ? (
        // QCM : énoncé en haut (auto-fit), propositions qui remplissent le reste.
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-6">
          <div className="min-h-0 shrink-0 basis-[38%]">
            <FitText
              text={q.text}
              className="font-black tracking-tight"
              onFit={setQSize}
            />
          </div>
          <div
            className={`grid min-h-0 flex-1 auto-rows-fr gap-3 md:gap-5 ${
              q.choices.length <= 3 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {q.choices.map((c, i) => {
              const highlight = revealed && c.correct;
              return (
                <div
                  key={i}
                  className={`min-h-0 rounded-2xl border-2 p-3 transition-all duration-300 ${
                    highlight ? p.choiceOk : p.choice
                  }`}
                >
                  {/* Propositions plafonnées à 60% de la taille de l'énoncé :
                      la question reste toujours la plus grosse. */}
                  <FitText
                    text={c.text}
                    className="font-bold"
                    max={qSize ? qSize * 0.6 : 90}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Question libre : énoncé qui remplit l'écran, réponse en dessous si révélée.
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="min-h-0 flex-1">
            <FitText text={q.text} className="font-black tracking-tight" />
          </div>
          {revealed && q.answer && (
            <div
              className={`flex min-h-0 shrink-0 basis-[38%] flex-col rounded-2xl border-2 p-4 ${p.answerBox}`}
            >
              <div
                className={`shrink-0 text-xl uppercase tracking-widest md:text-2xl ${p.answerLabel}`}
              >
                Réponse
              </div>
              <div className="min-h-0 flex-1 pt-2">
                <FitText
                  text={q.answer}
                  className={`font-black ${p.answerText}`}
                />
              </div>
            </div>
          )}
        </div>
      )}
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
