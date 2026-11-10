import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sobre, fontes e direitos autorais" };

export default function AboutPage() {
  return (
    <div className="prose-like mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold">Sobre o Receita Viral</h1>
      <p className="text-lg text-muted-foreground">
        Reunimos receitas populares, tendências das redes sociais e pratos de diferentes culturas, com foco em clareza, praticidade e respeito a quem cria.
      </p>
      {[
        ["Receitas do acervo", "As receitas de demonstração foram escritas para o projeto, com quantidades, etapas, dicas e substituições. Imagens dos pratos aparecem como ilustrações até que fotos autorizadas sejam cadastradas pela equipe."],
        ["Receitas virais", "Indicamos a plataforma e o período em que uma receita virou tendência com base em informações públicas. Não exibimos números de visualizações de redes sociais. Links para criadores e vídeos incorporados só aparecem quando a equipe confere a origem (selo “Origem verificada”)."],
        ["Fontes externas", "Importamos apenas de fontes autorizadas cadastradas pela equipe, guardando a URL original e os créditos. Não reproduzimos o modo de preparo integral de conteúdo protegido: receitas importadas entram como rascunho e são reescritas antes da publicação."],
        ["Popularidade", "Rankings como “Em alta” e “Top 10” usam somente dados reais do próprio app: visualizações, favoritos e avaliações."],
        ["Informação nutricional", "Valores são estimativas aproximadas por porção e não substituem orientação de nutricionista."],
        ["Chef IA", "Quando um provedor de IA está configurado, as respostas são geradas por IA e podem conter imprecisões — confira alergênicos e pontos de cozimento. Sem provedor configurado, o Chef IA responde no modo local, usando apenas o catálogo do app."],
      ].map(([t, d]) => (
        <section key={t} className="rounded-3xl border border-border bg-card p-6">
          <h2 className="mb-2 text-xl font-bold">{t}</h2>
          <p className="text-muted-foreground">{d}</p>
        </section>
      ))}
    </div>
  );
}
