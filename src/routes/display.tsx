import { useLayoutEffect, useMemo, useRef, useState } from "react";
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

const WTF_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

const WTF_PHRASES = [
  "BOUM !",
  "ÉNORME !",
  "OUAIS !",
  "TADAAA !",
  "MYTHIQUE !",
  "AH OUAIS QUAND MÊME",
  "LA CLASSE",
  "C'ÉTAIT ÉVIDENT",
  "BIM !",
  "PAF, DANS L'MILLE",
  "INCROYABLE !",
  "ET VOILÀ !",
  "MAGISTRAL",
  "RESPECT",
  "NO WAY",
  "TROP FORT",
  "BADABOUM !",
  "ET TOC !",
  "IMPARABLE",
  "DE OUF",
  "COLOSSAL",
  "GG LES BOSS",
  "FASTOCHE",
  "MONUMENTAL",
  "OH LA LA",
  "SÉRIEUX ?!",
  "C'EST BEAU",
  "CHAPEAU BAS",
  "QUELLE CULTURE",
  "SANS FORCER",
  "LES YEUX FERMÉS",
  "TU L'AS EU",
  "DANS TA FACE",
  "PROPRE",
  "NICKEL",
  "ÇA DÉPOTE",
  "LÉGENDAIRE",
  "PHÉNOMÉNAL",
  "BOOM SHAKALAKA",
  "TABLEAU DE MAÎTRE",
  "ÉPOUSTOUFLANT",
  "CARTON PLEIN",
  "ET BAM !",
  "OUH LÀ !",
  "AH BAH VOILÀ",
  "GÉNIAL",
  "STRATOSPHÉRIQUE",
  "DE HAUT VOL",
  "QUE DU LOURD",
  "C'EST CADEAU",
  "MOULT POINTS",
  "SPECTACULAIRE",
  "BLUFFANT",
  "COMME UN CHEF",
  "TROP BALÈZE",
  "IMPRESSIONNANT",
  "MAJESTUEUX",
  "ÇA C'EST FAIT",
  "SANTÉ !",
  "TOURNÉE GÉNÉRALE",
  "ALLEZ HOP",
  "PILE POIL",
  "DROIT AU BUT",
  "OYÉ OYÉ",
  "MIRACULEUX",
  "DIABOLIQUE",
  "GRANDIOSE",
  "TU ASSURES",
  "HALLUCINANT",
  "COMME PAR MAGIE",
  "AH OUI TIENS",
  "TROP D'AISE",
  "IMPÉRIAL",
  "FINE ÉQUIPE",
  "ROULEZ JEUNESSE",
  "AU TOP",
  "C'EST DANS LA POCHE",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Overlay chaotique affiché à la révélation : confettis + phrase débile + disco.
// Tout est retiré au hasard une fois, au montage (donc à chaque révélation).
function RevealFx() {
  const fx = useMemo(
    () => ({
      pieces: Array.from({ length: 70 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.4 + Math.random() * 2.2,
        size: 8 + Math.random() * 20,
        color: pick(WTF_COLORS),
        round: Math.random() > 0.5,
      })),
      phrase: pick(WTF_PHRASES),
      phraseColor: pick(WTF_COLORS),
      phraseRot: -14 + Math.random() * 28,
      phraseTop: 6 + Math.random() * 22,
    }),
    [],
  );
  const { pieces, phrase, phraseColor, phraseRot, phraseTop } = fx;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            animation: `wtf-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: `${phraseTop}%` }}
      >
        <div
          className="rounded-2xl px-8 py-4 text-6xl font-black text-white md:text-8xl"
          style={{
            ["--r" as string]: `${phraseRot}deg`,
            backgroundColor: phraseColor,
            transform: `rotate(${phraseRot}deg)`,
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
            animation:
              "wtf-pop 0.5s cubic-bezier(0.2,1.6,0.4,1), wtf-fade 0.6s ease-in 1.9s forwards",
          }}
        >
          {phrase}
        </div>
      </div>
    </div>
  );
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

  // Intro de manche : on annonce la manche à venir avant sa première question.
  if (state.phase === "round_intro") {
    return (
      <Screen className={p.screen}>
        <div className="m-auto text-center">
          <div
            className={`text-3xl font-semibold uppercase tracking-widest md:text-4xl ${p.round}`}
          >
            Manche suivante
          </div>
          <h1 className="mt-4 text-7xl font-black tracking-tight md:text-9xl">
            {state.roundTitle}
          </h1>
          <p className={`mt-8 text-3xl md:text-4xl ${p.subtle}`}>
            C'est parti !
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
  const shake = revealed
    ? { animation: "wtf-shake 0.6s ease-in-out" }
    : undefined;

  return (
    <Screen className={p.screen}>
      {revealed && <RevealFx />}
      {q.type === "mcq" && q.choices ? (
        // QCM : énoncé en haut (auto-fit), propositions qui remplissent le reste.
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-6" style={shake}>
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
                  style={
                    highlight
                      ? { animation: "wtf-wobble 0.6s ease-in-out 2" }
                      : undefined
                  }
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
        <div className="flex min-h-0 flex-1 flex-col gap-6" style={shake}>
          <div className="min-h-0 flex-1">
            <FitText text={q.text} className="font-black tracking-tight" />
          </div>
          {revealed && q.answer && (
            <div
              style={{ animation: "wtf-wobble 0.6s ease-in-out 2" }}
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
