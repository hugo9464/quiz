import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "../lib/useLiveQuery";
import { createQuiz, deleteQuiz, listQuizzes } from "../lib/api";

export function HomePage() {
  const quizzes = useLiveQuery(() => listQuizzes(), [], ["quizzes"]);
  const [title, setTitle] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createQuiz({ title });
    setTitle("");
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Quiz du bar</h1>
        <p className="mt-2 text-zinc-400">
          Prépare tes manches et diffuse-les sur les télés en direct.
        </p>
      </header>

      <form onSubmit={handleCreate} className="mb-10 flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom du quiz (ex. Vendredi 4 juillet)"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
        >
          Créer
        </button>
      </form>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        Mes quiz
      </h2>

      {quizzes === undefined ? (
        <p className="text-zinc-500">Chargement…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-zinc-500">Aucun quiz pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {quizzes.map((quiz) => (
            <li
              key={quiz._id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
            >
              <span className="text-lg font-medium">{quiz.title}</span>
              <div className="flex items-center gap-2 text-sm">
                <Link
                  to="/quiz/$quizId/edit"
                  params={{ quizId: quiz._id }}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 transition hover:bg-zinc-700"
                >
                  Préparer
                </Link>
                <Link
                  to="/quiz/$quizId/host"
                  params={{ quizId: quiz._id }}
                  className="rounded-md bg-violet-600 px-3 py-1.5 font-medium transition hover:bg-violet-500"
                >
                  Animer
                </Link>
                <Link
                  to="/quiz/$quizId/display"
                  params={{ quizId: quiz._id }}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 transition hover:bg-zinc-700"
                >
                  Télé
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer « ${quiz.title} » ?`))
                      deleteQuiz({ quizId: quiz._id });
                  }}
                  className="rounded-md px-2 py-1.5 text-zinc-500 transition hover:text-red-400"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
