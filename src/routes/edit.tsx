import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import {
  createQuestion,
  createRound,
  deleteQuestion,
  deleteRound,
  getQuiz,
  listByQuiz,
  listRounds,
  renameRound,
  updateQuestion,
} from "../lib/api";
import type { Question, Round } from "../lib/types";
import { QuestionForm, type QuestionDraft } from "../components/QuestionForm";

export function EditPage() {
  const { quizId: id } = useParams({ from: "/quiz/$quizId/edit" });

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

  const [newRound, setNewRound] = useState("");

  if (quiz === null) {
    return <CenteredMessage message="Quiz introuvable." />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <TopBar quizId={id} title={quiz?.title ?? "…"} active="edit" />

      <h1 className="mb-1 text-3xl font-bold">{quiz?.title}</h1>
      <p className="mb-8 text-zinc-400">Préparation des manches et questions</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newRound.trim()) return;
          createRound({ quizId: id, title: newRound });
          setNewRound("");
        }}
        className="mb-8 flex gap-3"
      >
        <input
          value={newRound}
          onChange={(e) => setNewRound(e.target.value)}
          placeholder="Nom de la manche (ex. Culture générale)"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none focus:border-violet-500"
        />
        <button className="rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-white transition hover:bg-violet-500">
          + Manche
        </button>
      </form>

      {rounds === undefined || questions === undefined ? (
        <p className="text-zinc-500">Chargement…</p>
      ) : rounds.length === 0 ? (
        <p className="text-zinc-500">
          Crée une première manche pour commencer.
        </p>
      ) : (
        <div className="space-y-8">
          {rounds.map((round) => (
            <RoundSection
              key={round._id}
              quizId={id}
              round={round}
              questions={questions.filter((q) => q.roundId === round._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoundSection({
  quizId,
  round,
  questions,
}: {
  quizId: string;
  round: Round;
  questions: Question[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <input
          defaultValue={round.title}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== round.title)
              renameRound({ roundId: round._id, title: e.target.value });
          }}
          className="flex-1 rounded-md bg-transparent px-1 py-1 text-xl font-semibold outline-none hover:bg-zinc-900 focus:bg-zinc-900"
        />
        <button
          onClick={() => {
            if (confirm(`Supprimer la manche « ${round.title} » ?`))
              deleteRound({ roundId: round._id });
          }}
          className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:text-red-400"
        >
          Supprimer la manche
        </button>
      </div>

      <ol className="space-y-2">
        {questions.map((q, i) =>
          editingId === q._id ? (
            <li key={q._id}>
              <QuestionForm
                submitLabel="Enregistrer"
                initial={{
                  type: q.type,
                  text: q.text,
                  answer: q.answer,
                  choices: q.choices,
                }}
                onSubmit={async (draft) => {
                  await updateQuestion({ questionId: q._id, ...draft });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={q._id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div className="min-w-0">
                <span className="mr-2 text-sm text-zinc-500">{i + 1}.</span>
                <span className="font-medium">{q.text}</span>
                <QuestionAnswerPreview q={q} />
              </div>
              <div className="flex shrink-0 gap-1 text-sm">
                <button
                  onClick={() => setEditingId(q._id)}
                  className="rounded-md bg-zinc-800 px-2.5 py-1 hover:bg-zinc-700"
                >
                  Éditer
                </button>
                <button
                  onClick={() => deleteQuestion({ questionId: q._id })}
                  className="rounded-md px-2 py-1 text-zinc-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </li>
          ),
        )}
      </ol>

      <div className="mt-3">
        {adding ? (
          <QuestionForm
            submitLabel="Ajouter"
            onSubmit={async (draft: QuestionDraft) => {
              await createQuestion({
                quizId,
                roundId: round._id,
                ...draft,
              });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            + Ajouter une question
          </button>
        )}
      </div>
    </section>
  );
}

function QuestionAnswerPreview({ q }: { q: Question }) {
  if (q.type === "text") {
    return (
      <div className="mt-1 text-sm text-emerald-400">
        Réponse : {q.answer || <span className="text-zinc-600">(vide)</span>}
      </div>
    );
  }
  return (
    <ul className="mt-1 space-y-0.5 text-sm">
      {q.choices?.map((c, i) => (
        <li
          key={i}
          className={c.correct ? "text-emerald-400" : "text-zinc-500"}
        >
          {c.correct ? "✓" : "•"} {c.text}
        </li>
      ))}
    </ul>
  );
}

export function TopBar({
  quizId,
  title,
  active,
}: {
  quizId: string;
  title: string;
  active: "edit" | "host";
}) {
  const tab = (
    label: string,
    to: "/quiz/$quizId/edit" | "/quiz/$quizId/host",
    key: "edit" | "host",
  ) => (
    <Link
      to={to}
      params={{ quizId }}
      className={`rounded-md px-3 py-1.5 ${
        active === key
          ? "bg-violet-600 text-white"
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm">
      <Link to="/" className="text-zinc-500 hover:text-zinc-300">
        ← Quiz
      </Link>
      <span className="text-zinc-700">/</span>
      <span className="mr-auto truncate text-zinc-400">{title}</span>
      {tab("Préparer", "/quiz/$quizId/edit", "edit")}
      {tab("Animer", "/quiz/$quizId/host", "host")}
      <Link
        to="/quiz/$quizId/display"
        params={{ quizId }}
        target="_blank"
        className="rounded-md bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
      >
        📺 Télé
      </Link>
    </nav>
  );
}

function CenteredMessage({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center text-zinc-500">
      {message}
    </div>
  );
}
