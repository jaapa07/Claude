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
    python3 postar.py --arquivo fio.txt --fio  # publica os blocos (separados por ---) como um fio
    python3 postar.py --dry-run          # combina com qualquer modo: nao publica
    python3 postar.py --listar           # lista a fila com contagem de caracteres
    python3 postar.py --verificar        # confere formato das chaves e testa o login no X
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
ENDPOINT_ME = "https://api.x.com/2/users/me"
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


def publicar(texto: str, creds: dict[str, str], responder_a: str | None = None) -> str:
    payload: dict = {"text": texto}
    if responder_a:
        payload["reply"] = {"in_reply_to_tweet_id": responder_a}
    corpo = json.dumps(payload).encode("utf-8")
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


def _limpar(valor: str) -> str:
    """Remove espacos nas pontas e aspas envolventes, erros comuns de colagem."""
    v = valor.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1].strip()
    return v


def carregar_credenciais() -> dict[str, str]:
    faltando = [v for v in ENV_VARS if not _limpar(os.environ.get(v, ""))]
    if faltando:
        raise SystemExit(
            "Credenciais do X ausentes no ambiente: " + ", ".join(faltando)
            + "\nNada foi publicado."
        )
    return {v: _limpar(os.environ[v]) for v in ENV_VARS}


# Formato esperado de cada chave (tamanho tipico no Developer Portal).
FORMATOS = {
    "X_API_KEY": (20, 30, "API Key, ~25 caracteres"),
    "X_API_SECRET": (45, 55, "API Key Secret, ~50 caracteres"),
    "X_ACCESS_TOKEN": (40, 60, "Access Token, numeros + '-' + letras, ~50 caracteres"),
    "X_ACCESS_SECRET": (40, 50, "Access Token Secret, ~45 caracteres"),
}


def verificar() -> int:
    """Diagnostica as credenciais sem imprimir os valores."""
    problemas = 0
    print("Formato das variaveis de ambiente:")
    for nome, (minimo, maximo, descricao) in FORMATOS.items():
        bruto = os.environ.get(nome)
        if bruto is None or not bruto.strip():
            print(f"  {nome}: AUSENTE ({descricao})")
            problemas += 1
            continue
        valor = _limpar(bruto)
        avisos = []
        nota = " (tinha espaco ou aspas nas pontas, removidos automaticamente)" if bruto != valor else ""
        if re.search(r"\s", valor):
            avisos.append("CONTEM ESPACO NO MEIO: valor colado errado")
        if not (minimo <= len(valor) <= maximo):
            avisos.append(f"tamanho {len(valor)} fora do esperado ({minimo}-{maximo})")
        if nome == "X_ACCESS_TOKEN" and not re.match(r"^\d+-[A-Za-z0-9]+$", valor):
            avisos.append("nao tem o formato numeros-letras do Access Token")
        if nome != "X_ACCESS_TOKEN" and not re.match(r"^[A-Za-z0-9]+$", valor):
            avisos.append("tem caracteres fora de letras e numeros")
        if avisos:
            problemas += 1
            print(f"  {nome}: PROBLEMA, {'; '.join(avisos)} ({descricao}){nota}")
        else:
            print(f"  {nome}: ok, {len(valor)} caracteres{nota}")
    if problemas:
        print(f"\n{problemas} variavel(is) com problema. Corrija no ambiente antes de testar o login.")
        return 1

    creds = carregar_credenciais()
    req = urllib.request.Request(ENDPOINT_ME, method="GET")
    req.add_header("Authorization", cabecalho_oauth("GET", ENDPOINT_ME, creds))
    req.add_header("User-Agent", "x-autopost/1.0")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            dados = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode("utf-8", errors="replace")
        print(f"\nLogin no X FALHOU: HTTP {e.code}\n{detalhe}")
        if e.code == 401:
            print(
                "\n401 = o X nao aceitou a combinacao de chaves. Causas comuns:\n"
                "  - algum valor foi colado errado ou trocado de campo;\n"
                "  - as chaves foram regeneradas no portal depois de salvas aqui;\n"
                "  - o Access Token e de outro App, nao do mesmo das Consumer Keys.\n"
                "Regenere os dois pares no portal e cole de novo, cada um no seu campo."
            )
        elif e.code == 403:
            print("\n403 = chaves validas, mas o App nao tem permissao ou nao esta em um Project.")
        return 1
    usuario = dados.get("data", {})
    print(f"\nLogin no X OK: @{usuario.get('username')} (id {usuario.get('id')})")
    return 0


def dividir_fio(texto: str) -> list[str]:
    partes = re.split(r"^\s*---\s*$", texto, flags=re.MULTILINE)
    return [p.strip() for p in partes if p.strip()]


def publicar_direto(texto: str, dry_run: bool, fio: bool = False) -> int:
    """Publica um texto avulso (gerado pelo agente), sem tocar na fila.

    Com `fio=True`, o texto e dividido em blocos separados por `---` e cada
    bloco vira uma resposta ao anterior, formando um fio.
    """
    if not texto:
        raise SystemExit("Texto vazio. Nada a publicar.")
    partes = dividir_fio(texto) if fio else [texto]
    if fio and len(partes) < 2:
        raise SystemExit("Um fio precisa de pelo menos 2 blocos separados por `---`.")
    for i, parte in enumerate(partes, 1):
        n = tamanho_x(parte)
        if n > LIMITE:
            raise SystemExit(f"O bloco {i} tem {n} caracteres (limite {LIMITE}). Encurte e tente de novo.")
    if ja_postado(partes[0]):
        raise SystemExit("Este texto ja consta em postados.md. Nao vou republicar.")
    for i, parte in enumerate(partes, 1):
        rotulo = f"Bloco {i}/{len(partes)}" if fio else "Texto"
        print(f"{rotulo} ({tamanho_x(parte)}/{LIMITE} caracteres):\n\n{parte}\n")
    if dry_run:
        print("[dry-run] Nada foi publicado.")
        return 0
    creds = carregar_credenciais()
    anterior = None
    primeiro = None
    for i, parte in enumerate(partes, 1):
        try:
            tweet_id = publicar(parte, creds, responder_a=anterior)
        except SystemExit as e:
            if primeiro:
                registrar_postado("\n---\n".join(partes[: i - 1]), primeiro)
                raise SystemExit(
                    f"{e}\nO fio foi publicado ate o bloco {i - 1} de {len(partes)} "
                    f"(https://x.com/i/web/status/{primeiro}). Os blocos restantes NAO sairam."
                ) from None
            raise
        anterior = tweet_id
        primeiro = primeiro or tweet_id
    registrar_postado("\n---\n".join(partes), primeiro)
    print(f"Publicado: https://x.com/i/web/status/{primeiro}")
    if fio:
        print(f"Fio com {len(partes)} posts.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="nao publica, so mostra")
    ap.add_argument("--listar", action="store_true", help="lista a fila e sai")
    ap.add_argument("--verificar", action="store_true", help="confere as chaves e testa o login no X, sem publicar")
    ap.add_argument("--arquivo", type=Path, help="publica o conteudo deste arquivo, ignorando a fila")
    ap.add_argument("--texto", help="publica este texto, ignorando a fila")
    ap.add_argument("--fio", action="store_true", help="com --arquivo ou --texto: publica os blocos separados por --- como um fio")
    args = ap.parse_args()

    if args.verificar:
        return verificar()

    if args.arquivo and args.texto:
        ap.error("use --arquivo ou --texto, nao os dois")

    direto = None
    if args.arquivo:
        direto = args.arquivo.read_text(encoding="utf-8").strip()
    elif args.texto is not None:
        direto = args.texto.strip()
    if direto is not None:
        return publicar_direto(direto, args.dry_run, fio=args.fio)
    if args.fio:
        ap.error("--fio exige --arquivo ou --texto")

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
