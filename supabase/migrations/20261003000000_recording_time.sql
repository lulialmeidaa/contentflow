-- Horário de gravação escolhido manualmente (arrastando no calendário).
-- Só vale junto com recording_date; null = o planejador escolhe o horário.
alter table contents add column if not exists recording_time time;
