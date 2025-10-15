import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Settings } from "lucide-react";
import { CustomField } from "@/types/task";

interface CustomFieldManagerProps {
  customFields: CustomField[];
  onFieldCreate: (field: Partial<CustomField>) => void;
  onFieldUpdate: (id: string, field: Partial<CustomField>) => void;
  onFieldDelete: (id: string) => void;
}

export function CustomFieldManager({ 
  customFields, 
  onFieldCreate, 
  onFieldUpdate, 
  onFieldDelete 
}: CustomFieldManagerProps) {
  const [showNewField, setShowNewField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    field_name: '',
    field_type: 'text_short',
    field_options: [],
    is_required: false
  });
  const [optionsText, setOptionsText] = useState('');

  const handleCreateField = () => {
    if (newField.field_name && newField.field_type) {
      const field = {
        ...newField,
        field_options: (newField.field_type === 'dropdown' || newField.field_type === 'tags') && optionsText
          ? optionsText.split(',').map(opt => opt.trim()).filter(opt => opt)
          : undefined
      };
      onFieldCreate(field);
      setNewField({
        field_name: '',
        field_type: 'text_short',
        field_options: [],
        is_required: false
      });
      setOptionsText('');
      setShowNewField(false);
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monetary: 'Monetário (R$)',
      percentage: 'Percentual (%)',
      numeric: 'Numérico',
      text: 'Texto curto',
      text_short: 'Texto curto',
      text_long: 'Texto longo',
      dropdown: 'Lista Suspensa',
      tags: 'Tags',
      checkbox: 'Caixa de Seleção',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campos Personalizados</h3>
        <Button 
          onClick={() => setShowNewField(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Campo
        </Button>
      </div>

      {showNewField && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Campo Personalizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field_name">Nome do Campo *</Label>
                <Input
                  id="field_name"
                  value={newField.field_name}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
                  placeholder="Ex: Orçamento Aprovado"
                />
              </div>
              <div>
                <Label htmlFor="field_type">Tipo do Campo *</Label>
                <Select
                  value={newField.field_type}
                  onValueChange={(value) => setNewField(prev => ({ ...prev, field_type: value as CustomField['field_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monetary">Monetário (R$)</SelectItem>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="numeric">Numérico</SelectItem>
                    <SelectItem value="text_short">Texto curto (até 200 caracteres)</SelectItem>
                    <SelectItem value="text_long">Texto longo (até 5000 caracteres)</SelectItem>
                    <SelectItem value="dropdown">Lista Suspensa</SelectItem>
                    <SelectItem value="tags">Tags</SelectItem>
                    <SelectItem value="checkbox">Caixa de Seleção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(newField.field_type === 'dropdown' || newField.field_type === 'tags') && (
              <div>
                <Label htmlFor="field_options">Opções (separadas por vírgula)</Label>
                <Textarea
                  id="field_options"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Ex: Opção 1, Opção 2, Opção 3"
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_required"
                checked={newField.is_required}
                onCheckedChange={(checked) => setNewField(prev => ({ ...prev, is_required: !!checked }))}
              />
              <Label htmlFor="is_required">Campo obrigatório</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateField}>Criar Campo</Button>
              <Button variant="outline" onClick={() => setShowNewField(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customFields.map((field) => (
          <Card key={field.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{field.field_name}</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {getFieldTypeLabel(field.field_type)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onFieldDelete(field.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {field.is_required && (
                <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
              )}
              {field.field_options && field.field_options.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Opções:</p>
                  <div className="flex flex-wrap gap-1">
                    {field.field_options.slice(0, 3).map((option, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {option}
                      </Badge>
                    ))}
                    {field.field_options.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{field.field_options.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {customFields.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum campo personalizado criado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}