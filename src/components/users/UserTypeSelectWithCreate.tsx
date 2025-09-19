import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserTypes } from '@/hooks/useUserTypes';
import { CreateUserTypeData } from '@/types/user-type';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserTypeSelectWithCreateProps {
  value?: string;
  onChange: (userTypeId?: string) => void;
  placeholder?: string;
  label?: string;
}

export function UserTypeSelectWithCreate({ 
  value, 
  onChange, 
  placeholder = "Selecione um tipo de usuário",
  label = "Tipo de Usuário"
}: UserTypeSelectWithCreateProps) {
  const { userTypes, createUserType, isCreating } = useUserTypes();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserTypeData>({
    codigo: '',
    descricao: ''
  });

  const selectedUserType = userTypes?.find(type => type.id === value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createUserType(formData);
      onChange(result.id);
      setIsOpen(false);
      setFormData({
        codigo: '',
        descricao: ''
      });
      toast({
        title: "Sucesso!",
        description: `${label} criado com sucesso.`
      });
    } catch (error: any) {
      console.error('Erro ao criar tipo de usuário:', error);
      toast({
        title: "Erro",
        description: `Erro ao criar ${label.toLowerCase()}.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder}>
            {selectedUserType ? selectedUserType.descricao : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {userTypes?.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.descricao}
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
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="ex: analista_senior"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="ex: Analista Sênior"
                required
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