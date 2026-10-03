-- Compromissos que se repetem em dias específicos da semana (ex.: seg, qua, sex).
alter type event_recurrence add value if not exists 'dias_semana';

-- 0 = domingo … 6 = sábado. Usado quando recurrence = 'dias_semana'.
alter table personal_events
  add column if not exists weekdays smallint[] not null default '{}';
