import { useState } from "react";

export type QuestionType = "text" | "mcq";
export type Choice = { text: string; correct: boolean };

export type QuestionDraft = {
  type: QuestionType;
  text: string;
  answer?: string;
  choices?: Choice[];
};

type Props = {
  initial?: QuestionDraft;
  submitLabel: string;
  onSubmit: (draft: QuestionDraft) => void | Promise<void>;
  onCancel?: () => void;
};

const EMPTY_CHOICES: Choice[] = [
  { text: "", correct: true },
  { text: "", correct: false },
];

export function QuestionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "text");
  const [text, setText] = useState(initial?.text ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [choices, setChoices] = useState<Choice[]>(
    initial?.choices?.length ? initial.choices : EMPTY_CHOICES,
  );

  const setChoiceText = (i: number, value: string) =>
    setChoices((cs) => cs.map((c, j) => (j === i ? { ...c, text: value } : c)));

  const setCorrect = (i: number) =>
    setChoices((cs) => cs.map((c, j) => ({ ...c, correct: j === i })));

  const addChoice = () =>
    setChoices((cs) => [...cs, { text: "", correct: false }]);

  const removeChoice = (i: number) =>
    setChoices((cs) => {
      const next = cs.filter((_, j) => j !== i);
      // Garantit qu'il reste une bonne réponse.
      if (!next.some((c) => c.correct) && next.length)
        next[0] = { ...next[0], correct: true };
      return next;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (type === "text") {
      onSubmit({ type, text: text.trim(), answer: answer.trim() });
    } else {
      const cleaned = choices
        .map((c) => ({ ...c, text: c.text.trim() }))
        .filter((c) => c.text);
      if (cleaned.length < 2 || !cleaned.some((c) => c.correct)) return;
      onSubmit({ type, text: text.trim(), choices: cleaned });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
    >
      <div className="flex gap-2">
        {(["text", "mcq"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              type === t
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t === "text" ? "Réponse libre" : "Choix multiples"}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-400">Question</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Énoncé de la question…"
          className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500"
        />
      </div>

      {type === "text" ? (
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Réponse</label>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="La bonne réponse…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm text-zinc-400">
            Propositions (coche la bonne)
          </label>
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-choice"
                checked={c.correct}
                onChange={() => setCorrect(i)}
                className="h-4 w-4 accent-violet-500"
              />
              <input
                value={c.text}
                onChange={(e) => setChoiceText(i, e.target.value)}
                placeholder={`Proposition ${i + 1}`}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500"
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  className="px-2 text-zinc-500 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addChoice}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            + Ajouter une proposition
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-300 transition hover:bg-zinc-700"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
