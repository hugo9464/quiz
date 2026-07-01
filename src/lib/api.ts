import { supabase } from "./supabase";
import type {
  Choice,
  ControlState,
  DisplayState,
  Phase,
  Question,
  QuestionType,
  Quiz,
  Round,
  Theme,
} from "./types";

// ---------- Mappers : lignes Postgres (snake_case) → docs domaine (camelCase) ----------

type QuizRow = { id: string; title: string; created_at: string };
type RoundRow = { id: string; quiz_id: string; title: string; order: number };
type QuestionRow = {
  id: string;
  quiz_id: string;
  round_id: string;
  order: number;
  type: QuestionType;
  text: string;
  answer: string | null;
  choices: Choice[] | null;
};
type ControlRow = {
  id: string;
  quiz_id: string;
  active_question_id: string | null;
  phase: Phase;
  timer_ends_at: number | string | null;
  theme: Theme;
  reviewing: boolean;
};

const mapQuiz = (r: QuizRow): Quiz => ({
  _id: r.id,
  title: r.title,
  createdAt: new Date(r.created_at).getTime(),
});

const mapRound = (r: RoundRow): Round => ({
  _id: r.id,
  quizId: r.quiz_id,
  title: r.title,
  order: r.order,
});

const mapQuestion = (r: QuestionRow): Question => ({
  _id: r.id,
  quizId: r.quiz_id,
  roundId: r.round_id,
  order: r.order,
  type: r.type,
  text: r.text,
  answer: r.answer ?? undefined,
  choices: r.choices ?? undefined,
});

const mapControl = (r: ControlRow): ControlState => ({
  _id: r.id,
  quizId: r.quiz_id,
  activeQuestionId: r.active_question_id,
  phase: r.phase,
  timerEndsAt: r.timer_ends_at === null ? null : Number(r.timer_ends_at),
  theme: r.theme ?? "dark",
  reviewing: r.reviewing ?? false,
});

// Lève l'erreur Supabase si présente (pour ne pas masquer les échecs).
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// ---------- Quizzes ----------

export async function listQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });
  check(error);
  return (data ?? []).map(mapQuiz);
}

export async function getQuiz({
  quizId,
}: {
  quizId: string;
}): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .maybeSingle();
  check(error);
  return data ? mapQuiz(data) : null;
}

export async function createQuiz({ title }: { title: string }): Promise<string> {
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ title: title.trim() || "Quiz sans titre" })
    .select("id")
    .single();
  check(error);
  const quizId = data!.id as string;
  // Crée l'état de contrôle initial pour ce quiz.
  const { error: controlError } = await supabase.from("control_state").insert({
    quiz_id: quizId,
    active_question_id: null,
    phase: "idle",
    timer_ends_at: null,
  });
  check(controlError);
  return quizId;
}

export async function renameQuiz({
  quizId,
  title,
}: {
  quizId: string;
  title: string;
}): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .update({ title: title.trim() || "Quiz sans titre" })
    .eq("id", quizId);
  check(error);
}

export async function deleteQuiz({
  quizId,
}: {
  quizId: string;
}): Promise<void> {
  // Les rounds/questions/control_state partent en cascade (FK ON DELETE CASCADE).
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  check(error);
}

// ---------- Rounds ----------

export async function listRounds({
  quizId,
}: {
  quizId: string;
}): Promise<Round[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  check(error);
  return (data ?? []).map(mapRound);
}

export async function createRound({
  quizId,
  title,
}: {
  quizId: string;
  title: string;
}): Promise<string> {
  const { data: existing, error: listError } = await supabase
    .from("rounds")
    .select("order")
    .eq("quiz_id", quizId);
  check(listError);
  const order = existing && existing.length
    ? Math.max(...existing.map((r) => r.order)) + 1
    : 0;
  const { data, error } = await supabase
    .from("rounds")
    .insert({ quiz_id: quizId, title: title.trim() || `Manche ${order + 1}`, order })
    .select("id")
    .single();
  check(error);
  return data!.id as string;
}

export async function renameRound({
  roundId,
  title,
}: {
  roundId: string;
  title: string;
}): Promise<void> {
  const { error } = await supabase
    .from("rounds")
    .update({ title: title.trim() || "Manche" })
    .eq("id", roundId);
  check(error);
}

export async function deleteRound({
  roundId,
}: {
  roundId: string;
}): Promise<void> {
  // Les questions de la manche partent en cascade (FK ON DELETE CASCADE).
  const { error } = await supabase.from("rounds").delete().eq("id", roundId);
  check(error);
}

// ---------- Questions ----------

export async function listByQuiz({
  quizId,
}: {
  quizId: string;
}): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  check(error);
  return (data ?? []).map(mapQuestion);
}

type QuestionInput = {
  type: QuestionType;
  text: string;
  answer?: string;
  choices?: Choice[];
};

// Ne garde que le champ pertinent selon le type (comme l'ancien updateQuestion Convex).
function questionFields(input: QuestionInput) {
  return {
    type: input.type,
    text: input.text,
    answer: input.type === "text" ? input.answer ?? null : null,
    choices: input.type === "mcq" ? input.choices ?? null : null,
  };
}

export async function createQuestion({
  quizId,
  roundId,
  ...input
}: QuestionInput & { quizId: string; roundId: string }): Promise<void> {
  const { data: existing, error: listError } = await supabase
    .from("questions")
    .select("order")
    .eq("round_id", roundId);
  check(listError);
  const order = existing && existing.length
    ? Math.max(...existing.map((x) => x.order)) + 1
    : 0;
  const { error } = await supabase.from("questions").insert({
    quiz_id: quizId,
    round_id: roundId,
    order,
    ...questionFields(input),
  });
  check(error);
}

export async function updateQuestion({
  questionId,
  ...input
}: QuestionInput & { questionId: string }): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .update(questionFields(input))
    .eq("id", questionId);
  check(error);
}

// Applique un nouveau placement des questions (manche + position). On ne met à
// jour que les questions dont la manche ou l'ordre a changé.
export async function updateQuestionPlacements({
  placements,
}: {
  placements: { id: string; roundId: string; order: number }[];
}): Promise<void> {
  await Promise.all(
    placements.map(async ({ id, roundId, order }) => {
      const { error } = await supabase
        .from("questions")
        .update({ round_id: roundId, order })
        .eq("id", id);
      check(error);
    }),
  );
}

export async function deleteQuestion({
  questionId,
}: {
  questionId: string;
}): Promise<void> {
  // Si la question supprimée est active, on remet l'état au repos.
  const { data: question, error: qError } = await supabase
    .from("questions")
    .select("quiz_id")
    .eq("id", questionId)
    .maybeSingle();
  check(qError);
  if (question) {
    const { data: control } = await supabase
      .from("control_state")
      .select("id, active_question_id")
      .eq("quiz_id", question.quiz_id)
      .maybeSingle();
    if (control && control.active_question_id === questionId) {
      await supabase
        .from("control_state")
        .update({ active_question_id: null, phase: "idle", timer_ends_at: null })
        .eq("id", control.id);
    }
  }
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  check(error);
}

// ---------- Control state (live) ----------

async function fetchControlRow(quizId: string): Promise<ControlRow | null> {
  const { data, error } = await supabase
    .from("control_state")
    .select("*")
    .eq("quiz_id", quizId)
    .maybeSingle();
  check(error);
  return data;
}

// Récupère (ou crée à la volée) le doc d'état de contrôle d'un quiz.
async function getOrCreateControl(quizId: string): Promise<ControlRow> {
  const existing = await fetchControlRow(quizId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("control_state")
    .insert({
      quiz_id: quizId,
      active_question_id: null,
      phase: "idle",
      timer_ends_at: null,
    })
    .select("*")
    .single();
  if (error) {
    // Conflit possible (contrainte unique sur quiz_id) : on retente une lecture.
    const again = await fetchControlRow(quizId);
    if (again) return again;
    throw new Error(error.message);
  }
  return data;
}

export async function getControlState({
  quizId,
}: {
  quizId: string;
}): Promise<ControlState | null> {
  const row = await fetchControlRow(quizId);
  return row ? mapControl(row) : null;
}

// Liste les questions d'un quiz dans l'ordre de jeu : manche puis question.
async function orderedQuestions(
  quizId: string,
): Promise<{ id: string; round_id: string; order: number }[]> {
  const [roundsRes, questionsRes] = await Promise.all([
    supabase.from("rounds").select("id, order").eq("quiz_id", quizId),
    supabase.from("questions").select("id, round_id, order").eq("quiz_id", quizId),
  ]);
  check(roundsRes.error);
  check(questionsRes.error);
  const roundOrder = new Map(
    (roundsRes.data ?? []).map((r) => [r.id, r.order] as const),
  );
  return (questionsRes.data ?? []).slice().sort((a, b) => {
    const ra = roundOrder.get(a.round_id) ?? 0;
    const rb = roundOrder.get(b.round_id) ?? 0;
    return ra - rb || a.order - b.order;
  });
}

async function patchControl(
  controlId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("control_state")
    .update(patch)
    .eq("id", controlId);
  check(error);
}

export async function setActiveQuestion({
  quizId,
  questionId,
}: {
  quizId: string;
  questionId: string;
}): Promise<void> {
  const control = await getOrCreateControl(quizId);
  await patchControl(control.id, {
    active_question_id: questionId,
    phase: "question",
    timer_ends_at: null,
  });
}

export async function revealAnswer({
  quizId,
}: {
  quizId: string;
}): Promise<void> {
  const control = await getOrCreateControl(quizId);
  await patchControl(control.id, { phase: "reveal", timer_ends_at: null });
}

// Repasse de la révélation à la question (cache la réponse).
export async function hideAnswer({
  quizId,
}: {
  quizId: string;
}): Promise<void> {
  const control = await getOrCreateControl(quizId);
  if (control.active_question_id) {
    await patchControl(control.id, { phase: "question" });
  }
}

// --- Navigation : calcul PUR (sans requête) du prochain état de contrôle ---
// La page Animer a déjà l'état + les manches + les questions en mémoire (live),
// donc elle calcule la cible côté client et n'envoie qu'une seule écriture.

export type NavControl = {
  activeQuestionId: string | null;
  phase: Phase;
  reviewing: boolean;
};
export type NavItem = { id: string; roundId: string };

// Chaque manche comporte deux passes :
//   1. passe "questions" : Q1..QN (les équipes répondent) → écran de fin de manche
//   2. passe "correction" (reviewing) : on redéroule Q1..QN de la MÊME manche pour
//      dévoiler les réponses (bouton Révéler), puis on enchaîne sur la manche suivante.
// Renvoie le patch snake_case à appliquer, ou null si aucun changement.
export function nextControlPatch(
  control: NavControl,
  ordered: NavItem[],
): Record<string, unknown> | null {
  if (ordered.length === 0) return null;

  // Depuis l'écran de fin de manche : passe de correction sur la 1re question de la manche terminée.
  if (control.phase === "round_end") {
    const lastIdx = ordered.findIndex((q) => q.id === control.activeQuestionId);
    if (lastIdx === -1) return null;
    const roundId = ordered[lastIdx].roundId;
    const first = ordered.find((q) => q.roundId === roundId);
    if (!first) return null;
    return {
      active_question_id: first.id,
      phase: "question",
      reviewing: true,
      timer_ends_at: null,
    };
  }

  const currentIndex = control.activeQuestionId
    ? ordered.findIndex((q) => q.id === control.activeQuestionId)
    : -1;

  // Pas encore démarré : première question (passe questions).
  if (currentIndex === -1) {
    return {
      active_question_id: ordered[0].id,
      phase: "question",
      reviewing: false,
      timer_ends_at: null,
    };
  }

  const nextIndex = currentIndex + 1;
  const endOfQuiz = nextIndex >= ordered.length;
  const changesRound =
    !endOfQuiz && ordered[nextIndex].roundId !== ordered[currentIndex].roundId;

  // Passe de correction en cours.
  if (control.reviewing) {
    if (endOfQuiz) return null; // fin du quiz : on reste sur la dernière réponse
    if (changesRound) {
      return {
        active_question_id: ordered[nextIndex].id,
        phase: "question",
        reviewing: false,
        timer_ends_at: null,
      };
    }
    return {
      active_question_id: ordered[nextIndex].id,
      phase: "question",
      timer_ends_at: null,
    };
  }

  // Passe questions : dernière question de la manche (ou du quiz) → écran de fin de manche.
  if (endOfQuiz || changesRound) {
    return { phase: "round_end", timer_ends_at: null };
  }
  return {
    active_question_id: ordered[nextIndex].id,
    phase: "question",
    timer_ends_at: null,
  };
}

export function prevControlPatch(
  control: NavControl,
  ordered: NavItem[],
): Record<string, unknown> | null {
  if (ordered.length === 0) return null;

  // Depuis l'écran de fin de manche : on revient à la dernière question affichée.
  if (control.phase === "round_end") {
    return { phase: "question", timer_ends_at: null };
  }

  const currentIndex = control.activeQuestionId
    ? ordered.findIndex((q) => q.id === control.activeQuestionId)
    : -1;

  if (currentIndex === -1) {
    return {
      active_question_id: ordered[ordered.length - 1].id,
      phase: "question",
      timer_ends_at: null,
    };
  }

  const prevIndex = currentIndex - 1;
  if (prevIndex < 0) return null; // déjà à la première question
  return {
    active_question_id: ordered[prevIndex].id,
    phase: "question",
    timer_ends_at: null,
  };
}

// Écrit directement une mise à jour de l'état de contrôle (1 seul aller-retour).
// À utiliser quand l'appelant connaît déjà l'id du control (page Animer).
export async function updateControl({
  controlId,
  patch,
}: {
  controlId: string;
  patch: Record<string, unknown>;
}): Promise<void> {
  await patchControl(controlId, patch);
}

// Variantes "serveur" (récupèrent l'état si l'appelant ne l'a pas). Conservées
// pour compat ; la page Animer utilise le chemin rapide client ci-dessus.
async function navQuestion(
  quizId: string,
  compute: typeof nextControlPatch,
): Promise<void> {
  const control = await getOrCreateControl(quizId);
  const ordered = (await orderedQuestions(quizId)).map((q) => ({
    id: q.id,
    roundId: q.round_id,
  }));
  const patch = compute(
    {
      activeQuestionId: control.active_question_id,
      phase: control.phase,
      reviewing: control.reviewing,
    },
    ordered,
  );
  if (patch) await patchControl(control.id, patch);
}

export async function nextQuestion({
  quizId,
}: {
  quizId: string;
}): Promise<void> {
  await navQuestion(quizId, nextControlPatch);
}

export async function prevQuestion({
  quizId,
}: {
  quizId: string;
}): Promise<void> {
  await navQuestion(quizId, prevControlPatch);
}

// Remet l'écran au repos (logo / attente).
export async function reset({
  quizId,
}: {
  quizId: string;
}): Promise<void> {
  const control = await getOrCreateControl(quizId);
  await patchControl(control.id, {
    active_question_id: null,
    phase: "idle",
    timer_ends_at: null,
    reviewing: false,
  });
}

// Bascule le thème de l'écran TV (dark/light), synchronisé en temps réel.
export async function setTheme({
  quizId,
  theme,
}: {
  quizId: string;
  theme: Theme;
}): Promise<void> {
  const control = await getOrCreateControl(quizId);
  await patchControl(control.id, { theme });
}

// Tout ce dont la TV a besoin en un seul appel (recomposé côté client).
export async function getDisplayState({
  quizId,
}: {
  quizId: string;
}): Promise<DisplayState> {
  const [quizRes, controlRow, roundsRes, questionsRes] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle(),
    fetchControlRow(quizId),
    supabase.from("rounds").select("*").eq("quiz_id", quizId),
    supabase.from("questions").select("*").eq("quiz_id", quizId),
  ]);
  check(quizRes.error);
  check(roundsRes.error);
  check(questionsRes.error);

  const rounds = (roundsRes.data ?? []).map(mapRound);
  const questions = (questionsRes.data ?? []).map(mapQuestion);
  const control = controlRow ? mapControl(controlRow) : null;

  const roundOrder = new Map(rounds.map((r) => [r._id, r.order] as const));
  const ordered = questions.slice().sort((a, b) => {
    const ra = roundOrder.get(a.roundId) ?? 0;
    const rb = roundOrder.get(b.roundId) ?? 0;
    return ra - rb || a.order - b.order;
  });

  let question: Question | null = null;
  let roundTitle = "";
  let questionNumber = 0;
  let isLastRound = false;

  const activeDoc = control?.activeQuestionId
    ? ordered.find((q) => q._id === control.activeQuestionId) ?? null
    : null;

  if (activeDoc) {
    roundTitle = rounds.find((r) => r._id === activeDoc.roundId)?.title ?? "";
    // La question n'est renvoyée qu'en phase active (pas en fin de manche).
    if (control?.phase !== "round_end") {
      question = activeDoc;
      questionNumber = ordered.findIndex((q) => q._id === activeDoc._id) + 1;
    }
    const lastRound = rounds
      .slice()
      .sort((a, b) => a.order - b.order)
      .at(-1);
    isLastRound = !!lastRound && lastRound._id === activeDoc.roundId;
  }

  return {
    quizTitle: quizRes.data?.title ?? "",
    phase: control?.phase ?? "idle",
    timerEndsAt: control?.timerEndsAt ?? null,
    question,
    roundTitle,
    questionNumber,
    totalQuestions: ordered.length,
    theme: control?.theme ?? "dark",
    isLastRound,
  };
}
