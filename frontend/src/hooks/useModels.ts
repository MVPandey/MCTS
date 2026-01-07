import { useEffect } from 'react';
import { useUIStore } from '@/stores';
import type { ModelsResponse } from '@/types';

export function useModels() {
  const { setModels, setModelsLoading, setModelsError, availableModels, defaultModel, modelsLoading, modelsError } =
    useUIStore();

  useEffect(() => {
    const fetchModels = async () => {
      setModelsLoading(true);

      try {
        const response = await fetch('/api/models');
        const data: ModelsResponse = await response.json();

        if (data.error) {
          setModelsError(data.error);
        } else {
          setModels(data.models, data.default_model);
        }
      } catch (e) {
        console.error('Error fetching models:', e);
        setModelsError('Failed to load models. Check console for details.');
      }
    };

    fetchModels();
  }, [setModels, setModelsLoading, setModelsError]);

  return {
    models: availableModels,
    defaultModel,
    loading: modelsLoading,
    error: modelsError,
  };
}
