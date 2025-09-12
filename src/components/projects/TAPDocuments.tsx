import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { TAPDocument } from '@/types/tap';
import { useTAPDocuments } from '@/hooks/useTAPDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TAPDocumentsProps {
  tapId?: string;
  projectId: string;
}

export function TAPDocuments({ tapId, projectId }: TAPDocumentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { documents, loading, uploadDocument, deleteDocument } = useTAPDocuments(tapId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim() || !tapId) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo e insira o nome do documento.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const success = await uploadDocument({
        tap_id: tapId,
        project_id: projectId,
        file: selectedFile,
        document_name: documentName.trim(),
        user_id: '', // será preenchido no hook
        uploaded_by_name: '', // será preenchido no hook
        file_name: '', // será preenchido no hook
        original_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type
      });

      if (success) {
        setDocumentName('');
        setSelectedFile(null);
        setIsOpen(false);
        toast({
          title: "Sucesso",
          description: "Documento anexado com sucesso!",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do documento.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      const success = await deleteDocument(documentId);
      if (success) {
        toast({
          title: "Sucesso",
          description: "Documento excluído com sucesso!",
        });
      }
    }
  };

  if (!tapId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anexos de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Salve a TAP primeiro para poder anexar documentos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Anexos de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Anexar Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Anexar Novo Documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="document-name">Nome do Documento</Label>
                  <Input
                    id="document-name"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Digite o nome do documento"
                  />
                </div>
                <div>
                  <Label htmlFor="file-upload">Selecionar Arquivo</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  />
                </div>
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Enviando...' : 'Anexar'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-2">
            <h4 className="font-medium">Documentos Anexados</h4>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : documents.length === 0 ? (
              <p className="text-muted-foreground">Nenhum documento anexado ainda.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: TAPDocument) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{doc.document_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.original_name} • {(doc.file_size ? doc.file_size / 1024 / 1024 : 0).toFixed(2)} MB
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Anexado por {doc.uploaded_by_name} em{' '}
                        {format(new Date(doc.upload_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}