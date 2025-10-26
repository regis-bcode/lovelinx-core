alter table users
  add column if not exists horas_diarias_aprovadas numeric(5,2);

comment on column users.horas_diarias_aprovadas is 'Quantidade de horas diárias aprovadas para o usuário';
