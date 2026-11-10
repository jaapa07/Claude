import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../_components/page-header";
import { ImportPanel, SourceManager } from "../_components/source-manager";
import { withKeyStatus } from "../_lib/viral-source";

export const metadata = { title: "Fontes e integrações" };

export default async function AdminSourcesPage() {
  const rows = await prisma.externalSource.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { recipes: true } } },
  });
  const sources = rows.map(({ _count, ...s }) => ({ ...withKeyStatus(s), recipeCount: _count.recipes }));

  return (
    <div>
      <PageHeader title="Fontes e integrações" description="Cadastre fontes parceiras e APIs autorizadas e importe receitas com crédito." />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-accent" /> Política de importação</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Somente fontes autorizadas:</strong> importe apenas de sites ou APIs cujos termos ou contrato permitam o reuso.</li>
              <li><strong className="text-foreground">Fatos + link + crédito:</strong> trazemos título, tempos, porções e ingredientes, sempre com o link original e o nome do autor/fonte.</li>
              <li><strong className="text-foreground">Preparo reescrito:</strong> o modo de preparo original não é copiado; reescreva as etapas com suas palavras.</li>
              <li><strong className="text-foreground">Rascunho até revisão:</strong> toda importação entra como rascunho e só é publicada após revisão editorial.</li>
              <li><strong className="text-foreground">Chaves de API:</strong> ficam apenas nas variáveis de ambiente do servidor; o painel nunca exibe o valor.</li>
            </ul>
          </CardContent>
        </Card>
        <ImportPanel sources={sources} />
      </div>
      <SourceManager sources={sources} />
    </div>
  );
}
