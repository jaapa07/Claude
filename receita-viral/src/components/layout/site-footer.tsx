import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-border bg-cream/60 pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">Receitas populares, tendências das redes e pratos do mundo todo — para cozinhar todo dia com vontade.</p>
        </div>
        <FooterCol title="Descobrir" links={[["/explorar", "Categorias"], ["/virais", "Receitas virais"], ["/busca", "Busca por ingredientes"], ["/chef", "Chef IA"]]} />
        <FooterCol title="Organizar" links={[["/planejador", "Planejador de refeições"], ["/compras", "Listas de compras"], ["/conta/colecoes", "Coleções"], ["/conversor", "Conversor de medidas"]]} />
        <FooterCol title="Sobre" links={[["/sobre", "Sobre e fontes"], ["/conta/receitas/nova", "Publicar receita"], ["/cadastro", "Criar conta"]]} />
      </div>
      <p className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Receita Viral. Créditos e links originais são mantidos para receitas de fontes externas.
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="hover:text-primary">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
