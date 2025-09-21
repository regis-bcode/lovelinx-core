import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useProducts } from '@/hooks/useProducts';
import { CreateServiceData } from '@/types/service';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceSelectWithCreateProps {
  value?: string;
  onChange: (serviceName?: string) => void;
  placeholder?: string;
  label?: string;
}

export function ServiceSelectWithCreate({ 
  value, 
  onChange, 
  placeholder = "Selecione um serviço",
  label = "Serviço"
}: ServiceSelectWithCreateProps) {
  const { services, createService, isCreating } = useServices();
  const { products } = useProducts();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateServiceData>({
    id_servico: '',
    descricao: '',
    id_produto: ''
  });

  const selectedService = services?.find(service => service.descricao === value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id_produto) {
      toast({
        title: "Erro",
        description: "Selecione um produto para o serviço.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const result = await createService(formData);
      onChange(result.descricao);
      setIsOpen(false);
      setFormData({
        id_servico: '',
        descricao: '',
        id_produto: ''
      });
      toast({
        title: "Sucesso!",
        description: `${label} criado com sucesso.`
      });
    } catch (error: any) {
      console.error('Erro ao criar serviço:', error);
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
            {selectedService ? selectedService.descricao : value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {services?.map((service) => (
            <SelectItem key={service.id} value={service.descricao}>
              {service.descricao}
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
              <Label htmlFor="id_servico">ID do Serviço *</Label>
              <Input
                id="id_servico"
                value={formData.id_servico}
                onChange={(e) => setFormData({ ...formData, id_servico: e.target.value })}
                placeholder="ex: servico_001"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="ex: Consultoria Especializada"
                required
              />
            </div>

            <div>
              <Label htmlFor="id_produto">Produto *</Label>
              <Select 
                value={formData.id_produto} 
                onValueChange={(value) => setFormData({ ...formData, id_produto: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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