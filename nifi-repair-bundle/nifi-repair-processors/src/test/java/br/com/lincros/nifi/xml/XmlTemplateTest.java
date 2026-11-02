package br.com.lincros.nifi.xml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class XmlTemplateTest {

    private static String render(String template, String json) throws TemplateException {
        return render(template, json, new XmlTemplate.Options());
    }

    private static String render(String template, String json, XmlTemplate.Options opts) throws TemplateException {
        return XmlTemplate.compile(template).render(JsonTree.parse(json), Collections.<String, String>emptyMap(), opts);
    }

    // ------------------------------------------------------------ parte única (como ReplaceText)

    @Test
    void parteUnicaComoReplaceText() throws Exception {
        String t = "<Pedido numero=\"{{numero}}\"><Cliente>{{cliente.nome}}</Cliente><Cnpj>{{cliente.cnpj}}</Cnpj></Pedido>";
        String json = "{\"numero\": 123, \"cliente\": {\"nome\": \"Ana\", \"cnpj\": \"12345678000199\"}}";
        assertEquals("<Pedido numero=\"123\"><Cliente>Ana</Cliente><Cnpj>12345678000199</Cnpj></Pedido>", render(t, json));
    }

    @Test
    void valoresSaoEscapadosParaXml() throws Exception {
        String t = "<a x=\"{{v}}\">{{v}}</a>";
        assertEquals("<a x=\"Silva &amp; &quot;Filhos&quot; &lt;ME&gt;\">Silva &amp; &quot;Filhos&quot; &lt;ME&gt;</a>",
                render(t, "{\"v\": \"Silva & \\\"Filhos\\\" <ME>\"}"));
    }

    @Test
    void tresChavesInseremXmlSemEscape() throws Exception {
        assertEquals("<a><b>1</b></a>", render("<a>{{{trecho}}}</a>", "{\"trecho\": \"<b>1</b>\"}"));
    }

    @Test
    void numerosSaemExatamenteComoVieram() throws Exception {
        assertEquals("<v>12345678901234567890.10</v>", render("<v>{{v}}</v>", "{\"v\": 12345678901234567890.10}"));
    }

    @Test
    void atributoDoFlowFile() throws Exception {
        Map<String, String> attrs = new HashMap<>();
        attrs.put("filename", "pedido.json");
        String out = XmlTemplate.compile("<a origem=\"{{@attr.filename}}\"/>")
                .render(JsonTree.parse("{}"), attrs, new XmlTemplate.Options());
        assertEquals("<a origem=\"pedido.json\"/>", out);
    }

    // ------------------------------------------------------------ listas

    @Test
    void parteUnicaMaisListaDeItens() throws Exception {
        String t = "<Pedido numero=\"{{numero}}\">\n"
                + "  <Cliente>{{cliente}}</Cliente>\n"
                + "  <Itens total=\"{{itens.length}}\">\n"
                + "    {{#each itens}}\n"
                + "    <Item seq=\"{{@number}}\"><Sku>{{sku}}</Sku><Qtd>{{qtd}}</Qtd></Item>\n"
                + "    {{/each}}\n"
                + "  </Itens>\n"
                + "</Pedido>";
        String json = "{\"numero\": 123, \"cliente\": \"Ana\", \"itens\": [{\"sku\": \"A1\", \"qtd\": 2}, {\"sku\": \"B7\", \"qtd\": 1}]}";
        assertEquals("<Pedido numero=\"123\">\n"
                + "  <Cliente>Ana</Cliente>\n"
                + "  <Itens total=\"2\">\n"
                + "    <Item seq=\"1\"><Sku>A1</Sku><Qtd>2</Qtd></Item>\n"
                + "    <Item seq=\"2\"><Sku>B7</Sku><Qtd>1</Qtd></Item>\n"
                + "  </Itens>\n"
                + "</Pedido>", render(t, json));
    }

    @Test
    void listaDentroDeLista() throws Exception {
        String t = "<Cte>{{#each notas}}<NF chave=\"{{chave}}\">{{#each volumes}}<Vol>{{peso}}</Vol>{{/each}}</NF>{{/each}}</Cte>";
        String json = "{\"notas\": [{\"chave\": \"111\", \"volumes\": [{\"peso\": 10}, {\"peso\": 20}]},"
                + " {\"chave\": \"222\", \"volumes\": [{\"peso\": 5}]}]}";
        assertEquals("<Cte><NF chave=\"111\"><Vol>10</Vol><Vol>20</Vol></NF><NF chave=\"222\"><Vol>5</Vol></NF></Cte>",
                render(t, json));
    }

    @Test
    void campoDaParteUnicaDentroDaLista() throws Exception {
        String t = "<L>{{#each itens}}<Item pedido=\"{{numero}}\" pai=\"{{../numero}}\" raiz=\"{{@root.numero}}\">{{sku}}</Item>{{/each}}</L>";
        assertEquals("<L><Item pedido=\"9\" pai=\"9\" raiz=\"9\">A</Item></L>",
                render(t, "{\"numero\": 9, \"itens\": [{\"sku\": \"A\"}]}"));
    }

    @Test
    void listaDeTextosSimples() throws Exception {
        assertEquals("<Tags><T>a</T><T>b</T></Tags>", render("<Tags>{{#each tags}}<T>{{this}}</T>{{/each}}</Tags>",
                "{\"tags\": [\"a\", \"b\"]}"));
    }

    @Test
    void objetoUnicoOndeEraEsperadaListaViraListaDeUm() throws Exception {
        assertEquals("<L><I>A</I></L>", render("<L>{{#each itens}}<I>{{sku}}</I>{{/each}}</L>", "{\"itens\": {\"sku\": \"A\"}}"));
    }

    @Test
    void listaVaziaUsaElse() throws Exception {
        String t = "<L>{{#each itens}}<I/>{{else}}<SemItens/>{{/each}}</L>";
        assertEquals("<L><SemItens/></L>", render(t, "{\"itens\": []}"));
        assertEquals("<L><SemItens/></L>", render(t, "{}"));
    }

    @Test
    void variaveisDoLaco() throws Exception {
        String t = "{{#each x}}{{@index}}/{{@number}}/{{@count}}{{#if @first}}F{{/if}}{{#if @last}}L{{/if}};{{/each}}";
        assertEquals("0/1/3F;1/2/3;2/3/3L;", render(t, "{\"x\": [1, 2, 3]}"));
    }

    @Test
    void linhasSoComBlocoNaoDeixamLinhaEmBranco() throws Exception {
        String t = "<L>\n  {{#each x}}\n  <I>{{this}}</I>\n  {{/each}}\n</L>";
        assertEquals("<L>\n  <I>1</I>\n  <I>2</I>\n</L>", render(t, "{\"x\": [1, 2]}"));
    }

    // ------------------------------------------------------------ condições e contexto

    @Test
    void condicoes() throws Exception {
        String t = "{{#if desconto}}<D>{{desconto}}</D>{{/if}}{{#if status == 'A'}}<Ativo/>{{else}}<Inativo/>{{/if}}"
                + "{{#if peso > 10}}<Pesado/>{{/if}}{{#unless obs}}<SemObs/>{{/unless}}";
        assertEquals("<D>0</D><Ativo/><Pesado/><SemObs/>", render(t, "{\"desconto\": 0, \"status\": \"A\", \"peso\": 10.5}"));
        assertEquals("<Inativo/><SemObs/>", render(t, "{\"status\": \"I\", \"peso\": 3, \"obs\": \"\"}"));
    }

    @Test
    void comparacaoEntreCampos() throws Exception {
        assertEquals("ok", render("{{#if entregue >= previsto}}ok{{/if}}", "{\"entregue\": 5, \"previsto\": 5}"));
    }

    @Test
    void blocoWith() throws Exception {
        assertEquals("<C>Ana/SP</C>", render("{{#with cliente}}<C>{{nome}}/{{uf}}</C>{{/with}}",
                "{\"cliente\": {\"nome\": \"Ana\", \"uf\": \"SP\"}}"));
    }

    // ------------------------------------------------------------ filtros

    @Test
    void filtrosDeTexto() throws Exception {
        String json = "{\"n\": \"  Ana Silva  \", \"cnpj\": \"12.345.678/0001-99\", \"cod\": \"42\"}";
        assertEquals("ANA SILVA|12345678000199|000042|Ana|Ana-Silva",
                render("{{n | trim | upper}}|{{cnpj | digits}}|{{cod | lpad:6}}|{{n | trim | truncate:3}}|{{n | trim | replace:' ':'-'}}", json));
    }

    @Test
    void filtroDefault() throws Exception {
        assertEquals("<O>N/A</O><P>N/A</P><Q>x</Q>",
                render("<O>{{obs | default:'N/A'}}</O><P>{{nulo | default:'N/A'}}</P><Q>{{q | default:'N/A'}}</Q>",
                        "{\"nulo\": null, \"q\": \"x\"}"));
    }

    @Test
    void filtroNumero() throws Exception {
        assertEquals("1520.75|10.00|1234.57|1.50",
                render("{{a | number:2}}|{{b | number:2}}|{{c | number:2}}|{{d | number:2}}",
                        "{\"a\": 1520.75, \"b\": 10, \"c\": \"1.234,567\", \"d\": \"1,5\"}"));
    }

    @Test
    void filtroData() throws Exception {
        String json = "{\"iso\": \"2026-11-02T14:30:00-03:00\", \"br\": \"02/11/2026\", \"d\": \"2026-11-02\"}";
        assertEquals("02/11/2026 14:30|2026-11-02|20261102|2026-11-02T00:00:00-03:00",
                render("{{iso | date:'dd/MM/yyyy HH:mm'}}|{{br | date:'yyyy-MM-dd'}}|{{d | date:'yyyyMMdd'}}|{{d | date:\"yyyy-MM-dd'T'HH:mm:ssXXX\"}}", json));
    }

    @Test
    void filtroDataComFormatoDeEntrada() throws Exception {
        assertEquals("2026-11-02", render("{{d | date:'yyyy-MM-dd':'yyyyMMdd'}}", "{\"d\": \"20261102\"}"));
    }

    // ------------------------------------------------------------ erros

    @Test
    void campoAusenteViraVazioPorPadrao() throws Exception {
        assertEquals("<A></A>", render("<A>{{naoExiste}}</A>", "{}"));
    }

    @Test
    void campoAusenteFalhaNoModoEstrito() {
        XmlTemplate.Options o = new XmlTemplate.Options();
        o.failOnMissing = true;
        TemplateException e = assertThrows(TemplateException.class, () -> render("<A>\n{{cliente.cnpj}}</A>", "{}", o));
        assertTrue(e.getMessage().contains("cliente.cnpj"));
        assertTrue(e.getMessage().contains("linha 2"));
    }

    @Test
    void erroDeSintaxeIndicaLinha() {
        TemplateException e = assertThrows(TemplateException.class,
                () -> XmlTemplate.compile("<a>\n{{#each itens}}\n<i/>\n{{/if}}\n</a>"));
        assertTrue(e.getMessage().contains("linha 4"), e.getMessage());
        assertTrue(e.getMessage().contains("linha 2"), e.getMessage());

        e = assertThrows(TemplateException.class, () -> XmlTemplate.compile("{{#each x}}<a/>"));
        assertTrue(e.getMessage().contains("não foi fechado"));

        e = assertThrows(TemplateException.class, () -> XmlTemplate.compile("{{x | maiusculo}}"));
        assertTrue(e.getMessage().contains("desconhecido"));
    }

    @Test
    void jsonInvalidoIndicaPosicao() {
        TemplateException e = assertThrows(TemplateException.class, () -> JsonTree.parse("{\"a\": 1,\n \"b\": }"));
        assertTrue(e.getMessage().contains("linha 2"), e.getMessage());
        assertTrue(e.getMessage().contains("RepairXmlJson"));
    }

    // ------------------------------------------------------------ exemplo completo

    @Test
    void exemploRealistaDeCte() throws Exception {
        String t = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<Conhecimento xmlns=\"http://exemplo.com/cte\" versao=\"1.0\">\n"
                + "  <Cabecalho>\n"
                + "    <Numero>{{numero | lpad:9}}</Numero>\n"
                + "    <Emissao>{{emissao | date:'dd/MM/yyyy'}}</Emissao>\n"
                + "    <Transportadora cnpj=\"{{transportadora.cnpj | digits}}\">{{transportadora.nome | upper}}</Transportadora>\n"
                + "    {{#if observacao}}\n"
                + "    <Obs>{{observacao}}</Obs>\n"
                + "    {{/if}}\n"
                + "  </Cabecalho>\n"
                + "  <Notas quantidade=\"{{notas.length}}\">\n"
                + "    {{#each notas}}\n"
                + "    <Nota seq=\"{{@number}}\" cte=\"{{numero}}\">\n"
                + "      <Chave>{{chave}}</Chave>\n"
                + "      <Valor>{{valor | number:2}}</Valor>\n"
                + "    </Nota>\n"
                + "    {{/each}}\n"
                + "  </Notas>\n"
                + "  <ValorTotal>{{total | number:2}}</ValorTotal>\n"
                + "</Conhecimento>";
        String json = "{\"numero\": 4521, \"emissao\": \"2026-11-02T10:15:00-03:00\","
                + " \"transportadora\": {\"nome\": \"Silva & Filhos Transportes\", \"cnpj\": \"12.345.678/0001-99\"},"
                + " \"notas\": [{\"chave\": \"3526...0001\", \"valor\": 1500}, {\"chave\": \"3526...0002\", \"valor\": 320.5}],"
                + " \"total\": 1820.5}";
        String out = render(t, json);
        assertEquals("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<Conhecimento xmlns=\"http://exemplo.com/cte\" versao=\"1.0\">\n"
                + "  <Cabecalho>\n"
                + "    <Numero>000004521</Numero>\n"
                + "    <Emissao>02/11/2026</Emissao>\n"
                + "    <Transportadora cnpj=\"12345678000199\">SILVA &amp; FILHOS TRANSPORTES</Transportadora>\n"
                + "  </Cabecalho>\n"
                + "  <Notas quantidade=\"2\">\n"
                + "    <Nota seq=\"1\" cte=\"4521\">\n"
                + "      <Chave>3526...0001</Chave>\n"
                + "      <Valor>1500.00</Valor>\n"
                + "    </Nota>\n"
                + "    <Nota seq=\"2\" cte=\"4521\">\n"
                + "      <Chave>3526...0002</Chave>\n"
                + "      <Valor>320.50</Valor>\n"
                + "    </Nota>\n"
                + "  </Notas>\n"
                + "  <ValorTotal>1820.50</ValorTotal>\n"
                + "</Conhecimento>", out);
        XmlPostProcessor.parse(out);
    }
}
