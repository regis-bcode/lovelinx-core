import { useState, useEffect } from 'react';
import { Stakeholder, StakeholderFormData } from '@/types/stakeholder';

export function useStakeholders(projectId: string) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = `stakeholders-${projectId}`;

  useEffect(() => {
    loadStakeholders();
  }, [projectId]);

  const loadStakeholders = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStakeholders(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar stakeholders:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStakeholders = (newStakeholders: Stakeholder[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStakeholders));
      setStakeholders(newStakeholders);
    } catch (error) {
      console.error('Erro ao salvar stakeholders:', error);
    }
  };

  const createStakeholder = (data: StakeholderFormData): Stakeholder => {
    const newStakeholder: Stakeholder = {
      ...data,
      id: generateId(),
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updated = [...stakeholders, newStakeholder];
    saveStakeholders(updated);
    return newStakeholder;
  };

  const updateStakeholder = (id: string, data: Partial<StakeholderFormData>): Stakeholder | null => {
    const index = stakeholders.findIndex(s => s.id === id);
    if (index === -1) return null;

    const updated = [...stakeholders];
    updated[index] = {
      ...updated[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    saveStakeholders(updated);
    return updated[index];
  };

  const deleteStakeholder = (id: string): boolean => {
    const filtered = stakeholders.filter(s => s.id !== id);
    saveStakeholders(filtered);
    return true;
  };

  return {
    stakeholders,
    loading,
    createStakeholder,
    updateStakeholder,
    deleteStakeholder,
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}