import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { CreateUserData, UserType, ProfileType, userTypeLabels, profileTypeLabels } from '@/types/user';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserSelectWithCreateProps {
  value?: string;
  onChange: (userId?: string) => void;
  placeholder?: string;
  userType?: UserType;
  label?: string;
}

export function UserSelectWithCreate({ 
  value, 
  onChange, 
  placeholder = "Selecione um usuário",
  userType,
  label = "Usuário"
}: UserSelectWithCreateProps) {
  const { users, createUser, isCreating } = useUsers();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    cpf: '',
    nome_completo: '',
    email: '',
    telefone: '',
    tipo_usuario: userType || 'analista',
    tipo_perfil: 'editor'
  });

  // Filtrar usuários por tipo se especificado
  const filteredUsers = userType 
    ? users?.filter(user => user.tipo_usuario === userType) || []
    : users || [];

  const selectedUser = filteredUsers.find(user => user.id === value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createUser(formData, {
      onSuccess: (result) => {
        onChange(result.id);
        setIsOpen(false);
        setFormData({
          cpf: '',
          nome_completo: '',
          email: '',
          telefone: '',
          tipo_usuario: userType || 'analista',
          tipo_perfil: 'editor'
        });
        toast({
          title: "Sucesso!",
          description: `${label} criado com sucesso.`
        });
      },
      onError: (error: any) => {
        console.error('Erro ao criar usuário:', error);
        toast({
          title: "Erro",
          description: `Erro ao criar ${label.toLowerCase()}.`,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder}>
            {selectedUser ? selectedUser.nome_completo : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredUsers.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.nome_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo {label}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tipo_usuario">Tipo de Usuário *</Label>
              <Select 
                value={formData.tipo_usuario} 
                onValueChange={(value: UserType) => setFormData({ ...formData, tipo_usuario: value })}
                disabled={!!userType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(userTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tipo_perfil">Tipo de Perfil *</Label>
              <Select 
                value={formData.tipo_perfil} 
                onValueChange={(value: ProfileType) => setFormData({ ...formData, tipo_perfil: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(profileTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}