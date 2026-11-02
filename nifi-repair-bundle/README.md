# Processors NiFi da Lincros

Pacote `.nar` para **Apache NiFi 1.23** (compatível com NiFi 1.x em Java 8+) com dois processors:

| Processor | Para quê |
|---|---|
| **RepairXmlJson** | Conserta JSON e XML quebrados na entrada do fluxo |
| **JsonToXmlTemplate** | Monta um XML completo a partir de um JSON, com template (parte única + listas), sem SplitJson/MergeContent |

---

# JsonToXmlTemplate: XML a partir de JSON com template

Você escreve o XML de saída do jeito que ele precisa ficar:
- **Parte única:** funciona como um `ReplaceText`. `{{campo}}` é trocado pelo valor do JSON, já escapado para XML.
- **Listas:** o trecho entre `{{#each lista}}` e `{{/each}}` se repete para cada item, inclusive com listas dentro de listas.

O documento sai **completo ou vai para `failure`**, nunca pela metade. Isso substitui fluxos frágeis com
`SplitJson → ... → MergeContent`.

**JSON**
```json
{"numero": 123, "cliente": {"nome": "Silva & Filhos", "cnpj": "12.345.678/0001-99"},
 "itens": [{"sku": "A1", "qtd": 2, "valor": 150}, {"sku": "B7", "qtd": 1, "valor": 12.5}]}
```
**Template**
```xml
<Pedido numero="{{numero}}">
  <Cliente cnpj="{{cliente.cnpj | digits}}">{{cliente.nome}}</Cliente>
  <Itens total="{{itens.length}}">
    {{#each itens}}
    <Item seq="{{@number}}" pedido="{{numero}}"><Sku>{{sku}}</Sku><Valor>{{valor | number:2}}</Valor></Item>
    {{/each}}
  </Itens>
</Pedido>
```
**XML gerado**
```xml
<Pedido numero="123">
  <Cliente cnpj="12345678000199">Silva &amp; Filhos</Cliente>
  <Itens total="2">
    <Item seq="1" pedido="123"><Sku>A1</Sku><Valor>150.00</Valor></Item>
    <Item seq="2" pedido="123"><Sku>B7</Sku><Valor>12.50</Valor></Item>
  </Itens>
</Pedido>
```

### Marcações
| Marcação | O que faz |
|---|---|
| `{{campo}}` `{{a.b.c}}` `{{lista[0].x}}` | Valor do JSON, escapado para XML |
| `{{lista.length}}` | Quantidade de itens |
| `{{{campo}}}` | Valor **sem** escape (trecho de XML pronto) |
| `{{#each lista}} … {{else}} … {{/each}}` | Repete para cada item; `else` quando vazia |
| `{{this}}` | Item atual (lista de textos) |
| `{{@number}}` `{{@index}}` `{{@count}}` `{{@first}}` `{{@last}}` | Posição no laço |
| `{{#if campo}}` `{{#if valor > 0}}` `{{#if status == 'A'}}` … `{{else}}` … `{{/if}}` | Condição |
| `{{#unless campo}}` | Condição negada |
| `{{#with cliente}} … {{/with}}` | Entra num objeto |
| `{{../campo}}` `{{@root.campo}}` | Nível de cima / raiz |
| `{{@attr.filename}}` | Atributo do FlowFile |
| `{{! comentário }}` | Não aparece no XML |

Dentro de uma lista, um campo que não existe no item é procurado nos níveis de cima.
Por isso `{{numero}}` do pedido funciona dentro de cada item.

### Filtros
`default:'x'` · `upper` · `lower` · `trim` · `number:2` (aceita `1.234,56`) · `date:'dd/MM/yyyy'`
(ou `date:'saída':'entrada'`) · `digits` · `lpad:9` · `rpad:10` · `truncate:60` · `replace:';':','` · `json`.
Filtros podem ser encadeados: `{{nome | trim | upper}}`.

### Configuração
| Propriedade | Padrão | Descrição |
|---|---|---|
| Template XML | — | O template escrito direto na propriedade |
| Arquivo de template | — | Caminho do template; aceita Expression Language (ex.: `/templates/${tipo}.xml`). Use este **ou** o anterior |
| Modo de saída | Um XML por JSON | `Um XML por item do array`: JSON com array na raiz gera um XML por item (substitui o SplitJson) |
| Campo ausente no JSON | Deixar vazio | `Falhar` manda para failure se faltar campo (exceto com `default`) |
| Remover elementos vazios | false | Tira tags sem valor e sem atributos |
| Arquivo XSD | — | Valida o XML gerado contra um XSD |
| Fuso horário | America/Sao_Paulo | Usado pelo filtro `date` |

**Saídas:** `success` (XML), `original` (o JSON de entrada) e `failure` (JSON original + `xml.template.error`).
Erros de sintaxe no template aparecem na própria tela do NiFi, com o número da linha.

---

# RepairXmlJson: processor NiFi que conserta JSON e XML quebrados

Processor customizado para **Apache NiFi 1.23** (compatível com NiFi 1.x em Java 8+).
Ele fica na entrada do fluxo e corrige as anomalias que fazem `EvaluateJsonPath`,
`JoltTransformJSON`, `ConvertRecord`, `EvaluateXPath` e similares falharem.
Documentos que já estão válidos **passam sem nenhuma alteração**.

## O que ele corrige

### JSON
| Problema | Antes | Depois |
|---|---|---|
| Aspas simples | `{'nome': 'Ana'}` | `{"nome":"Ana"}` |
| Aspa extra no fim | `{"nome": "Ana"", "id": 1}` | `{"nome":"Ana","id":1}` |
| Aspa simples sobrando | `{"nome": "Ana"', "id": 1}` | `{"nome":"Ana","id":1}` |
| Aspas dobradas | `{""nome"": ""Ana""}` | `{"nome":"Ana"}` |
| Aspa interna sem escape | `{"d": "Tubo 3" de aço"}` | `{"d":"Tubo 3\" de aço"}` |
| Apóstrofo em aspas simples | `{'obs': 'caixa d'água'}` | `{"obs":"caixa d'água"}` |
| Aspas do Word/Excel | `{“nome”: “Ana”}` | `{"nome":"Ana"}` |
| Vírgula faltando ou sobrando | `{"a": 1 "b": 2,}` | `{"a":1,"b":2}` |
| Chave sem aspas, comentários | `{nome: "Ana" // obs}` | `{"nome":"Ana"}` |
| Estrutura não fechada | `{"a": [1, 2` | `{"a":[1,2]}` |
| Vírgula decimal | `{"peso": 1,5}` | `{"peso":1.5}` |
| Zero à esquerda (CEP, NF) | `{cep: 01310100}` | `{"cep":"01310100"}` |
| Literais Python/JS | `{'a': None, 'b': True}` | `{"a":null,"b":true}` |
| Vários JSON no arquivo | `{"a":1}\n{"a":2}` | `[{"a":1},{"a":2}]` |
| Quebra de linha/tab cru na string | `"linha1⏎linha2"` | `"linha1\nlinha2"` |

### XML
| Problema | Antes | Depois |
|---|---|---|
| `&` solto | `<a>Silva & Filhos</a>` | `<a>Silva &amp; Filhos</a>` |
| `<` solto | `<a>x < 5</a>` | `<a>x &lt; 5</a>` |
| Aspa interna no atributo | `<i d="Tubo 3" aço"/>` | `<i d="Tubo 3&quot; aço"/>` |
| Aspas extras no atributo | `<i id=""10""/>` | `<i id="10"/>` |
| Atributo sem aspas ou sem valor | `<i id=10 ativo/>` | `<i id="10" ativo="ativo"/>` |
| Espaço dentro da tag | `< nome >Ana</ nome >` | `<nome>Ana</nome>` |
| Tag não fechada | `<a><b>1</a>` | `<a><b>1</b></a>` |
| Fechamento órfão | `<a>1</b></a>` | `<a>1</a>` |
| Maiúscula/minúscula | `<Nome>Ana</nome>` | `<Nome>Ana</Nome>` |
| Entidade HTML | `S&atilde;o&nbsp;Paulo` | `São Paulo` |
| Lixo/espaço antes do `<?xml` | `  <?xml ...?>` | `<?xml ...?>` |
| Várias raízes | `<a/><a/>` | `<root><a/><a/></root>` |
| Prefixo sem namespace | `<ns:a>` | `<ns:a xmlns:ns="urn:nao-declarado:ns">` |

### Os dois formatos
| Problema | Antes | Depois |
|---|---|---|
| Espaços nas pontas | `"  Ana  "` | `"Ana"` |
| Acentuação quebrada (mojibake) | `SÃ£o Paulo`, `AÃ§Ãºcar` | `São Paulo`, `Açúcar` |
| Arquivo em Windows-1252/ISO-8859-1 | bytes latin-1 | UTF-8 |
| BOM, zero-width, NBSP | `﻿`, `​`, ` ` | removidos / espaço normal |
| Caracteres de controle | `\u0001`, `\u0007`... | removidos |

## Instalação no NiFi 1.23

1. Pegue o arquivo `nifi-repair-nar-1.1.0.nar` (veja "Compilar" abaixo).
2. Copie para a pasta de **auto-carregamento**, sem reiniciar:
   ```bash
   cp nifi-repair-nar-1.1.0.nar $NIFI_HOME/extensions/
   ```
   Se preferir, copie para `$NIFI_HOME/lib/` e reinicie o NiFi.
3. Em **cluster**, copie para **todos os nós**.
4. No canvas, arraste um **Processor**, busque **RepairXmlJson** e conecte.
5. Se não aparecer, procure por `nifi-repair-nar` no `logs/nifi-app.log`.

**Docker:**
```bash
docker cp nifi-repair-nar-1.1.0.nar <container>:/opt/nifi/nifi-current/extensions/
```

## Configuração

| Propriedade | Padrão | Descrição |
|---|---|---|
| Formato de entrada | Automático | `Automático` detecta pelo 1º caractere (`<` = XML, `{`/`[` = JSON) |
| Modo | Somente inválidos | `Sempre normalizar` limpa também documentos válidos (acentuação, espaços) |
| Remover espaços nas pontas | true | Apara chaves, valores, atributos e texto de elementos sem filhos |
| Corrigir acentuação quebrada | true | `SÃ£o` → `São` |
| JSON indentado | false | Saída JSON indentada ou compacta |
| Elemento agrupador XML | root | Usado quando o XML tem mais de uma raiz |

## Relacionamentos e atributos

- **success**: documentos válidos ou corrigidos.
- **failure**: não foi possível corrigir. Segue o conteúdo original, com o motivo em `repair.error`.

| Atributo | Exemplo |
|---|---|
| `repair.status` | `valid`, `repaired`, `normalized`, `failed` |
| `repair.actions` | `aspas-extras-removidas(2),e-comercial-escapado(1)` |
| `repair.action.count` | `3` |
| `repair.format` | `json` / `xml` |
| `repair.error` | motivo da falha |
| `mime.type` | `application/json` / `application/xml` |

### Fluxo sugerido
```
[ingestão] → RepairXmlJson ─success→ RouteOnAttribute ─(repair.status == repaired)→ log/alerta/contagem
                          │                          └─────────────────────────────→ [seu fluxo]
                          └─failure→ PutFile/PutS3 (quarentena)
```
Com `repair.actions` dá para montar um painel de qualidade de dados que mostra quais
fornecedores ou sistemas mandam dados mais sujos.

## Compilar

Requer Java 8+ e Maven 3.6+:
```bash
mvn clean package
# gera nifi-repair-nar/target/nifi-repair-nar-1.1.0.nar
```
O bytecode é Java 8, então roda no NiFi 1.23 em Java 8, 11, 17 ou 21.

## Limitações
- A correção é **heurística**: em casos ambíguos, como uma aspa interna seguida de `, "` no meio do texto,
  ela pode escolher a interpretação errada. Monitore os itens com `repair.status=repaired`.
- O conteúdo é carregado inteiro em memória. Indicado para documentos de até algumas dezenas de MB.
- A saída é sempre UTF-8.
- Prefixos XML sem declaração recebem o namespace fictício `urn:nao-declarado:<prefixo>`.
