package br.com.lincros.nifi.repair;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class JsonRepairTest {

    private static Repairer.Outcome run(String input) {
        return run(input.getBytes(StandardCharsets.UTF_8), new RepairOptions());
    }

    private static Repairer.Outcome run(byte[] input, RepairOptions opts) {
        return Repairer.process(input, opts);
    }

    private static void assertRepaired(String input, String expected) {
        Repairer.Outcome o = run(input);
        assertEquals(Repairer.Status.REPAIRED, o.status, "status para: " + input + " / erro: " + o.error);
        assertEquals(expected, o.text());
        assertTrue(StrictJsonValidator.isValid(o.text()));
    }

    // ------------------------------------------------------------ válidos

    @Test
    void jsonValidoPassaIntacto() {
        byte[] input = "{ \"a\" : 1,  \"b\": [true, null] }".getBytes(StandardCharsets.UTF_8);
        Repairer.Outcome o = run(input, new RepairOptions());
        assertEquals(Repairer.Status.VALID, o.status);
        assertArrayEquals(input, o.content);
        assertTrue(o.log.isEmpty());
    }

    @Test
    void aspaSimplesDentroDeStringValidaNaoEhAlterada() {
        Repairer.Outcome o = run("{\"nome\": \"O'Brien\", \"cod\": \"'SP'\"}");
        assertEquals(Repairer.Status.VALID, o.status);
    }

    // ------------------------------------------------------------ aspas

    @Test
    void aspasSimplesComoDelimitador() {
        assertRepaired("{'nome': 'João', 'ativo': True}", "{\"nome\":\"João\",\"ativo\":true}");
    }

    @Test
    void aspaDuplaExtraNoFimDoValor() {
        assertRepaired("{\"nome\": \"João\"\", \"idade\": 30}", "{\"nome\":\"João\",\"idade\":30}");
    }

    @Test
    void aspaSimplesExtraDepoisDoValor() {
        assertRepaired("{\"nome\": \"João\"', \"idade\": 30}", "{\"nome\":\"João\",\"idade\":30}");
    }

    @Test
    void aspaExtraNoInicioDoValor() {
        assertRepaired("{\"nome\": \"\"João\", \"x\": 1}", "{\"nome\":\"João\",\"x\":1}");
    }

    @Test
    void aspasDobradasEmChaveEValor() {
        assertRepaired("{\"\"nome\"\": \"\"Ana\"\"}", "{\"nome\":\"Ana\"}");
    }

    @Test
    void aspaExtraDepoisDeNumero() {
        assertRepaired("{\"qtd\": 10\", \"un\": \"CX\"}", "{\"qtd\":10,\"un\":\"CX\"}");
    }

    @Test
    void aspaInternaSemEscape() {
        assertRepaired("{\"desc\": \"Tubo 3\" de aço\", \"qtd\": 2}", "{\"desc\":\"Tubo 3\\\" de aço\",\"qtd\":2}");
    }

    @Test
    void aspaInternaNoFimDoValorNaoSePerde() {
        assertRepaired("{\"msg\": \"Ele disse \"oi\"\", \"x\": 1}", "{\"msg\":\"Ele disse \\\"oi\\\"\",\"x\":1}");
    }

    @Test
    void apostrofoDentroDeStringComAspasSimples() {
        assertRepaired("{'obs': 'caixa d'água'}", "{\"obs\":\"caixa d'água\"}");
    }

    @Test
    void aspasTipograficasDoWordOuExcel() {
        assertRepaired("{\u201Cnome\u201D: \u201CAna\u201D}", "{\"nome\":\"Ana\"}");
    }

    // ------------------------------------------------------------ estrutura

    @Test
    void virgulaFaltandoEVirgulaSobrando() {
        assertRepaired("{\"a\": 1 \"b\": 2,}", "{\"a\":1,\"b\":2}");
        assertRepaired("[1, 2,, 3,]", "[1,2,3]");
    }

    @Test
    void virgulaFaltandoEntreLinhas() {
        assertRepaired("{\n  \"a\": \"x\"\n  \"b\": \"y\"\n}", "{\"a\":\"x\",\"b\":\"y\"}");
    }

    @Test
    void chavesSemAspasEComentarios() {
        assertRepaired("{nome: \"Ana\", // comentário\n idade: 30 /* fim */}", "{\"nome\":\"Ana\",\"idade\":30}");
    }

    @Test
    void estruturaNaoFechada() {
        assertRepaired("{\"a\": [1, 2, {\"b\": \"x\"", "{\"a\":[1,2,{\"b\":\"x\"}]}");
    }

    @Test
    void stringNaoFechadaAntesDaProximaLinha() {
        assertRepaired("{\"a\": \"abc,\n \"b\": 1}", "{\"a\":\"abc\",\"b\":1}");
    }

    @Test
    void valorAusenteViraNull() {
        assertRepaired("{\"a\": , \"b\": 1}", "{\"a\":null,\"b\":1}");
    }

    @Test
    void variosJsonsNoMesmoArquivoViramArray() {
        assertRepaired("{\"a\":1}\n{\"a\":2}", "[{\"a\":1},{\"a\":2}]");
    }

    @Test
    void lixoAntesEDepoisDoJson() {
        assertRepaired("resposta: {\"a\": 1} fim", "{\"a\":1}");
        assertRepaired("'{\"a\": 1}'", "{\"a\":1}");
    }

    // ------------------------------------------------------------ valores

    @Test
    void literaisDePythonEJavaScript() {
        assertRepaired("{'a': None, 'b': False, 'c': undefined}", "{\"a\":null,\"b\":false,\"c\":null}");
    }

    @Test
    void zeroAEsquerdaViraTextoParaNaoPerderCep() {
        assertRepaired("{cep: 01310100, nf: 000123}", "{\"cep\":\"01310100\",\"nf\":\"000123\"}");
    }

    @Test
    void virgulaDecimalBrasileira() {
        assertRepaired("{\"peso\": 1,5, \"qtd\": 2}", "{\"peso\":1.5,\"qtd\":2}");
    }

    @Test
    void textoSemAspas() {
        assertRepaired("{\"cidade\": Sao Paulo, \"uf\": SP}", "{\"cidade\":\"Sao Paulo\",\"uf\":\"SP\"}");
    }

    @Test
    void numerosPreservadosSemPerdaDePrecisao() {
        assertRepaired("{'v': 12345678901234567890.123456789}", "{\"v\":12345678901234567890.123456789}");
    }

    @Test
    void escapeInvalidoComoCaminhoWindows() {
        assertRepaired("{'path': 'C:\\pasta\\arquivo'}", "{\"path\":\"C:\\\\pasta\\\\arquivo\"}");
    }

    // ------------------------------------------------------------ caracteres

    @Test
    void bomECaracteresDeControle() {
        assertRepaired("\uFEFF{\"a\": \"x\u0001y\u0007z\"}", "{\"a\":\"xyz\"}");
    }

    @Test
    void quebraDeLinhaETabDentroDaStringSaoEscapados() {
        assertRepaired("{\"a\": \"linha1\nlinha2\tfim\"}", "{\"a\":\"linha1\\nlinha2\\tfim\"}");
    }

    @Test
    void espacoInvisivelNbspViraEspacoNormal() {
        assertRepaired("{'a': 'x\u00A0y'}", "{\"a\":\"x y\"}");
    }

    @Test
    void arquivoEmWindows1252() {
        byte[] cp1252 = "{\"cidade\": \"São Paulo\", \"obs\": \"Açúcar\"}".getBytes(Charset.forName("windows-1252"));
        Repairer.Outcome o = run(cp1252, new RepairOptions());
        assertEquals(Repairer.Status.REPAIRED, o.status);
        assertEquals("{\"cidade\":\"São Paulo\",\"obs\":\"Açúcar\"}", o.text());
    }

    @Test
    void utf8MisturadoComByteLatin1() {
        // "São" em UTF-8 + "é" em latin-1 no mesmo arquivo
        byte[] prefix = "{\"a\": \"São\", \"b\": \"caf".getBytes(StandardCharsets.UTF_8);
        byte[] suffix = "\"}".getBytes(StandardCharsets.UTF_8);
        byte[] input = new byte[prefix.length + 1 + suffix.length];
        System.arraycopy(prefix, 0, input, 0, prefix.length);
        input[prefix.length] = (byte) 0xE9;
        System.arraycopy(suffix, 0, input, prefix.length + 1, suffix.length);
        Repairer.Outcome o = run(input, new RepairOptions());
        assertEquals("{\"a\":\"São\",\"b\":\"café\"}", o.text());
    }

    // ------------------------------------------------------------ modo sempre normalizar

    @Test
    void modoSempreNormalizarCorrigeAcentuacaoEEspacosEmJsonValido() {
        RepairOptions opts = new RepairOptions();
        opts.mode = RepairOptions.Mode.ALWAYS_NORMALIZE;
        Repairer.Outcome o = run("{\" nome \": \"  SÃ£o Paulo  \"}".getBytes(StandardCharsets.UTF_8), opts);
        assertEquals(Repairer.Status.NORMALIZED, o.status);
        assertEquals("{\"nome\":\"São Paulo\"}", o.text());
        assertTrue(o.log.has("encoding-corrigido"));
        assertTrue(o.log.has("espacos-aparados"));
    }

    @Test
    void saidaIndentada() {
        RepairOptions opts = new RepairOptions();
        opts.prettyJson = true;
        Repairer.Outcome o = run("{'a': [1, {'b': 2}]}".getBytes(StandardCharsets.UTF_8), opts);
        assertEquals("{\n  \"a\": [\n    1,\n    {\n      \"b\": 2\n    }\n  ]\n}", o.text());
    }

    @Test
    void conteudoVazioFalha() {
        Repairer.Outcome o = run("   ");
        assertEquals(Repairer.Status.FAILED, o.status);
    }

    @Test
    void exemploRealistaDeCteComVariosProblemas() {
        String input = "\uFEFF{\n"
                + "  'chave': '35240112345678000199570010000012341000012345',\n"
                + "  \"emitente\": \"Transportes Silva & Filhos\"\",\n"
                + "  remetente: \"Ind\u00FAstria \"Boa Vista\" Ltda\",\n"
                + "  \"cep_origem\": 01310100,\n"
                + "  \"peso_kg\": 1520,75,\n"
                + "  \"obs\": \u201Centregar no galp\u00E3o 2\u201D,\n"
                + "  \"ativo\": True,\n"
                + "}";
        assertRepaired(input, "{\"chave\":\"35240112345678000199570010000012341000012345\","
                + "\"emitente\":\"Transportes Silva & Filhos\","
                + "\"remetente\":\"Ind\u00FAstria \\\"Boa Vista\\\" Ltda\","
                + "\"cep_origem\":\"01310100\","
                + "\"peso_kg\":1520.75,"
                + "\"obs\":\"entregar no galp\u00E3o 2\","
                + "\"ativo\":true}");
    }
}
