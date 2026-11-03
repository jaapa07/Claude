"""Gera um XML grande de embarques com defeitos estruturais, para testar o RepairXmlJson.

Saídas:
  lote_embarques_quebrado.xml   o XML com defeitos (bytes, inclusive alguns em Latin-1)
  defeitos_inseridos.csv        linha, embarque e tipo de cada defeito inserido
"""
import csv
import random
import sys

QTD_EMBARQUES = int(sys.argv[1]) if len(sys.argv) > 1 else 800
SAIDA = sys.argv[2] if len(sys.argv) > 2 else "."
rnd = random.Random(20261103)  # semente fixa: o arquivo sai sempre igual

EMPRESAS = ["Silva & Filhos Ltda", "Transportes Andrade & Cia", "Comércio Bom Preço", "Indústria São Jorge",
            "Distribuidora Ação Total", "Atacado Irmãos Gonçalves", "Logística Pé na Estrada", "Mercantil Três Corações"]
CIDADES = [("São Paulo", "SP", "01310100"), ("Curitiba", "PR", "80010000"), ("Florianópolis", "SC", "88010000"),
           ("Belo Horizonte", "MG", "30110000"), ("Goiânia", "GO", "74003010"), ("Porto Alegre", "RS", "90010000"),
           ("Recife", "PE", "50010000"), ("Ribeirão Preto", "SP", "14010000")]
PRODUTOS = [("Tubo 3\" aço inox", "7306"), ("Conexão \"T\" PVC", "3917"), ("Caixa organizadora 40L", "3923"),
            ("Parafuso 1/4 x 2\"", "7318"), ("Cimento CP-II 50kg", "2523"), ("Tinta acrílica 18L", "3209")]
RUAS = ["Rua das Flores", "Av. Brasil", "Rua XV de Novembro", "Av. Getúlio Vargas", "Rua da Conceição"]

linhas = []          # lista de (texto, bytes_extra) — bytes_extra para trechos em Latin-1
defeitos = []        # (linha, embarque, tipo, descricao)


def add(texto, embarque=None, defeito=None, descricao=""):
    linhas.append(texto)
    if defeito:
        defeitos.append((len(linhas), embarque, defeito, descricao))


def cnpj():
    n = "".join(str(rnd.randint(0, 9)) for _ in range(12))
    return f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{rnd.randint(10, 99)}"


def chance(p):
    return rnd.random() < p


# ---------------------------------------------------------------- início do arquivo
linhas.append("﻿")  # BOM
linhas.append("")
defeitos.append((1, "-", "bom-e-linhas-antes-da-declaracao", "BOM e linha em branco antes do <?xml"))
add('<?xml version="1.0" encoding="UTF-8"?>')
add('<LoteEmbarques xmlns="http://lincros.com.br/embarques" versao="2.0" gerado="2026-11-03T08:00:00-03:00">')
add('  <!-- lote gerado automaticamente -- revisar antes de enviar -->', "-", "comentario-com-hifen-duplo",
    "Comentário com '--' no meio")

for i in range(1, QTD_EMBARQUES + 1):
    emb = f"EMB{i:06d}"
    cid_o, uf_o, cep_o = rnd.choice(CIDADES)
    cid_d, uf_d, cep_d = rnd.choice(CIDADES)
    rem = rnd.choice(EMPRESAS)
    dest = rnd.choice(EMPRESAS)

    # ----- abertura do embarque
    if chance(0.04):
        add(f'  <Embarque id=""{emb}"" tipoFrete="CIF">', emb, "aspas-extras-no-atributo", 'id=""...""')
    elif chance(0.04):
        add(f'  <Embarque id="{emb}" tipoFrete=“FOB”>', emb, "aspas-tipograficas-no-atributo", "tipoFrete=“FOB”")
    elif chance(0.03):
        add(f'  <Embarque id="{emb}" tipoFrete="CIF" tipoFrete="FOB">', emb, "atributo-duplicado", "tipoFrete repetido")
    else:
        add(f'  <Embarque id="{emb}" tipoFrete="{rnd.choice(["CIF", "FOB"])}">')

    add(f'    <DataColeta>2026-{rnd.randint(1, 10):02d}-{rnd.randint(1, 28):02d}</DataColeta>')

    # ----- remetente
    add('    <Remetente>')
    if "&" in rem and chance(0.5):
        add(f'      <RazaoSocial>{rem}</RazaoSocial>', emb, "e-comercial-solto", "& sem escape no texto")
    else:
        add(f'      <RazaoSocial>{rem.replace("&", "&amp;")}</RazaoSocial>')
    add(f'      <Cnpj>{cnpj()}</Cnpj>')
    if chance(0.05):
        add(f'      < Cidade >{cid_o}</ Cidade >', emb, "espaco-dentro-da-tag", "< Cidade > ... </ Cidade >")
    elif chance(0.04):
        add(f'      <Cidade>{cid_o}</cidade>', emb, "maiuscula-minuscula-diferente", "<Cidade> fechada com </cidade>")
    else:
        add(f'      <Cidade>{cid_o}</Cidade>')
    add(f'      <UF>{uf_o}</UF>')
    add('    </Remetente>')

    # ----- destinatário
    add('    <Destinatario>')
    if chance(0.04):
        add(f'      <RazaoSocial>{dest.replace("&", "&amp;")} &ndash; Filial &ordm;2</RazaoSocial>', emb,
            "entidade-html", "&ndash; e &ordm; (entidades HTML, não existem em XML)")
    elif chance(0.03):
        add(f'      <RazaoSocial>Constru\x00LATIN1\x00</RazaoSocial>', emb, "byte-latin1-no-meio-do-utf8",
            "texto gravado em Latin-1 dentro de arquivo UTF-8")
    else:
        add(f'      <RazaoSocial>{dest.replace("&", "&amp;")}</RazaoSocial>')
    add(f'      <Cnpj>{cnpj()}</Cnpj>')
    add('      <Endereco>')
    rua = rnd.choice(RUAS)
    if chance(0.04):
        add(f'        <Logradouro>{rua}, {rnd.randint(1, 3000)}&nbsp;&ndash;&nbsp;Galp&atilde;o {rnd.randint(1, 9)}</Logradouro>',
            emb, "entidade-html", "&nbsp; &ndash; &atilde;")
    elif chance(0.03):
        add(f'        <Logradouro>{rua}, {rnd.randint(1, 3000)}​</Logradouro>', emb,
            "espaco-invisivel", "NBSP e zero-width space")
    else:
        add(f'        <Logradouro>{rua}, {rnd.randint(1, 3000)}</Logradouro>')
    add(f'        <Cidade>{cid_d}</Cidade>')
    add(f'        <UF>{uf_d}</UF>')
    if chance(0.03):
        add(f'        <Cep>{cep_d}</Cep', emb, "fechamento-sem-maior-que", "</Cep sem o '>'")
        add('      </Endereco>')
    else:
        add(f'        <Cep>{cep_d}</Cep>')
        add('      </Endereco>')
    add('    </Destinatario>')

    # ----- transportadora (às vezes com prefixo sem namespace)
    if chance(0.03):
        add(f'    <ext:Rastreio codigo="BR{i:09d}" />', emb, "prefixo-sem-namespace", "ext: sem xmlns:ext declarado")

    # ----- notas e volumes
    add('    <Notas>')
    for n in range(rnd.randint(1, 3)):
        numero = rnd.randint(1000, 999999)
        if chance(0.03):
            add(f'      <Nota numero={numero} serie=1 fragil>', emb, "atributo-sem-aspas-e-sem-valor",
                "numero=... serie=... sem aspas e 'fragil' sem valor")
        else:
            add(f'      <Nota numero="{numero}" serie="1">')
        add(f'        <Chave>35261{rnd.randint(10**38, 10**39 - 1)}</Chave>')
        add(f'        <Valor>{rnd.randint(100, 50000)}.{rnd.randint(0, 99):02d}</Valor>')
        add('        <Volumes>')
        for v in range(rnd.randint(1, 4)):
            prod, ncm = rnd.choice(PRODUTOS)
            peso = f"{rnd.randint(1, 900)}.{rnd.randint(0, 999):03d}"
            if '"' in prod and chance(0.15):
                add(f'          <Volume seq="{v + 1}" descricao="{prod}" ncm="{ncm}" peso="{peso}"/>', emb,
                    "aspas-internas-no-atributo", "aspas sem escape dentro do valor do atributo")
            else:
                add(f'          <Volume seq="{v + 1}" descricao="{prod.replace(chr(34), "&quot;")}" ncm="{ncm}" peso="{peso}"/>')
        if chance(0.03):
            add('          </Volume>', emb, "fechamento-orfao", "</Volume> sem abertura correspondente")
        add('        </Volumes>')
        add('      </Nota>')
    add('    </Notas>')

    # ----- observação e ocorrências
    if chance(0.05):
        add(f'    <Instrucoes>Peso < 30kg por volume; empilhar no m&aacute;ximo 3 caixas</Instrucoes>', emb,
            "menor-que-solto", "'<' sem escape no texto (+ entidade HTML &aacute;)")
    if chance(0.03):
        add(f'    <Instrucoes>Manter temp<8C\x01 e evitar umidade\x0b</Instrucoes>', emb,
            "caractere-de-controle", "'<' colado e caracteres de controle 0x01 e 0x0B")
    if chance(0.05):
        add(f'    <Observacao>Entregar em horário comercial', emb, "tag-nao-fechada", "<Observacao> sem </Observacao>")
    else:
        add('    <Observacao>Entregar em horário comercial</Observacao>')
    add('  </Embarque>')

add('</LoteEmbarques>')

# ----- segundo lote concatenado no mesmo arquivo (acontece quando arquivos são juntados)
add('<?xml version="1.0" encoding="UTF-8"?>', "LOTE2", "segunda-declaracao-e-segunda-raiz",
    "dois XMLs concatenados no mesmo arquivo")
add('<LoteEmbarques xmlns="http://lincros.com.br/embarques" versao="2.0" gerado="2026-11-03T08:05:00-03:00">')
add('  <Embarque id="EMB900001" tipoFrete="CIF"><DataColeta>2026-11-03</DataColeta>'
    '<Observacao>Lote complementar</Observacao></Embarque>')
add('</LoteEmbarques>')
add('FIM DO ARQUIVO', "-", "texto-fora-da-raiz", "lixo depois do último elemento")

# ---------------------------------------------------------------- grava
conteudo = "\n".join(linhas) + "\n"
dados = bytearray()
for parte in conteudo.split("\x00"):
    if parte == "LATIN1":
        dados += "ção Civil Ltda".encode("latin-1")  # bytes inválidos em UTF-8
    else:
        dados += parte.encode("utf-8")

with open(f"{SAIDA}/lote_embarques_quebrado.xml", "wb") as f:
    f.write(dados)
with open(f"{SAIDA}/defeitos_inseridos.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["linha", "embarque", "defeito", "descricao"])
    w.writerows(defeitos)

resumo = {}
for d in defeitos:
    resumo[d[2]] = resumo.get(d[2], 0) + 1
print(f"{len(dados):,} bytes, {len(linhas):,} linhas, {QTD_EMBARQUES} embarques, {len(defeitos)} defeitos")
for k, v in sorted(resumo.items(), key=lambda x: -x[1]):
    print(f"  {v:4d}  {k}")
