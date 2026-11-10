import { ImageResponse } from "next/og";
import { getRecipeBySlug } from "@/lib/recipes";
import { DIFFICULTY_LABEL, formatMinutes } from "@/lib/utils";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Receita Viral";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  const title = recipe?.title ?? "Receita Viral";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #fff3e2 0%, #ffd2b0 100%)", color: "#1f1a16" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
          Receita<span style={{ color: "#f2600c" }}>Viral</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>{title}</div>
          {recipe && (
            <div style={{ display: "flex", gap: 28, fontSize: 32, color: "#6f6259" }}>
              <span>{formatMinutes(recipe.prepMinutes + recipe.cookMinutes)}</span>
              <span>·</span>
              <span>{DIFFICULTY_LABEL[recipe.difficulty]}</span>
              <span>·</span>
              <span>{recipe.servings} porções</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", height: 14, width: 260, borderRadius: 999, background: "#f2600c" }} />
      </div>
    ),
    size,
  );
}
