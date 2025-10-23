create or replace function public.approve_time_log(
  p_time_log_id uuid,
  p_status public.approval_status,
  p_commissioned boolean default false,
  p_performed_at timestamptz default null,
  p_approver_name text default null,
  p_rejection_reason text default null
)
returns public.time_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target public.time_logs%rowtype;
  v_performed_at timestamptz := coalesce(p_performed_at, now());
  v_commissioned boolean := coalesce(p_commissioned, false);
  v_status_label text;
  v_approved_flag text;
  v_trimmed_name text := nullif(trim(coalesce(p_approver_name, '')), '');
  v_trimmed_reason text := nullif(trim(coalesce(p_rejection_reason, '')), '');
  v_date_part text;
  v_time_part text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not (public.has_role(v_user_id, 'gestor') or public.has_role(v_user_id, 'admin')) then
    raise exception 'Usuário sem permissão para aprovar ou reprovar registros de tempo';
  end if;

  select *
    into v_target
    from public.time_logs
    where id = p_time_log_id
    for update;

  if not found then
    raise exception 'Registro de tempo não encontrado';
  end if;

  if p_status = 'pendente' then
    v_performed_at := null;
  end if;

  if p_status <> 'aprovado' then
    v_commissioned := false;
  end if;

  v_status_label := case p_status
    when 'aprovado' then 'Aprovado'
    when 'reprovado' then 'Reprovado'
    else 'Aguarda Aprovação'
  end;

  v_approved_flag := case p_status
    when 'aprovado' then 'SIM'
    when 'reprovado' then 'NÃO'
    else null
  end;

  if v_performed_at is not null then
    v_date_part := to_char(v_performed_at at time zone 'UTC', 'YYYY-MM-DD');
    v_time_part := to_char(v_performed_at at time zone 'UTC', 'HH24:MI:SS');
  else
    v_date_part := null;
    v_time_part := null;
  end if;

  update public.time_logs
     set status_aprovacao = p_status,
         approval_status = v_status_label,
         comissionado = v_commissioned,
         is_billable = v_commissioned,
         aprovado = v_approved_flag,
         aprovador_id = case when p_status = 'pendente' then null else v_user_id end,
         approved_by = case when p_status = 'pendente' then null else v_user_id end,
         aprovador_nome = case when p_status = 'pendente'
                               then null
                               else coalesce(v_trimmed_name, v_target.aprovador_nome)
                          end,
         data_aprovacao = v_performed_at,
         approved_at = v_performed_at,
         aprovacao_data = v_date_part,
         aprovacao_hora = v_time_part,
         justificativa_reprovacao = case when p_status = 'reprovado' then v_trimmed_reason else null end,
         observacoes = case when p_status = 'reprovado' then v_trimmed_reason else v_target.observacoes end,
         updated_at = now()
   where id = p_time_log_id
   returning * into v_target;

  return v_target;
end;
$$;

grant execute on function public.approve_time_log(uuid, public.approval_status, boolean, timestamptz, text, text) to authenticated;
