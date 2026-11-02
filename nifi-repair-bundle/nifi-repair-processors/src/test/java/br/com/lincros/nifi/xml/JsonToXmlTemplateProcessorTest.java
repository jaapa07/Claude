package br.com.lincros.nifi.xml;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;
import org.apache.nifi.util.MockFlowFile;
import org.apache.nifi.util.TestRunner;
import org.apache.nifi.util.TestRunners;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class JsonToXmlTemplateProcessorTest {

    private static final String PEDIDO_TEMPLATE = "<Pedido numero=\"{{numero}}\">"
            + "<Cliente>{{cliente}}</Cliente>"
            + "{{#each itens}}<Item sku=\"{{sku}}\" qtd=\"{{qtd}}\"/>{{/each}}"
            + "</Pedido>";

    private static final String PEDIDO_JSON = "{\"numero\": 123, \"cliente\": \"Silva & Filhos\","
            + " \"itens\": [{\"sku\": \"A1\", \"qtd\": 2}, {\"sku\": \"B7\", \"qtd\": 1}]}";

    private TestRunner runner;

    @TempDir
    File tmp;

    @BeforeEach
    void setUp() {
        runner = TestRunners.newTestRunner(JsonToXmlTemplate.class);
    }

    private void enqueue(String json, String filename) {
        Map<String, String> attrs = new HashMap<>();
        attrs.put("filename", filename);
        runner.enqueue(json.getBytes(StandardCharsets.UTF_8), attrs);
    }

    @Test
    void geraXmlCompletoComParteUnicaELista() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, PEDIDO_TEMPLATE);
        enqueue(PEDIDO_JSON, "pedido-123.json");
        runner.run();

        runner.assertTransferCount(JsonToXmlTemplate.REL_SUCCESS, 1);
        runner.assertTransferCount(JsonToXmlTemplate.REL_ORIGINAL, 1);
        runner.assertTransferCount(JsonToXmlTemplate.REL_FAILURE, 0);
        MockFlowFile xml = runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_SUCCESS).get(0);
        xml.assertContentEquals("<Pedido numero=\"123\"><Cliente>Silva &amp; Filhos</Cliente>"
                + "<Item sku=\"A1\" qtd=\"2\"/><Item sku=\"B7\" qtd=\"1\"/></Pedido>");
        xml.assertAttributeEquals("filename", "pedido-123.xml");
        xml.assertAttributeEquals("mime.type", "application/xml");
        runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_ORIGINAL).get(0).assertContentEquals(PEDIDO_JSON);
    }

    @Test
    void umXmlPorItemSubstituiSplitJson() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, "<Pedido seq=\"{{@number}}/{{@count}}\" numero=\"{{numero}}\"/>");
        runner.setProperty(JsonToXmlTemplate.MODE, "per-item");
        enqueue("[{\"numero\": 1}, {\"numero\": 2}, {\"numero\": 3}]", "lote.json");
        runner.run();

        runner.assertTransferCount(JsonToXmlTemplate.REL_SUCCESS, 3);
        MockFlowFile second = runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_SUCCESS).get(1);
        second.assertContentEquals("<Pedido seq=\"2/3\" numero=\"2\"/>");
        second.assertAttributeEquals("filename", "lote-2.xml");
        second.assertAttributeEquals("fragment.index", "1");
        second.assertAttributeEquals("fragment.count", "3");
    }

    @Test
    void jsonInvalidoVaiParaFailureComMotivo() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, PEDIDO_TEMPLATE);
        enqueue("{'numero': 1", "x.json");
        runner.run();

        runner.assertAllFlowFilesTransferred(JsonToXmlTemplate.REL_FAILURE, 1);
        MockFlowFile ff = runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_FAILURE).get(0);
        ff.assertContentEquals("{'numero': 1");
        assertTrue(ff.getAttribute("xml.template.error").contains("JSON inválido"));
    }

    @Test
    void templateComErroDeSintaxeDeixaProcessorInvalido() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, "<a>{{#each itens}}<i/></a>");
        runner.assertNotValid();
    }

    @Test
    void exigeTemplateOuArquivoMasNaoOsDois() {
        runner.assertNotValid();
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, "<a/>");
        runner.setProperty(JsonToXmlTemplate.TEMPLATE_FILE, "/tmp/x.xml");
        runner.assertNotValid();
    }

    @Test
    void templateEmArquivoEscolhidoPorAtributo() throws Exception {
        Files.write(new File(tmp, "pedido.xml").toPath(), PEDIDO_TEMPLATE.getBytes(StandardCharsets.UTF_8));
        runner.setProperty(JsonToXmlTemplate.TEMPLATE_FILE, tmp.getAbsolutePath() + "/${tipo}.xml");
        Map<String, String> attrs = new HashMap<>();
        attrs.put("tipo", "pedido");
        runner.enqueue(PEDIDO_JSON.getBytes(StandardCharsets.UTF_8), attrs);
        runner.run();

        runner.assertTransferCount(JsonToXmlTemplate.REL_SUCCESS, 1);
    }

    @Test
    void campoAusenteNoModoFalhar() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, "<a>{{cliente.cnpj}}</a>");
        runner.setProperty(JsonToXmlTemplate.MISSING_FIELD, "fail");
        enqueue("{\"cliente\": {}}", "x.json");
        runner.run();

        MockFlowFile ff = runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_FAILURE).get(0);
        assertTrue(ff.getAttribute("xml.template.error").contains("cliente.cnpj"));
    }

    @Test
    void removeElementosVazios() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE,
                "<P>\n  <Nome>{{nome}}</Nome>\n  <Complemento>{{complemento}}</Complemento>\n  <End><Rua>{{rua}}</Rua></End>\n</P>");
        runner.setProperty(JsonToXmlTemplate.REMOVE_EMPTY, "true");
        enqueue("{\"nome\": \"Ana\"}", "x.json");
        runner.run();

        runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_SUCCESS).get(0)
                .assertContentEquals("<P>\n  <Nome>Ana</Nome>\n</P>");
    }

    @Test
    void xmlGeradoInvalidoVaiParaFailure() {
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, "<a>{{{trecho}}}</a>");
        enqueue("{\"trecho\": \"<b>sem fechar\"}", "x.json");
        runner.run();

        MockFlowFile ff = runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_FAILURE).get(0);
        assertTrue(ff.getAttribute("xml.template.error").contains("não é válido"));
    }

    @Test
    void validacaoXsd() {
        String xsd = new File("src/test/resources/pedido.xsd").getAbsolutePath();
        runner.setProperty(JsonToXmlTemplate.TEMPLATE, PEDIDO_TEMPLATE);
        runner.setProperty(JsonToXmlTemplate.XSD_FILE, xsd);

        enqueue(PEDIDO_JSON, "ok.json");
        enqueue("{\"numero\": 1, \"cliente\": \"Ana\", \"itens\": [{\"sku\": \"A1\", \"qtd\": 0}]}", "qtd-zero.json");
        runner.run(2);

        runner.assertTransferCount(JsonToXmlTemplate.REL_SUCCESS, 1);
        runner.assertTransferCount(JsonToXmlTemplate.REL_FAILURE, 1);
        MockFlowFile bad = runner.getFlowFilesForRelationship(JsonToXmlTemplate.REL_FAILURE).get(0);
        assertTrue(bad.getAttribute("xml.template.error").contains("XSD"), bad.getAttribute("xml.template.error"));
    }
}
