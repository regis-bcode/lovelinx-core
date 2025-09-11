import { useState, useEffect } from 'react';
import { Risk, RiskFormData } from '@/types/risk';

export function useRisks(projectId: string) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = `risks-${projectId}`;

  useEffect(() => {
    loadRisks();
  }, [projectId]);

  const loadRisks = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRisks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar riscos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRisks = (newRisks: Risk[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRisks));
      setRisks(newRisks);
    } catch (error) {
      console.error('Erro ao salvar riscos:', error);
    }
  };

  const createRisk = (data: RiskFormData): Risk => {
    const newRisk: Risk = {
      ...data,
      id: generateId(),
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updated = [...risks, newRisk];
    saveRisks(updated);
    return newRisk;
  };

  const updateRisk = (id: string, data: Partial<RiskFormData>): Risk | null => {
    const index = risks.findIndex(r => r.id === id);
    if (index === -1) return null;

    const updated = [...risks];
    updated[index] = {
      ...updated[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    saveRisks(updated);
    return updated[index];
  };

  const deleteRisk = (id: string): boolean => {
    const filtered = risks.filter(r => r.id !== id);
    saveRisks(filtered);
    return true;
  };

  return {
    risks,
    loading,
    createRisk,
    updateRisk,
    deleteRisk,
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}