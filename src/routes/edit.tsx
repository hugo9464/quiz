import { Fragment, useMemo, useState } from "react";
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
  updateQuestionPlacements,
} from "../lib/api";
import type { Question, Round, Theme } from "../lib/types";
import { QuestionForm, type QuestionDraft } from "../components/QuestionForm";

// Manche + ses questions ordonnées (structure pilotant le drag-and-drop).
type Group = { roundId: string; items: Question[] };
// Cible d'insertion : dans la manche `roundId`, avant la question `beforeId`
// (ou en fin de manche si `beforeId` est null).
type DropTarget = { roundId: string; beforeId: string | null };

function buildGroups(rounds: Round[], questions: Question[]): Group[] {
  const sorted = [...rounds].sort((a, b) => a.order - b.order);
  return sorted.map((r) => ({
    roundId: r._id,
    items: questions
      .filter((q) => q.roundId === r._id)
      .sort((a, b) => a.order - b.order),
  }));
}

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

  // --- Drag-and-drop au niveau page : déplacer une question DANS une manche ou
  // VERS une autre manche. On ne réordonne PAS le DOM pendant le drag (recréer le
  // nœud déplacé casserait le drag natif entre <ol>) : on montre une ligne
  // d'insertion et on applique le changement au drop. ---
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const groups = useMemo(
    () => buildGroups(rounds ?? [], questions ?? []),
    [rounds, questions],
  );

  const endDrag = () => {
    setDragId(null);
    setDropTarget(null);
  };

  const applyDrop = () => {
    if (!dragId || !dropTarget || dropTarget.beforeId === dragId) {
      endDrag();
      return;
    }
    const layout = buildGroups(rounds ?? [], questions ?? []);
    let moved: Question | undefined;
    for (const g of layout) {
      const idx = g.items.findIndex((q) => q._id === dragId);
      if (idx >= 0) {
        moved = g.items[idx];
        g.items.splice(idx, 1);
        break;
      }
    }
    const target = layout.find((g) => g.roundId === dropTarget.roundId);
    if (!moved || !target) {
      endDrag();
      return;
    }
    const at = dropTarget.beforeId
      ? target.items.findIndex((q) => q._id === dropTarget.beforeId)
      : target.items.length;
    target.items.splice(at === -1 ? target.items.length : at, 0, moved);

    // On ne persiste que les questions dont la manche ou la position a changé.
    const server = questions ?? [];
    const placements: { id: string; roundId: string; order: number }[] = [];
    layout.forEach((g) =>
      g.items.forEach((item, i) => {
        const s = server.find((x) => x._id === item._id);
        if (!s || s.roundId !== g.roundId || s.order !== i) {
          placements.push({ id: item._id, roundId: g.roundId, order: i });
        }
      }),
    );
    if (placements.length) updateQuestionPlacements({ placements });
    endDrag();
  };

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
          {groups.map((g) => {
            const round = rounds.find((r) => r._id === g.roundId);
            if (!round) return null;
            return (
              <RoundSection
                key={g.roundId}
                quizId={id}
                round={round}
                items={g.items}
                dragId={dragId}
                dropTarget={dropTarget}
                onItemDragStart={setDragId}
                onSetDrop={(roundId, beforeId) =>
                  setDropTarget({ roundId, beforeId })
                }
                onDrop={applyDrop}
                onDragEnd={endDrag}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoundSection({
  quizId,
  round,
  items,
  dragId,
  dropTarget,
  onItemDragStart,
  onSetDrop,
  onDrop,
  onDragEnd,
}: {
  quizId: string;
  round: Round;
  items: Question[];
  dragId: string | null;
  dropTarget: DropTarget | null;
  onItemDragStart: (id: string) => void;
  onSetDrop: (roundId: string, beforeId: string | null) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const dragging = !!dragId;
  // Ligne d'insertion : affichée juste avant la question `beforeId` (ou en fin de
  // manche si null) quand c'est la cible de dépose courante.
  const lineHere = (beforeId: string | null) =>
    dragging &&
    dropTarget?.roundId === round._id &&
    dropTarget.beforeId === beforeId;
  const Line = () => (
    <li className="h-1 rounded bg-violet-500" aria-hidden="true" />
  );

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

      {/* onDragOver du <ol> = survol de la zone (fin de liste / manche vide) →
          insertion en fin de manche. Les lignes stoppent la propagation pour
          viser une position précise (avant/après selon la moitié survolée). */}
      <ol
        className="space-y-2"
        onDragOver={(e) => {
          if (!dragging) return;
          e.preventDefault();
          onSetDrop(round._id, null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
      >
        {items.length === 0 && (
          <li
            className={`rounded-lg border border-dashed px-4 py-6 text-center text-sm ${
              lineHere(null)
                ? "border-violet-500 text-violet-400"
                : "border-zinc-700 text-zinc-600"
            }`}
          >
            Glisser une question ici
          </li>
        )}
        {items.map((q, i) =>
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
            <Fragment key={q._id}>
              {lineHere(q._id) && <Line />}
              <li
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", q._id);
                  onItemDragStart(q._id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (q._id === dragId) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const after = e.clientY > rect.top + rect.height / 2;
                  const beforeId = after ? items[i + 1]?._id ?? null : q._id;
                  if (beforeId === dragId) return;
                  onSetDrop(round._id, beforeId);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDrop();
                }}
                onDragEnd={onDragEnd}
                className={`flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3 transition ${
                  dragId === q._id ? "opacity-40" : ""
                }`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 cursor-grab select-none px-1 leading-none text-zinc-600 active:cursor-grabbing"
                    title="Glisser pour réordonner ou changer de manche"
                    aria-hidden="true"
                  >
                    ⋮⋮
                  </span>
                  <div className="min-w-0">
                    <span className="mr-2 text-sm text-zinc-500">{i + 1}.</span>
                    <span className="font-medium">{q.text}</span>
                    <QuestionAnswerPreview q={q} />
                  </div>
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
            </Fragment>
          ),
        )}
        {items.length > 0 && lineHere(null) && <Line />}
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
  theme = "dark",
}: {
  quizId: string;
  title: string;
  active: "edit" | "host";
  theme?: Theme;
}) {
  const dark = theme === "dark";
  const neutral = dark
    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300";
  const tab = (
    label: string,
    to: "/quiz/$quizId/edit" | "/quiz/$quizId/host",
    key: "edit" | "host",
  ) => (
    <Link
      to={to}
      params={{ quizId }}
      className={`rounded-md px-3 py-1.5 ${
        active === key ? "bg-violet-600 text-white" : neutral
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm">
      <Link
        to="/"
        className={dark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"}
      >
        ← Quiz
      </Link>
      <span className={dark ? "text-zinc-700" : "text-zinc-300"}>/</span>
      <span
        className={`mr-auto truncate ${dark ? "text-zinc-400" : "text-zinc-500"}`}
      >
        {title}
      </span>
      {tab("Préparer", "/quiz/$quizId/edit", "edit")}
      {tab("Animer", "/quiz/$quizId/host", "host")}
      <Link
        to="/quiz/$quizId/display"
        params={{ quizId }}
        target="_blank"
        className={`rounded-md px-3 py-1.5 ${neutral}`}
      >
        Télé
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
