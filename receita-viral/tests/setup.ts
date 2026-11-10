// Carrega variáveis e aponta para o banco de TESTE (nunca o de desenvolvimento).
import { readFileSync, existsSync } from "node:fs";

for (const file of [".env.test", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://receita:receita@localhost:5432/receita_viral_test?schema=public";
process.env.AUTH_SECRET ??= "segredo-de-teste-com-mais-de-32-caracteres!!";
delete process.env.ANTHROPIC_API_KEY;
