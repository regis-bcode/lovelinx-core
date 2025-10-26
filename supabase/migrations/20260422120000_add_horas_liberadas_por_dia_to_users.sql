alter table users
  add column if not exists horas_liberadas_por_dia numeric(5,2);

comment on column users.horas_liberadas_por_dia is 'Quantidade de horas liberadas por dia para atividades';
