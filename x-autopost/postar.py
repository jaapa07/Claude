#!/usr/bin/env python3
"""Publica no X (Twitter) o proximo post da fila.

Le o primeiro bloco de `fila.md`, publica via API v2 do X usando OAuth 1.0a
(contexto de usuario), remove o bloco da fila e registra em `postados.md`.

Usa apenas a biblioteca padrao do Python. Credenciais vem de variaveis de
ambiente:

    X_API_KEY        (Consumer Key / API Key)
    X_API_SECRET     (Consumer Secret / API Key Secret)
    X_ACCESS_TOKEN   (Access Token do usuario)
    X_ACCESS_SECRET  (Access Token Secret do usuario)

Uso:
    python3 postar.py                    # publica o proximo post da fila
    python3 postar.py --arquivo post.txt # publica o texto do arquivo (ignora a fila)
    python3 postar.py --texto "..."      # publica o texto informado (ignora a fila)
    python3 postar.py --dry-run          # combina com qualquer modo: nao publica
    python3 postar.py --listar           # lista a fila com contagem de caracteres
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FILA = AQUI / "fila.md"
POSTADOS = AQUI / "postados.md"
ENDPOINT = "https://api.x.com/2/tweets"
LIMITE = 280
URL_RE = re.compile(r"https?://\S+")
ENV_VARS = ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET")


# ---------------------------------------------------------------- fila


def ler_fila(caminho: Path = FILA) -> list[str]:
    """Blocos separados por uma linha contendo apenas `---`.

    Linhas que comecam com `#` fora de um bloco sao comentarios e sao
    ignoradas. Blocos vazios tambem.
    """
    if not caminho.exists():
        return []
    texto = caminho.read_text(encoding="utf-8")
    blocos = re.split(r"^\s*---\s*$", texto, flags=re.MULTILINE)
    posts = []
    for bloco in blocos:
        linhas = [l for l in bloco.strip("\n").splitlines() if not l.startswith("#")]
        conteudo = "\n".join(linhas).strip()
        if conteudo:
            posts.append(conteudo)
    return posts


def gravar_fila(posts: list[str], caminho: Path = FILA) -> None:
    cabecalho = (
        "# Fila de posts para o X\n"
        "# Um post por bloco, blocos separados por uma linha com `---`.\n"
        "# O primeiro bloco e o proximo a ser publicado. Linhas com `#` sao ignoradas.\n"
    )
    corpo = "\n---\n".join(p + "\n" for p in posts)
    caminho.write_text(cabecalho + "\n" + corpo, encoding="utf-8")


def registrar_postado(texto: str, tweet_id: str, caminho: Path = POSTADOS) -> None:
    quando = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    entrada = f"\n## {quando} | id {tweet_id}\n\n{texto}\n"
    if not caminho.exists():
        caminho.write_text("# Posts publicados no X\n", encoding="utf-8")
    with caminho.open("a", encoding="utf-8") as f:
        f.write(entrada)


def ja_postado(texto: str, caminho: Path = POSTADOS) -> bool:
    """Evita duplicar se uma execucao anterior postou mas nao salvou a fila."""
    if not caminho.exists():
        return False
    return texto.strip() in caminho.read_text(encoding="utf-8")


def tamanho_x(texto: str) -> int:
    """Aproximacao da contagem do X: toda URL conta como 23 caracteres."""
    return len(URL_RE.sub("x" * 23, texto))


# ---------------------------------------------------------------- oauth


def _pct(s: str) -> str:
    return urllib.parse.quote(s, safe="~")


def cabecalho_oauth(metodo: str, url: str, creds: dict[str, str]) -> str:
    params = {
        "oauth_consumer_key": creds["X_API_KEY"],
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": creds["X_ACCESS_TOKEN"],
        "oauth_version": "1.0",
    }
    # Corpo JSON nao entra na assinatura; so os parametros oauth_*.
    base_params = "&".join(f"{_pct(k)}={_pct(v)}" for k, v in sorted(params.items()))
    base = "&".join([metodo.upper(), _pct(url), _pct(base_params)])
    chave = f"{_pct(creds['X_API_SECRET'])}&{_pct(creds['X_ACCESS_SECRET'])}"
    assinatura = base64.b64encode(
        hmac.new(chave.encode(), base.encode(), hashlib.sha1).digest()
    ).decode()
    params["oauth_signature"] = assinatura
    return "OAuth " + ", ".join(f'{_pct(k)}="{_pct(v)}"' for k, v in sorted(params.items()))


def publicar(texto: str, creds: dict[str, str]) -> str:
    corpo = json.dumps({"text": texto}).encode("utf-8")
    req = urllib.request.Request(ENDPOINT, data=corpo, method="POST")
    req.add_header("Authorization", cabecalho_oauth("POST", ENDPOINT, creds))
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "x-autopost/1.0")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            dados = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Erro HTTP {e.code} ao publicar: {detalhe}") from None
    return dados["data"]["id"]


# ---------------------------------------------------------------- main


def carregar_credenciais() -> dict[str, str]:
    faltando = [v for v in ENV_VARS if not os.environ.get(v)]
    if faltando:
        raise SystemExit(
            "Credenciais do X ausentes no ambiente: " + ", ".join(faltando)
            + "\nNada foi publicado."
        )
    return {v: os.environ[v] for v in ENV_VARS}


def publicar_direto(texto: str, dry_run: bool) -> int:
    """Publica um texto avulso (gerado pelo agente), sem tocar na fila."""
    if not texto:
        raise SystemExit("Texto vazio. Nada a publicar.")
    n = tamanho_x(texto)
    if n > LIMITE:
        raise SystemExit(f"O texto tem {n} caracteres (limite {LIMITE}). Encurte e tente de novo.")
    if ja_postado(texto):
        raise SystemExit("Este texto ja consta em postados.md. Nao vou republicar.")
    print(f"Texto ({n}/{LIMITE} caracteres):\n\n{texto}\n")
    if dry_run:
        print("[dry-run] Nada foi publicado.")
        return 0
    creds = carregar_credenciais()
    tweet_id = publicar(texto, creds)
    registrar_postado(texto, tweet_id)
    print(f"Publicado: https://x.com/i/web/status/{tweet_id}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="nao publica, so mostra")
    ap.add_argument("--listar", action="store_true", help="lista a fila e sai")
    ap.add_argument("--arquivo", type=Path, help="publica o conteudo deste arquivo, ignorando a fila")
    ap.add_argument("--texto", help="publica este texto, ignorando a fila")
    args = ap.parse_args()

    if args.arquivo and args.texto:
        ap.error("use --arquivo ou --texto, nao os dois")

    direto = None
    if args.arquivo:
        direto = args.arquivo.read_text(encoding="utf-8").strip()
    elif args.texto is not None:
        direto = args.texto.strip()
    if direto is not None:
        return publicar_direto(direto, args.dry_run)

    posts = ler_fila()

    if args.listar:
        if not posts:
            print("Fila vazia.")
            return 0
        for i, p in enumerate(posts, 1):
            n = tamanho_x(p)
            aviso = "  <-- ACIMA DO LIMITE" if n > LIMITE else ""
            print(f"[{i}] {n}/{LIMITE} caracteres{aviso}\n{p}\n")
        return 0

    if not posts:
        print("Fila vazia. Nada a publicar.")
        return 0

    texto = posts[0]
    n = tamanho_x(texto)
    if n > LIMITE:
        raise SystemExit(f"O proximo post tem {n} caracteres (limite {LIMITE}). Edite fila.md.")

    if ja_postado(texto):
        print("O proximo post ja consta em postados.md. Removendo da fila sem republicar.")
        gravar_fila(posts[1:])
        return 0

    print(f"Proximo post ({n}/{LIMITE} caracteres):\n\n{texto}\n")

    if args.dry_run:
        print("[dry-run] Nada foi publicado.")
        return 0

    creds = carregar_credenciais()
    tweet_id = publicar(texto, creds)
    registrar_postado(texto, tweet_id)
    gravar_fila(posts[1:])
    print(f"Publicado: https://x.com/i/web/status/{tweet_id}")
    print(f"Restam {len(posts) - 1} post(s) na fila.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
