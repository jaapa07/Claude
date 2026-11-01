package br.com.lincros.nifi.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.charset.StandardCharsets;
import org.apache.nifi.util.MockFlowFile;
import org.apache.nifi.util.TestRunner;
import org.apache.nifi.util.TestRunners;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RepairXmlJsonProcessorTest {

    private TestRunner runner;

    @BeforeEach
    void setUp() {
        runner = TestRunners.newTestRunner(RepairXmlJson.class);
    }

    @Test
    void jsonQuebradoECorrigidoEVaiParaSuccess() {
        runner.enqueue("{'nome': 'Ana'', idade: 30,}".getBytes(StandardCharsets.UTF_8));
        runner.run();

        runner.assertAllFlowFilesTransferred(RepairXmlJson.REL_SUCCESS, 1);
        MockFlowFile ff = runner.getFlowFilesForRelationship(RepairXmlJson.REL_SUCCESS).get(0);
        ff.assertContentEquals("{\"nome\":\"Ana\",\"idade\":30}");
        ff.assertAttributeEquals("repair.status", "repaired");
        ff.assertAttributeEquals("repair.format", "json");
        ff.assertAttributeEquals("mime.type", "application/json");
        ff.assertAttributeExists("repair.actions");
        assertEquals(1, runner.getProvenanceEvents().size());
    }

    @Test
    void jsonValidoPassaSemAlteracao() {
        String json = "{ \"a\": 1 }";
        runner.enqueue(json.getBytes(StandardCharsets.UTF_8));
        runner.run();

        MockFlowFile ff = runner.getFlowFilesForRelationship(RepairXmlJson.REL_SUCCESS).get(0);
        ff.assertContentEquals(json);
        ff.assertAttributeEquals("repair.status", "valid");
        ff.assertAttributeEquals("repair.action.count", "0");
        assertEquals(0, runner.getProvenanceEvents().size());
    }

    @Test
    void xmlQuebradoECorrigido() {
        runner.enqueue("<a nome='Silva & Filhos'>x < y</a".getBytes(StandardCharsets.UTF_8));
        runner.run();

        MockFlowFile ff = runner.getFlowFilesForRelationship(RepairXmlJson.REL_SUCCESS).get(0);
        ff.assertContentEquals("<a nome=\"Silva &amp; Filhos\">x &lt; y</a>");
        ff.assertAttributeEquals("repair.status", "repaired");
        ff.assertAttributeEquals("repair.format", "xml");
        ff.assertAttributeEquals("mime.type", "application/xml");
    }

    @Test
    void conteudoIrreconhecivelVaiParaFailureComOriginal() {
        runner.enqueue("isso não é json nem xml".getBytes(StandardCharsets.UTF_8));
        runner.run();

        runner.assertAllFlowFilesTransferred(RepairXmlJson.REL_FAILURE, 1);
        MockFlowFile ff = runner.getFlowFilesForRelationship(RepairXmlJson.REL_FAILURE).get(0);
        ff.assertContentEquals("isso não é json nem xml");
        ff.assertAttributeEquals("repair.status", "failed");
        ff.assertAttributeExists("repair.error");
    }

    @Test
    void formatoForcadoEJsonIndentado() {
        runner.setProperty(RepairXmlJson.INPUT_FORMAT, "json");
        runner.setProperty(RepairXmlJson.PRETTY_JSON, "true");
        runner.enqueue("{a: 1}".getBytes(StandardCharsets.UTF_8));
        runner.run();

        MockFlowFile ff = runner.getFlowFilesForRelationship(RepairXmlJson.REL_SUCCESS).get(0);
        ff.assertContentEquals("{\n  \"a\": 1\n}");
    }

    @Test
    void modoSempreNormalizar() {
        runner.setProperty(RepairXmlJson.MODE, "always");
        runner.enqueue("{\"cidade\": \" SÃ£o Paulo \"}".getBytes(StandardCharsets.UTF_8));
        runner.run();

        MockFlowFile ff = runner.getFlowFilesForRelationship(RepairXmlJson.REL_SUCCESS).get(0);
        ff.assertContentEquals("{\"cidade\":\"São Paulo\"}");
        ff.assertAttributeEquals("repair.status", "normalized");
    }

    @Test
    void processaVariosFlowFilesEmLote() {
        runner.enqueue("{'a': 1}".getBytes(StandardCharsets.UTF_8));
        runner.enqueue("<a>&</a>".getBytes(StandardCharsets.UTF_8));
        runner.enqueue("{\"ok\": true}".getBytes(StandardCharsets.UTF_8));
        runner.run(3);

        runner.assertAllFlowFilesTransferred(RepairXmlJson.REL_SUCCESS, 3);
    }
}
