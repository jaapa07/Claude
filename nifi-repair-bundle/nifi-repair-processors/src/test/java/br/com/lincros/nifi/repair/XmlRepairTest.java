package br.com.lincros.nifi.repair;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class XmlRepairTest {

    private static Repairer.Outcome run(byte[] input, RepairOptions opts) {
        return Repairer.process(input, opts);
    }

    private static void assertRepaired(String input, String expected) {
        Repairer.Outcome o = run(input.getBytes(StandardCharsets.UTF_8), new RepairOptions());
        assertEquals(Repairer.Status.REPAIRED, o.status, "status para: " + input + " / erro: " + o.error);
        assertEquals(expected, o.text());
        assertNull(XmlRepairer.parseError(o.text()));
    }

    @Test
    void xmlValidoPassaIntacto() {
        byte[] input = "<?xml version=\"1.0\"?>\n<a x='1'><b> 1 </b></a>".getBytes(StandardCharsets.UTF_8);
        Repairer.Outcome o = run(input, new RepairOptions());
        assertEquals(Repairer.Status.VALID, o.status);
        assertArrayEquals(input, o.content);
    }

    // ------------------------------------------------------------ caracteres especiais

    @Test
    void eComercialSolto() {
        assertRepaired("<empresa>Silva & Filhos</empresa>", "<empresa>Silva &amp; Filhos</empresa>");
    }

    @Test
    void eComercialSoltoMantemEntidadesValidas() {
        assertRepaired("<a>A &amp; B & C &lt; D</a>", "<a>A &amp; B &amp; C &lt; D</a>");
    }

    @Test
    void menorQueSoltoNoTexto() {
        assertRepaired("<cond>x < 5 e y<=3</cond>", "<cond>x &lt; 5 e y&lt;=3</cond>");
    }

    @Test
    void entidadesHtmlViramCaracteres() {
        assertRepaired("<a>S&atilde;o&nbsp;Paulo &ndash; &Aacute;rea &copy;</a>", "<a>São Paulo – Área ©</a>");
    }

    @Test
    void caracteresDeControleRemovidos() {
        assertRepaired("<a>x\u0001y\u0008z</a>", "<a>xyz</a>");
    }

    @Test
    void bomEEspacoAntesDaDeclaracao() {
        assertRepaired("﻿  \n<?xml version=\"1.0\"?><a>1</a>", "<?xml version=\"1.0\" encoding=\"UTF-8\"?><a>1</a>");
    }

    @Test
    void lixoAntesDoXml() {
        assertRepaired("Resposta do servidor: <a>1</a>", "<a>1</a>");
    }

    @Test
    void declaracaoIso88591ConvertidaParaUtf8() {
        byte[] latin1 = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><a>São & Cia</a>"
                .getBytes(StandardCharsets.ISO_8859_1);
        Repairer.Outcome o = run(latin1, new RepairOptions());
        assertEquals(Repairer.Status.REPAIRED, o.status);
        assertEquals("<?xml version=\"1.0\" encoding=\"UTF-8\"?><a>São &amp; Cia</a>", o.text());
    }

    // ------------------------------------------------------------ aspas em atributos

    @Test
    void aspaInternaEmAtributo() {
        assertRepaired("<item desc=\"Tubo 3\" de aço\" qtd=\"2\"/>", "<item desc=\"Tubo 3&quot; de aço\" qtd=\"2\"/>");
    }

    @Test
    void aspasExtrasEmAtributo() {
        assertRepaired("<item id=\"\"10\"\" un=\"CX\"'></item>", "<item id=\"10\" un=\"CX\"></item>");
    }

    @Test
    void atributoSemAspasESemValor() {
        assertRepaired("<x><item id=10 nome='abc' ativo/></x>", "<x><item id=\"10\" nome=\"abc\" ativo=\"ativo\"/></x>");
    }

    @Test
    void atributoComAspasTipograficas() {
        assertRepaired("<item id=“10”/>", "<item id=\"10\"/>");
    }

    @Test
    void atributoDuplicado() {
        assertRepaired("<item id=\"1\" id=\"2\"/>", "<item id=\"1\"/>");
    }

    // ------------------------------------------------------------ espaços e estrutura

    @Test
    void espacosDentroDasTags() {
        assertRepaired("<p>< nome >Ana</ nome ></p>", "<p><nome>Ana</nome></p>");
    }

    @Test
    void espacosNasPontasDoTextoSaoAparados() {
        assertRepaired("<p><nome>  Ana  </nome><x>&</x></p>", "<p><nome>Ana</nome><x>&amp;</x></p>");
    }

    @Test
    void tagsNaoFechadas() {
        assertRepaired("<a><b>1<c>2</a>", "<a><b>1<c>2</c></b></a>");
        assertRepaired("<a><b>1", "<a><b>1</b></a>");
    }

    @Test
    void tagDeFechamentoOrfa() {
        assertRepaired("<a>1</b></a>", "<a>1</a>");
    }

    @Test
    void maiusculasMinusculasDiferentes() {
        assertRepaired("<Nome>Ana</nome>", "<Nome>Ana</Nome>");
    }

    @Test
    void variasRaizesSaoAgrupadas() {
        assertRepaired("<a>1</a><a>2</a>", "<root><a>1</a><a>2</a></root>");
    }

    @Test
    void variasDeclaracoesConcatenadas() {
        assertRepaired("<?xml version=\"1.0\"?><a>1</a>\n<?xml version=\"1.0\"?><a>2</a>",
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?><root><a>1</a><a>2</a></root>");
    }

    @Test
    void prefixoSemNamespaceDeclarado() {
        assertRepaired("<ns:a><ns:b>1</ns:b></ns:a>", "<ns:a xmlns:ns=\"urn:nao-declarado:ns\"><ns:b>1</ns:b></ns:a>");
    }

    @Test
    void comentarioECdataPreservados() {
        assertRepaired("<a><!-- ok --><![CDATA[x < y & z]]> & </a>", "<a><!-- ok --><![CDATA[x < y & z]]> &amp;</a>");
    }

    @Test
    void modoSempreNormalizarCorrigeAcentuacaoEmXmlValido() {
        RepairOptions opts = new RepairOptions();
        opts.mode = RepairOptions.Mode.ALWAYS_NORMALIZE;
        Repairer.Outcome o = run("<cidade> SÃ£o Paulo </cidade>".getBytes(StandardCharsets.UTF_8), opts);
        assertEquals(Repairer.Status.NORMALIZED, o.status);
        assertEquals("<cidade>São Paulo</cidade>", o.text());
    }

    @Test
    void exemploRealistaDeNfe() {
        String input = "﻿<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<nfeProc xmlns=\"http://www.portalfiscal.inf.br/nfe\" versao=\"4.00\">\n"
                + "  <NFe><infNFe Id=\"NFe3524...\" versao=4.00>\n"
                + "    <emit><xNome>Transportes Silva & Filhos LTDA</xNome>\n"
                + "      <xFant>Silva \"Express\"</xFant></emit>\n"
                + "    <det nItem=\"1\"><prod><xProd>Tubo 3\" aço &nbsp;inox</xProd>\n"
                + "      <obs>peso < 10kg</obs></prod></det>\n"
                + "  </infNFe></NFe>\n"
                + "</nfeProc>";
        Repairer.Outcome o = run(input.getBytes(StandardCharsets.UTF_8), new RepairOptions());
        assertEquals(Repairer.Status.REPAIRED, o.status, o.error);
        String out = o.text();
        assertNull(XmlRepairer.parseError(out));
        assertTrue(out.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
        assertTrue(out.contains("<xNome>Transportes Silva &amp; Filhos LTDA</xNome>"));
        assertTrue(out.contains("versao=\"4.00\""));
        assertTrue(out.contains("<obs>peso &lt; 10kg</obs>"));
        assertTrue(out.contains("<xProd>Tubo 3\" aço  inox</xProd>"));
    }
}
