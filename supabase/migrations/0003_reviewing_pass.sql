-- Passe de correction : après l'écran de fin de manche, on repasse les questions
-- de la même manche dans l'ordre pour dévoiler les réponses (bouton « Révéler »).
alter table control_state
  add column if not exists reviewing boolean not null default false;
