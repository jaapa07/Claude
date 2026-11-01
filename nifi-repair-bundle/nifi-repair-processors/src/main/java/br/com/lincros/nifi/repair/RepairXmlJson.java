package br.com.lincros.nifi.repair;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.nifi.annotation.behavior.InputRequirement;
import org.apache.nifi.annotation.behavior.SideEffectFree;
import org.apache.nifi.annotation.behavior.SupportsBatching;
import org.apache.nifi.annotation.behavior.WritesAttribute;
import org.apache.nifi.annotation.behavior.WritesAttributes;
import org.apache.nifi.annotation.documentation.CapabilityDescription;
import org.apache.nifi.annotation.documentation.Tags;
import org.apache.nifi.components.AllowableValue;
import org.apache.nifi.components.PropertyDescriptor;
import org.apache.nifi.components.ValidationResult;
import org.apache.nifi.flowfile.FlowFile;
import org.apache.nifi.processor.AbstractProcessor;
import org.apache.nifi.processor.ProcessContext;
import org.apache.nifi.processor.ProcessSession;
import org.apache.nifi.processor.ProcessorInitializationContext;
import org.apache.nifi.processor.Relationship;
import org.apache.nifi.processor.exception.ProcessException;

@SupportsBatching
@SideEffectFree
@InputRequirement(InputRequirement.Requirement.INPUT_REQUIRED)
@Tags({"json", "xml", "repair", "fix", "sanitize", "clean", "etl", "corrigir", "limpar", "aspas", "encoding"})
@CapabilityDescription("Corrige JSON e XML malformados antes que quebrem o fluxo: aspas simples, aspas extras, "
        + "aspas internas sem escape, espaços indevidos, caracteres especiais e de controle, BOM, encoding "
        + "quebrado (SÃ£o -> São), vírgulas faltando ou sobrando, chaves sem aspas, '&' e '<' soltos no XML, "
        + "atributos sem aspas, tags não fechadas e entidades HTML. Documentos já válidos passam intactos. "
        + "O atributo repair.actions lista cada correção aplicada.")
@WritesAttributes({
    @WritesAttribute(attribute = "repair.format", description = "Formato detectado: json ou xml"),
    @WritesAttribute(attribute = "repair.status", description = "valid, repaired, normalized ou failed"),
    @WritesAttribute(attribute = "repair.actions", description = "Correções aplicadas com contagem, ex.: aspas-extras-removidas(2)"),
    @WritesAttribute(attribute = "repair.action.count", description = "Total de correções aplicadas"),
    @WritesAttribute(attribute = "repair.error", description = "Motivo da falha (somente em failure)"),
    @WritesAttribute(attribute = "mime.type", description = "application/json ou application/xml")
})
public class RepairXmlJson extends AbstractProcessor {

    static final AllowableValue FORMAT_AUTO = new AllowableValue("auto", "Automático",
            "Detecta pelo primeiro caractere: '<' = XML, '{' ou '[' = JSON");
    static final AllowableValue FORMAT_JSON = new AllowableValue("json", "JSON", "Trata o conteúdo sempre como JSON");
    static final AllowableValue FORMAT_XML = new AllowableValue("xml", "XML", "Trata o conteúdo sempre como XML");

    static final AllowableValue MODE_INVALID_ONLY = new AllowableValue("invalid-only", "Somente inválidos",
            "Documentos já válidos passam sem nenhuma alteração; só os quebrados são corrigidos");
    static final AllowableValue MODE_ALWAYS = new AllowableValue("always", "Sempre normalizar",
            "Todo documento passa pela limpeza (encoding, espaços, caracteres invisíveis), mesmo se já for válido");

    public static final PropertyDescriptor INPUT_FORMAT = new PropertyDescriptor.Builder()
            .name("input-format")
            .displayName("Formato de entrada")
            .description("Formato do conteúdo do FlowFile.")
            .required(true)
            .allowableValues(FORMAT_AUTO, FORMAT_JSON, FORMAT_XML)
            .defaultValue(FORMAT_AUTO.getValue())
            .build();

    public static final PropertyDescriptor MODE = new PropertyDescriptor.Builder()
            .name("repair-mode")
            .displayName("Modo")
            .description("Define se documentos já válidos também devem ser limpos.")
            .required(true)
            .allowableValues(MODE_INVALID_ONLY, MODE_ALWAYS)
            .defaultValue(MODE_INVALID_ONLY.getValue())
            .build();

    public static final PropertyDescriptor TRIM_WHITESPACE = new PropertyDescriptor.Builder()
            .name("trim-whitespace")
            .displayName("Remover espaços nas pontas")
            .description("Remove espaços no início e no fim de chaves e valores JSON, de valores de atributos "
                    + "XML e do texto de elementos XML sem filhos. Ex.: \" João \" -> \"João\".")
            .required(true)
            .allowableValues("true", "false")
            .defaultValue("true")
            .build();

    public static final PropertyDescriptor FIX_MOJIBAKE = new PropertyDescriptor.Builder()
            .name("fix-mojibake")
            .displayName("Corrigir acentuação quebrada")
            .description("Corrige texto UTF-8 que foi lido com a codificação errada, como "
                    + "\"SÃ£o Paulo\" -> \"São Paulo\" e \"AÃ§Ãºcar\" -> \"Açúcar\".")
            .required(true)
            .allowableValues("true", "false")
            .defaultValue("true")
            .build();

    public static final PropertyDescriptor PRETTY_JSON = new PropertyDescriptor.Builder()
            .name("pretty-json")
            .displayName("JSON indentado")
            .description("Se verdadeiro, o JSON corrigido sai indentado; senão, sai compacto em uma linha.")
            .required(true)
            .allowableValues("true", "false")
            .defaultValue("false")
            .build();

    public static final PropertyDescriptor XML_WRAPPER = new PropertyDescriptor.Builder()
            .name("xml-wrapper-element")
            .displayName("Elemento agrupador XML")
            .description("Nome do elemento usado para agrupar quando o XML tiver mais de uma raiz.")
            .required(true)
            .defaultValue("root")
            .addValidator((subject, value, ctx) -> new ValidationResult.Builder()
                    .subject(subject)
                    .input(value)
                    .valid(value != null && value.trim().matches("[A-Za-z_][A-Za-z0-9_.\\-]*"))
                    .explanation("deve ser um nome de elemento XML válido, ex.: root")
                    .build())
            .build();

    public static final Relationship REL_SUCCESS = new Relationship.Builder()
            .name("success")
            .description("Documentos válidos ou corrigidos com sucesso (veja repair.status)")
            .build();

    public static final Relationship REL_FAILURE = new Relationship.Builder()
            .name("failure")
            .description("Documentos que não puderam ser corrigidos; conteúdo original mantido (veja repair.error)")
            .build();

    private List<PropertyDescriptor> descriptors;
    private Set<Relationship> relationships;

    @Override
    protected void init(ProcessorInitializationContext context) {
        List<PropertyDescriptor> props = new ArrayList<>();
        props.add(INPUT_FORMAT);
        props.add(MODE);
        props.add(TRIM_WHITESPACE);
        props.add(FIX_MOJIBAKE);
        props.add(PRETTY_JSON);
        props.add(XML_WRAPPER);
        descriptors = Collections.unmodifiableList(props);

        Set<Relationship> rels = new HashSet<>();
        rels.add(REL_SUCCESS);
        rels.add(REL_FAILURE);
        relationships = Collections.unmodifiableSet(rels);
    }

    @Override
    public Set<Relationship> getRelationships() {
        return relationships;
    }

    @Override
    protected List<PropertyDescriptor> getSupportedPropertyDescriptors() {
        return descriptors;
    }

    @Override
    public void onTrigger(ProcessContext context, ProcessSession session) throws ProcessException {
        FlowFile flowFile = session.get();
        if (flowFile == null) {
            return;
        }

        RepairOptions opts = new RepairOptions();
        String format = context.getProperty(INPUT_FORMAT).getValue();
        opts.format = FORMAT_JSON.getValue().equals(format) ? RepairOptions.Format.JSON
                : FORMAT_XML.getValue().equals(format) ? RepairOptions.Format.XML
                : RepairOptions.Format.AUTO;
        opts.mode = MODE_ALWAYS.getValue().equals(context.getProperty(MODE).getValue())
                ? RepairOptions.Mode.ALWAYS_NORMALIZE : RepairOptions.Mode.REPAIR_INVALID_ONLY;
        opts.trimWhitespace = context.getProperty(TRIM_WHITESPACE).asBoolean();
        opts.fixMojibake = context.getProperty(FIX_MOJIBAKE).asBoolean();
        opts.prettyJson = context.getProperty(PRETTY_JSON).asBoolean();
        opts.xmlWrapperElement = context.getProperty(XML_WRAPPER).getValue();

        final byte[][] holder = new byte[1][];
        session.read(flowFile, in -> holder[0] = readAll(in));
        Repairer.Outcome outcome = Repairer.process(holder[0], opts);

        Map<String, String> attrs = new HashMap<>();
        attrs.put("repair.status", outcome.status.name().toLowerCase());
        attrs.put("repair.actions", outcome.log.summary());
        attrs.put("repair.action.count", String.valueOf(outcome.log.totalCount()));
        if (outcome.format != null) {
            String fmt = outcome.format.name().toLowerCase();
            attrs.put("repair.format", fmt);
            attrs.put("mime.type", "json".equals(fmt) ? "application/json" : "application/xml");
        }

        if (outcome.status == Repairer.Status.FAILED) {
            attrs.put("repair.error", outcome.error);
            flowFile = session.putAllAttributes(flowFile, attrs);
            getLogger().warn("Não foi possível corrigir {}: {}", flowFile, outcome.error);
            session.transfer(flowFile, REL_FAILURE);
            return;
        }

        if (outcome.status != Repairer.Status.VALID) {
            final byte[] content = outcome.content;
            flowFile = session.write(flowFile, out -> out.write(content));
            session.getProvenanceReporter().modifyContent(flowFile, "Correções: " + outcome.log.summary());
        }
        flowFile = session.putAllAttributes(flowFile, attrs);
        session.transfer(flowFile, REL_SUCCESS);
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        while ((read = in.read(chunk)) != -1) {
            buffer.write(chunk, 0, read);
        }
        return buffer.toByteArray();
    }
}
