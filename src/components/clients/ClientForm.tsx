import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client, CreateClientData } from "@/types/client";

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientData) => void;
  client?: Client | null;
  isLoading?: boolean;
}

export function ClientForm({ isOpen, onClose, onSubmit, client, isLoading }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateClientData>({
    defaultValues: client ? {
      cod_int_cli: client.cod_int_cli,
      nome: client.nome,
      razao_social: client.razao_social || "",
      cnpj: client.cnpj || "",
      cpf: client.cpf || "",
      email: client.email || "",
      telefone: client.telefone || "",
      endereco: client.endereco || "",
      cidade: client.cidade || "",
      estado: client.estado || "",
      cep: client.cep || "",
      pais: client.pais || "Brasil",
      status: client.status,
      observacoes: client.observacoes || "",
    } : {
      pais: "Brasil",
      status: "Ativo",
    },
  });

  const status = watch("status");

  const handleFormSubmit = (data: CreateClientData) => {
    onSubmit(data);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cod_int_cli">Código Interno *</Label>
              <Input
                id="cod_int_cli"
                {...register("cod_int_cli", {
                  required: "Código interno é obrigatório",
                })}
              />
              {errors.cod_int_cli && (
                <span className="text-sm text-destructive">
                  {errors.cod_int_cli.message}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setValue("status", value as "Ativo" | "Inativo")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="nome">Nome/Razão Social *</Label>
            <Input
              id="nome"
              {...register("nome", {
                required: "Nome é obrigatório",
              })}
            />
            {errors.nome && (
              <span className="text-sm text-destructive">
                {errors.nome.message}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="razao_social">Razão Social Completa</Label>
            <Input
              id="razao_social"
              {...register("razao_social")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                {...register("cnpj")}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                {...register("cpf")}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register("telefone")}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              {...register("endereco")}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                {...register("cidade")}
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                {...register("estado")}
                placeholder="SP"
              />
            </div>

            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                {...register("cep")}
                placeholder="00000-000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pais">País</Label>
            <Input
              id="pais"
              {...register("pais")}
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register("observacoes")}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : client ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}