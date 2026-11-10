import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { SAMPLE_RECIPES } from './seed';
import type { Recipe } from './types';

const RECIPES_KEY = 'receitas:v1:recipes';
const FAVORITES_KEY = 'receitas:v1:favorites';

interface RecipesState {
  ready: boolean;
  recipes: Recipe[];
  favorites: Set<string>;
  getRecipe: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Recipe;
  removeRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
}

const RecipesContext = createContext<RecipesState | null>(null);

function newId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [r, f] = await Promise.all([
          AsyncStorage.getItem(RECIPES_KEY),
          AsyncStorage.getItem(FAVORITES_KEY),
        ]);
        setRecipes(r ? (JSON.parse(r) as Recipe[]) : SAMPLE_RECIPES);
        setFavorites(new Set(f ? (JSON.parse(f) as string[]) : []));
      } catch {
        setRecipes(SAMPLE_RECIPES);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(recipes)).catch(() => {});
  }, [ready, recipes]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])).catch(() => {});
  }, [ready, favorites]);

  const getRecipe = useCallback((id: string) => recipes.find((r) => r.id === id), [recipes]);

  const addRecipe = useCallback((data: Omit<Recipe, 'id' | 'createdAt'>) => {
    const recipe: Recipe = { ...data, id: newId(), createdAt: Date.now() };
    setRecipes((prev) => [recipe, ...prev]);
    return recipe;
  }, []);

  const removeRecipe = useCallback((id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setFavorites((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ready, recipes, favorites, getRecipe, addRecipe, removeRecipe, toggleFavorite }),
    [ready, recipes, favorites, getRecipe, addRecipe, removeRecipe, toggleFavorite],
  );

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesState {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes precisa estar dentro de <RecipesProvider>');
  return ctx;
}
