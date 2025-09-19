import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { CreateProductData } from '@/types/product';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductSelectWithCreateProps {
  value?: string;
  onChange: (productName?: string) => void;
  placeholder?: string;
  label?: string;
}

export function ProductSelectWithCreate({ 
  value, 
  onChange, 
  placeholder = "Selecione um produto",
  label = "Produto"
}: ProductSelectWithCreateProps) {
  const { products, createProduct, isCreating, ensureDefaultProducts } = useProducts();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateProductData>({
    id_produto: '',
    descricao: ''
  });

  // Garantir produtos padrão
  useEffect(() => {
    ensureDefaultProducts();
  }, [ensureDefaultProducts]);

  const selectedProduct = products?.find(product => product.descricao === value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createProduct(formData);
      onChange(result.descricao);
      setIsOpen(false);
      setFormData({
        id_produto: '',
        descricao: ''
      });
      toast({
        title: "Sucesso!",
        description: `${label} criado com sucesso.`
      });
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
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
            {selectedProduct ? selectedProduct.descricao : value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {products?.map((product) => (
            <SelectItem key={product.id} value={product.descricao}>
              {product.descricao}
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
              <Label htmlFor="id_produto">ID do Produto *</Label>
              <Input
                id="id_produto"
                value={formData.id_produto}
                onChange={(e) => setFormData({ ...formData, id_produto: e.target.value })}
                placeholder="ex: novo_produto"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="ex: Novo Produto"
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