"use client";
import * as React from "react";

export function ViewTracker({ recipeId }: { recipeId: string }) {
  React.useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/recipes/${recipeId}/view`, { method: "POST" }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [recipeId]);
  return null;
}
