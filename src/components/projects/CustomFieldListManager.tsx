import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, X, Check } from "lucide-react";
import { CustomField } from "@/types/task";

interface CustomFieldListManagerProps {
  customFields: CustomField[];
  onFieldCreate: (field: Partial<CustomField>) => void;
  onFieldUpdate: (id: string, field: Partial<CustomField>) => void;
  onFieldDelete: (id: string) => void;
}

export function CustomFieldListManager({ 
  customFields, 
  onFieldCreate, 
  onFieldUpdate, 
  onFieldDelete 
}: CustomFieldListManagerProps) {
  const [showNewField, setShowNewField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    field_name: '',
    field_type: 'text',
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
        field_type: 'text',
        field_options: [],
        is_required: false
      });
      setOptionsText('');
      setShowNewField(false);
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const labels = {
      'monetary': 'Monetário',
      'percentage': 'Percentual',
      'numeric': 'Numérico',
      'text': 'Texto',
      'dropdown': 'Lista Suspensa',
      'tags': 'Tags',
      'checkbox': 'Caixa de Seleção'
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
          Adicionar Campos
        </Button>
      </div>

      {/* Lista de campos em tabela */}
      {(customFields.length > 0 || showNewField) && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Campo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Opções</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.field_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getFieldTypeLabel(field.field_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {field.field_options && field.field_options.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {field.field_options.slice(0, 2).map((option, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {option}
                          </Badge>
                        ))}
                        {field.field_options.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{field.field_options.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {field.is_required ? (
                      <Badge variant="destructive" className="text-xs">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => onFieldDelete(field.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Linha para adicionar novo campo */}
              {showNewField && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <Input
                      value={newField.field_name}
                      onChange={(e) => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
                      placeholder="Nome do campo"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={newField.field_type} 
                      onValueChange={(value) => setNewField(prev => ({ ...prev, field_type: value as any }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monetary">Monetário</SelectItem>
                        <SelectItem value="percentage">Percentual</SelectItem>
                        <SelectItem value="numeric">Numérico</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="dropdown">Lista Suspensa</SelectItem>
                        <SelectItem value="tags">Tags</SelectItem>
                        <SelectItem value="checkbox">Caixa de Seleção</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {(newField.field_type === 'dropdown' || newField.field_type === 'tags') ? (
                      <Input
                        value={optionsText}
                        onChange={(e) => setOptionsText(e.target.value)}
                        placeholder="Op1, Op2, Op3"
                        className="h-8"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={newField.is_required}
                      onCheckedChange={(checked) => setNewField(prev => ({ ...prev, is_required: !!checked }))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                        onClick={handleCreateField}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowNewField(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {customFields.length === 0 && !showNewField && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum campo personalizado criado ainda.</p>
        </div>
      )}
    </div>
  );
}