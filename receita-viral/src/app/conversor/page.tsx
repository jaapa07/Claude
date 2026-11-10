import type { Metadata } from "next";
import { Converter } from "./converter";

export const metadata: Metadata = {
  title: "Conversor de medidas",
  description: "Converta xícaras, colheres, gramas, mililitros, onças e temperaturas do forno.",
};

export default function ConverterPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold">Conversor de medidas</h1>
        <p className="mt-2 text-muted-foreground">Xícara para gramas, colheres para ml, °C para °F — com densidades médias por ingrediente.</p>
      </header>
      <Converter />
    </div>
  );
}
