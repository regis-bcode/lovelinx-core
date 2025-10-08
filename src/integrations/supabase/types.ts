export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cod_int_cli: string
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          pais: string | null
          razao_social: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cod_int_cli: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pais?: string | null
          razao_social?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cod_int_cli?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pais?: string | null
          razao_social?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communication_plan: {
        Row: {
          aprovadores: string | null
          canal_envio: string | null
          codigo: string
          comunicacao: string | null
          conteudo: string | null
          created_at: string
          envolvidos: string | null
          formato_arquivo: string | null
          frequencia: string | null
          id: string
          idioma: string | null
          link_documento: string | null
          midia: string | null
          objetivo: string | null
          project_id: string
          project_id_new: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          aprovadores?: string | null
          canal_envio?: string | null
          codigo: string
          comunicacao?: string | null
          conteudo?: string | null
          created_at?: string
          envolvidos?: string | null
          formato_arquivo?: string | null
          frequencia?: string | null
          id?: string
          idioma?: string | null
          link_documento?: string | null
          midia?: string | null
          objetivo?: string | null
          project_id: string
          project_id_new?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          aprovadores?: string | null
          canal_envio?: string | null
          codigo?: string
          comunicacao?: string | null
          conteudo?: string | null
          created_at?: string
          envolvidos?: string | null
          formato_arquivo?: string | null
          frequencia?: string | null
          id?: string
          idioma?: string | null
          link_documento?: string | null
          midia?: string | null
          objetivo?: string | null
          project_id?: string
          project_id_new?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_plan_project_id_new_fkey"
            columns: ["project_id_new"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_options: string[] | null
          field_type: string
          id: string
          is_required: boolean
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          field_options?: string[] | null
          field_type: string
          id?: string
          is_required?: boolean
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          field_options?: string[] | null
          field_type?: string
          id?: string
          is_required?: boolean
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          cor: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          id_produto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
          id_produto: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          id_produto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          arquiteto: string
          cliente: string
          cod_cliente: string
          coordenador: string
          created_at: string
          criticidade: string
          criticidade_cliente: string | null
          data: string
          data_inicio: string | null
          diferenca_psa_projeto: number | null
          drive: string | null
          duracao_meses: number | null
          duracao_pos_producao: number | null
          encerramento: string | null
          escopo: string | null
          esn: string
          folder_id: string | null
          gerente_projeto: string | null
          go_live_previsto: string | null
          gpp: string
          id: string
          investimento_comercial: number | null
          investimento_erro_produto: number | null
          investimento_perdas: number | null
          margem_atual_percent: number | null
          margem_atual_reais: number | null
          margem_venda_percent: number | null
          margem_venda_reais: number | null
          mrr: number | null
          mrr_total: number | null
          nome_projeto: string
          objetivo: string | null
          observacao: string | null
          produto: string
          projeto_em_perda: boolean | null
          psa_planejado: number | null
          receita_atual: number | null
          status: string | null
          updated_at: string
          user_id: string
          valor_projeto: number | null
        }
        Insert: {
          arquiteto: string
          cliente: string
          cod_cliente: string
          coordenador: string
          created_at?: string
          criticidade: string
          criticidade_cliente?: string | null
          data: string
          data_inicio?: string | null
          diferenca_psa_projeto?: number | null
          drive?: string | null
          duracao_meses?: number | null
          duracao_pos_producao?: number | null
          encerramento?: string | null
          escopo?: string | null
          esn: string
          folder_id?: string | null
          gerente_projeto?: string | null
          go_live_previsto?: string | null
          gpp: string
          id?: string
          investimento_comercial?: number | null
          investimento_erro_produto?: number | null
          investimento_perdas?: number | null
          margem_atual_percent?: number | null
          margem_atual_reais?: number | null
          margem_venda_percent?: number | null
          margem_venda_reais?: number | null
          mrr?: number | null
          mrr_total?: number | null
          nome_projeto: string
          objetivo?: string | null
          observacao?: string | null
          produto: string
          projeto_em_perda?: boolean | null
          psa_planejado?: number | null
          receita_atual?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          valor_projeto?: number | null
        }
        Update: {
          arquiteto?: string
          cliente?: string
          cod_cliente?: string
          coordenador?: string
          created_at?: string
          criticidade?: string
          criticidade_cliente?: string | null
          data?: string
          data_inicio?: string | null
          diferenca_psa_projeto?: number | null
          drive?: string | null
          duracao_meses?: number | null
          duracao_pos_producao?: number | null
          encerramento?: string | null
          escopo?: string | null
          esn?: string
          folder_id?: string | null
          gerente_projeto?: string | null
          go_live_previsto?: string | null
          gpp?: string
          id?: string
          investimento_comercial?: number | null
          investimento_erro_produto?: number | null
          investimento_perdas?: number | null
          margem_atual_percent?: number | null
          margem_atual_reais?: number | null
          margem_venda_percent?: number | null
          margem_venda_reais?: number | null
          mrr?: number | null
          mrr_total?: number | null
          nome_projeto?: string
          objetivo?: string | null
          observacao?: string | null
          produto?: string
          projeto_em_perda?: boolean | null
          psa_planejado?: number | null
          receita_atual?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          valor_projeto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          id_produto: string
          id_servico: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
          id_produto: string
          id_servico: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          id_produto?: string
          id_servico?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_services_produto"
            columns: ["id_produto"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          cargo: string
          created_at: string
          departamento: string
          email: string
          id: string
          interesses: string | null
          nivel: string
          nome: string
          project_id: string
          project_id_new: string | null
          telefone: string | null
          tipo_influencia: string
          updated_at: string
        }
        Insert: {
          cargo: string
          created_at?: string
          departamento: string
          email: string
          id?: string
          interesses?: string | null
          nivel: string
          nome: string
          project_id: string
          project_id_new?: string | null
          telefone?: string | null
          tipo_influencia: string
          updated_at?: string
        }
        Update: {
          cargo?: string
          created_at?: string
          departamento?: string
          email?: string
          id?: string
          interesses?: string | null
          nivel?: string
          nome?: string
          project_id?: string
          project_id_new?: string | null
          telefone?: string | null
          tipo_influencia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_project_id_new_fkey"
            columns: ["project_id_new"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      status: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo_aplicacao: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo_aplicacao?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo_aplicacao?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tap: {
        Row: {
          arquiteto: string
          cod_cliente: string
          coordenador: string
          created_at: string
          criticidade_cliente: string
          criticidade_totvs: string
          data: string
          data_inicio: string | null
          diferenca_psa_projeto: number | null
          drive: string | null
          duracao_pos_producao: number | null
          encerramento: string | null
          escopo: string | null
          esn: string
          gerente_projeto: string
          go_live_previsto: string | null
          gpp: string
          id: string
          investimento_comercial: number | null
          investimento_erro_produto: number | null
          investimento_perdas: number | null
          margem_atual_percent: number | null
          margem_atual_valor: number | null
          margem_venda_percent: number | null
          margem_venda_valor: number | null
          mrr: number | null
          mrr_total: number | null
          nome_projeto: string
          objetivo: string | null
          observacoes: string | null
          produto: string
          project_id: string
          projeto_em_perda: boolean | null
          psa_planejado: number | null
          receita_atual: number | null
          servico: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor_projeto: number | null
        }
        Insert: {
          arquiteto: string
          cod_cliente: string
          coordenador: string
          created_at?: string
          criticidade_cliente: string
          criticidade_totvs: string
          data: string
          data_inicio?: string | null
          diferenca_psa_projeto?: number | null
          drive?: string | null
          duracao_pos_producao?: number | null
          encerramento?: string | null
          escopo?: string | null
          esn: string
          gerente_projeto: string
          go_live_previsto?: string | null
          gpp: string
          id?: string
          investimento_comercial?: number | null
          investimento_erro_produto?: number | null
          investimento_perdas?: number | null
          margem_atual_percent?: number | null
          margem_atual_valor?: number | null
          margem_venda_percent?: number | null
          margem_venda_valor?: number | null
          mrr?: number | null
          mrr_total?: number | null
          nome_projeto: string
          objetivo?: string | null
          observacoes?: string | null
          produto: string
          project_id: string
          projeto_em_perda?: boolean | null
          psa_planejado?: number | null
          receita_atual?: number | null
          servico?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
          valor_projeto?: number | null
        }
        Update: {
          arquiteto?: string
          cod_cliente?: string
          coordenador?: string
          created_at?: string
          criticidade_cliente?: string
          criticidade_totvs?: string
          data?: string
          data_inicio?: string | null
          diferenca_psa_projeto?: number | null
          drive?: string | null
          duracao_pos_producao?: number | null
          encerramento?: string | null
          escopo?: string | null
          esn?: string
          gerente_projeto?: string
          go_live_previsto?: string | null
          gpp?: string
          id?: string
          investimento_comercial?: number | null
          investimento_erro_produto?: number | null
          investimento_perdas?: number | null
          margem_atual_percent?: number | null
          margem_atual_valor?: number | null
          margem_venda_percent?: number | null
          margem_venda_valor?: number | null
          mrr?: number | null
          mrr_total?: number | null
          nome_projeto?: string
          objetivo?: string | null
          observacoes?: string | null
          produto?: string
          project_id?: string
          projeto_em_perda?: boolean | null
          psa_planejado?: number | null
          receita_atual?: number | null
          servico?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_projeto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tap_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tap_documents: {
        Row: {
          created_at: string
          document_name: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          original_name: string
          project_id: string
          tap_id: string
          updated_at: string
          upload_date: string
          uploaded_by_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_name: string
          project_id: string
          tap_id: string
          updated_at?: string
          upload_date?: string
          uploaded_by_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string
          project_id?: string
          tap_id?: string
          updated_at?: string
          upload_date?: string
          uploaded_by_name?: string
          user_id?: string
        }
        Relationships: []
      }
      tap_options: {
        Row: {
          created_at: string
          id: string
          option_type: string
          option_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_type: string
          option_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_type?: string
          option_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          acao_realizada: string | null
          area: string | null
          categoria: string | null
          cliente: string | null
          created_at: string
          criticidade: string | null
          custom_fields: Json | null
          data_entrega: string | null
          data_identificacao_ticket: string | null
          data_prevista_entrega: string | null
          data_prevista_validacao: string | null
          data_vencimento: string | null
          descricao_detalhada: string | null
          descricao_ticket: string | null
          dias_para_concluir: number | null
          escopo: string | null
          etapa_projeto: string | null
          gp_consultoria: string | null
          id: string
          link: string | null
          link_drive: string | null
          modulo: string | null
          nivel: number | null
          nome: string
          numero_ticket: string | null
          ordem: number | null
          parent_task_id: string | null
          percentual_conclusao: number | null
          prioridade: string
          project_id: string
          responsavel: string | null
          responsavel_cliente: string | null
          responsavel_consultoria: string | null
          responsavel_ticket: string | null
          retorno_acao: string | null
          status: string
          status_ticket: string | null
          task_id: string
          updated_at: string
          user_id: string
          validado_por: string | null
        }
        Insert: {
          acao_realizada?: string | null
          area?: string | null
          categoria?: string | null
          cliente?: string | null
          created_at?: string
          criticidade?: string | null
          custom_fields?: Json | null
          data_entrega?: string | null
          data_identificacao_ticket?: string | null
          data_prevista_entrega?: string | null
          data_prevista_validacao?: string | null
          data_vencimento?: string | null
          descricao_detalhada?: string | null
          descricao_ticket?: string | null
          dias_para_concluir?: number | null
          escopo?: string | null
          etapa_projeto?: string | null
          gp_consultoria?: string | null
          id?: string
          link?: string | null
          link_drive?: string | null
          modulo?: string | null
          nivel?: number | null
          nome: string
          numero_ticket?: string | null
          ordem?: number | null
          parent_task_id?: string | null
          percentual_conclusao?: number | null
          prioridade?: string
          project_id: string
          responsavel?: string | null
          responsavel_cliente?: string | null
          responsavel_consultoria?: string | null
          responsavel_ticket?: string | null
          retorno_acao?: string | null
          status?: string
          status_ticket?: string | null
          task_id: string
          updated_at?: string
          user_id: string
          validado_por?: string | null
        }
        Update: {
          acao_realizada?: string | null
          area?: string | null
          categoria?: string | null
          cliente?: string | null
          created_at?: string
          criticidade?: string | null
          custom_fields?: Json | null
          data_entrega?: string | null
          data_identificacao_ticket?: string | null
          data_prevista_entrega?: string | null
          data_prevista_validacao?: string | null
          data_vencimento?: string | null
          descricao_detalhada?: string | null
          descricao_ticket?: string | null
          dias_para_concluir?: number | null
          escopo?: string | null
          etapa_projeto?: string | null
          gp_consultoria?: string | null
          id?: string
          link?: string | null
          link_drive?: string | null
          modulo?: string | null
          nivel?: number | null
          nome?: string
          numero_ticket?: string | null
          ordem?: number | null
          parent_task_id?: string | null
          percentual_conclusao?: number | null
          prioridade?: string
          project_id?: string
          responsavel?: string | null
          responsavel_cliente?: string | null
          responsavel_consultoria?: string | null
          responsavel_ticket?: string | null
          retorno_acao?: string | null
          status?: string
          status_ticket?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_task"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          departamento: string | null
          email: string | null
          id: string
          nome: string
          project_id: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          departamento?: string | null
          email?: string | null
          id?: string
          nome: string
          project_id: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          departamento?: string | null
          email?: string | null
          id?: string
          nome?: string
          project_id?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_types: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          ativo: boolean
          client_id: string | null
          cpf: string
          created_at: string
          email: string
          id: string
          nome_completo: string
          observacoes: string | null
          telefone: string
          tipo_perfil: Database["public"]["Enums"]["profile_type"]
          tipo_usuario: Database["public"]["Enums"]["user_type"]
          updated_at: string
          user_id: string
          user_type_id: string | null
        }
        Insert: {
          ativo?: boolean
          client_id?: string | null
          cpf: string
          created_at?: string
          email: string
          id?: string
          nome_completo: string
          observacoes?: string | null
          telefone: string
          tipo_perfil: Database["public"]["Enums"]["profile_type"]
          tipo_usuario: Database["public"]["Enums"]["user_type"]
          updated_at?: string
          user_id: string
          user_type_id?: string | null
        }
        Update: {
          ativo?: boolean
          client_id?: string | null
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          observacoes?: string | null
          telefone?: string
          tipo_perfil?: Database["public"]["Enums"]["profile_type"]
          tipo_usuario?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
          user_id?: string
          user_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_user_type_id_fkey"
            columns: ["user_type_id"]
            isOneToOne: false
            referencedRelation: "user_types"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      profile_type: "visualizador" | "editor" | "administrador"
      user_type:
        | "cliente"
        | "analista"
        | "gerente_projetos"
        | "gerente_portfolio"
        | "coordenador_consultoria"
        | "gerente_cliente"
        | "arquiteto"
        | "sponsor"
        | "vendedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      profile_type: ["visualizador", "editor", "administrador"],
      user_type: [
        "cliente",
        "analista",
        "gerente_projetos",
        "gerente_portfolio",
        "coordenador_consultoria",
        "gerente_cliente",
        "arquiteto",
        "sponsor",
        "vendedor",
      ],
    },
  },
} as const
