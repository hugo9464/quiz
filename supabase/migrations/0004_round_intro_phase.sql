-- Écran d'intro de manche ("Round X") entre la correction d'une manche et la
-- première question de la suivante.
alter table control_state drop constraint control_state_phase_check;
alter table control_state
  add constraint control_state_phase_check
  check (phase in ('idle', 'question', 'reveal', 'round_end', 'round_intro'));
