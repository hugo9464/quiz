-- Écran de fin de manche (phase "round_end") + thème d'affichage TV (dark/light).

-- Nouvelle phase autorisée pour l'état de contrôle.
alter table control_state drop constraint control_state_phase_check;
alter table control_state
  add constraint control_state_phase_check
  check (phase in ('idle', 'question', 'reveal', 'round_end'));

-- Thème piloté depuis la page Animer, appliqué sur l'écran TV en temps réel.
alter table control_state
  add column if not exists theme text not null default 'dark'
  check (theme in ('dark', 'light'));
