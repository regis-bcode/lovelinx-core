import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TAPDocument, TAPDocumentFormData } from '@/types/tap';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UploadDocumentData extends Omit<TAPDocumentFormData, 'file_name' | 'user_id' | 'uploaded_by_name'> {
  file: File;
}

export function useTAPDocuments(tapId?: string) {
  const [documents, setDocuments] = useState<TAPDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!tapId || !user) return;
    loadDocuments();

    const channel = supabase
      .channel(`tap-documents-realtime-${tapId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tap_documents', filter: `tap_id=eq.${tapId}` }, (payload) => {
        const document = payload.new as TAPDocument;
        setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tap_documents', filter: `tap_id=eq.${tapId}` }, (payload) => {
        const document = payload.new as TAPDocument;
        setDocuments((prev) => prev.map((d) => (d.id === document.id ? document : d)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tap_documents', filter: `tap_id=eq.${tapId}` }, (payload) => {
        const documentId = payload.old.id;
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tapId, user]);

  const loadDocuments = async () => {
    if (!tapId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tap_documents')
        .select('*')
        .eq('tap_id', tapId)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Erro ao carregar documentos:', error);
        return;
      }

      setDocuments(data as TAPDocument[]);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (documentData: UploadDocumentData): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Criar um nome único para o arquivo
      const fileExtension = documentData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      const { data, error } = await supabase
        .from('tap_documents')
        .insert({
          tap_id: documentData.tap_id,
          project_id: documentData.project_id,
          file_name: fileName,
          original_name: documentData.original_name,
          file_size: documentData.file_size,
          mime_type: documentData.mime_type,
          document_name: documentData.document_name,
          user_id: user.id,
          uploaded_by_name: user.name || user.email || 'Usuário',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar documento:', error);
        toast({
          title: "Erro",
          description: "Erro ao anexar documento.",
          variant: "destructive",
        });
        return false;
      }

      await loadDocuments();
      return true;
    } catch (error) {
      console.error('Erro ao criar documento:', error);
      return false;
    }
  };

  const deleteDocument = async (documentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tap_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Erro ao excluir documento:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir documento.",
          variant: "destructive",
        });
        return false;
      }

      await loadDocuments();
      return true;
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      return false;
    }
  };

  return {
    documents,
    loading,
    uploadDocument,
    deleteDocument,
    refreshDocuments: loadDocuments,
  };
}