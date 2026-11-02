package br.com.lincros.nifi.xml;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.nifi.annotation.behavior.InputRequirement;
import org.apache.nifi.annotation.behavior.SideEffectFree;
import org.apache.nifi.annotation.behavior.SupportsBatching;
import org.apache.nifi.annotation.behavior.WritesAttribute;
import org.apache.nifi.annotation.behavior.WritesAttributes;
import org.apache.nifi.annotation.documentation.CapabilityDescription;
import org.apache.nifi.annotation.documentation.SeeAlso;
import org.apache.nifi.annotation.documentation.Tags;
import org.apache.nifi.components.AllowableValue;
import org.apache.nifi.components.PropertyDescriptor;
import org.apache.nifi.components.ValidationContext;
import org.apache.nifi.components.ValidationResult;
import org.apache.nifi.expression.ExpressionLanguageScope;
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
@SeeAlso(classNames = {"br.com.lincros.nifi.repair.RepairXmlJson"})
@Tags({"json", "xml", "template", "convert", "transform", "merge", "converter", "modelo", "array", "lista"})
@CapabilityDescription("Monta um XML completo a partir de um JSON usando um template: a parte única funciona como "
        + "um ReplaceText ({{campo}} é trocado pelo valor do JSON) e as listas são repetidas com "
        + "{{#each lista}} ... {{/each}}, inclusive listas dentro de listas. Substitui fluxos com SplitJson + "
        + "MergeContent: o documento sai completo ou vai para failure, nunca pela metade. Valores são escapados "
        + "automaticamente e o resultado é validado (opcionalmente contra um XSD).")
@WritesAttributes({
    @WritesAttribute(attribute = "mime.type", description = "application/xml"),
    @WritesAttribute(attribute = "filename", description = "Nome original com extensão .xml"),
    @WritesAttribute(attribute = "xml.template.error", description = "Motivo da falha (somente em failure)"),
    @WritesAttribute(attribute = "fragment.identifier", description = "No modo 'um XML por item': id comum aos XMLs do mesmo JSON"),
    @WritesAttribute(attribute = "fragment.index", description = "No modo 'um XML por item': posição do item (começa em 0)"),
    @WritesAttribute(attribute = "fragment.count", description = "No modo 'um XML por item': total de itens")
})
public class JsonToXmlTemplate extends AbstractProcessor {

    static final AllowableValue MODE_DOCUMENT = new AllowableValue("document", "Um XML por JSON",
            "O JSON inteiro gera um único XML (parte única + listas)");
    static final AllowableValue MODE_PER_ITEM = new AllowableValue("per-item", "Um XML por item do array",
            "Se o JSON for um array na raiz, gera um XML para cada item (substitui o SplitJson)");

    static final AllowableValue MISSING_EMPTY = new AllowableValue("empty", "Deixar vazio",
            "Campo inexistente no JSON vira texto vazio");
    static final AllowableValue MISSING_FAIL = new AllowableValue("fail", "Falhar",
            "Campo inexistente no JSON envia o FlowFile para failure (exceto se usar o filtro default)");

    public static final PropertyDescriptor TEMPLATE = new PropertyDescriptor.Builder()
            .name("xml-template")
            .displayName("Template XML")
            .description("O XML de saída com marcações. Parte única: {{campo}}, {{cliente.nome}}. "
                    + "Listas: {{#each itens}}<Item>{{sku}}</Item>{{/each}}. Use este campo OU 'Arquivo de template'.")
            .required(false)
            .addValidator((subject, value, ctx) -> validateTemplateText(subject, value))
            .build();

    public static final PropertyDescriptor TEMPLATE_FILE = new PropertyDescriptor.Builder()
            .name("xml-template-file")
            .displayName("Arquivo de template")
            .description("Caminho de um arquivo com o template. Aceita Expression Language, ex.: "
                    + "/opt/nifi/templates/${tipo.documento}.xml para escolher o template pelo atributo.")
            .required(false)
            .expressionLanguageSupported(ExpressionLanguageScope.FLOWFILE_ATTRIBUTES)
            .addValidator((subject, value, ctx) -> new ValidationResult.Builder().subject(subject).input(value)
                    .valid(value != null && !value.trim().isEmpty()).explanation("informe o caminho do arquivo").build())
            .build();

    public static final PropertyDescriptor MODE = new PropertyDescriptor.Builder()
            .name("output-mode")
            .displayName("Modo de saída")
            .required(true)
            .allowableValues(MODE_DOCUMENT, MODE_PER_ITEM)
            .defaultValue(MODE_DOCUMENT.getValue())
            .build();

    public static final PropertyDescriptor MISSING_FIELD = new PropertyDescriptor.Builder()
            .name("missing-field")
            .displayName("Campo ausente no JSON")
            .description("O que fazer quando o template usa um campo que não veio no JSON.")
            .required(true)
            .allowableValues(MISSING_EMPTY, MISSING_FAIL)
            .defaultValue(MISSING_EMPTY.getValue())
            .build();

    public static final PropertyDescriptor REMOVE_EMPTY = new PropertyDescriptor.Builder()
            .name("remove-empty-elements")
            .displayName("Remover elementos vazios")
            .description("Remove do XML final as tags sem valor e sem atributos, ex.: <Complemento></Complemento>.")
            .required(true)
            .allowableValues("true", "false")
            .defaultValue("false")
            .build();

    public static final PropertyDescriptor XSD_FILE = new PropertyDescriptor.Builder()
            .name("xsd-file")
            .displayName("Arquivo XSD")
            .description("Opcional. Valida o XML gerado contra este XSD antes de enviar para success. "
                    + "Aceita Expression Language.")
            .required(false)
            .expressionLanguageSupported(ExpressionLanguageScope.FLOWFILE_ATTRIBUTES)
            .addValidator((subject, value, ctx) -> new ValidationResult.Builder().subject(subject).input(value)
                    .valid(true).build())
            .build();

    public static final PropertyDescriptor TIME_ZONE = new PropertyDescriptor.Builder()
            .name("time-zone")
            .displayName("Fuso horário")
            .description("Fuso usado pelo filtro date quando a data do JSON não informa fuso.")
            .required(true)
            .defaultValue("America/Sao_Paulo")
            .addValidator((subject, value, ctx) -> {
                boolean ok;
                try {
                    ZoneId.of(value);
                    ok = true;
                } catch (RuntimeException e) {
                    ok = false;
                }
                return new ValidationResult.Builder().subject(subject).input(value).valid(ok)
                        .explanation("fuso inválido, ex.: America/Sao_Paulo").build();
            })
            .build();

    public static final Relationship REL_SUCCESS = new Relationship.Builder()
            .name("success").description("XML gerado com sucesso").build();
    public static final Relationship REL_FAILURE = new Relationship.Builder()
            .name("failure").description("JSON inválido, erro no template ou XML gerado inválido (veja xml.template.error)")
            .build();
    public static final Relationship REL_ORIGINAL = new Relationship.Builder()
            .name("original").description("O JSON original, quando o XML foi gerado com sucesso").build();

    private final Map<String, XmlTemplate> textCache = new ConcurrentHashMap<>();
    private final Map<String, Object[]> fileCache = new ConcurrentHashMap<>();
    private List<PropertyDescriptor> descriptors;
    private Set<Relationship> relationships;

    @Override
    protected void init(ProcessorInitializationContext context) {
        List<PropertyDescriptor> props = new ArrayList<>();
        props.add(TEMPLATE);
        props.add(TEMPLATE_FILE);
        props.add(MODE);
        props.add(MISSING_FIELD);
        props.add(REMOVE_EMPTY);
        props.add(XSD_FILE);
        props.add(TIME_ZONE);
        descriptors = Collections.unmodifiableList(props);
        Set<Relationship> rels = new HashSet<>();
        rels.add(REL_SUCCESS);
        rels.add(REL_FAILURE);
        rels.add(REL_ORIGINAL);
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

    private static ValidationResult validateTemplateText(String subject, String value) {
        ValidationResult.Builder b = new ValidationResult.Builder().subject(subject).input("(template)");
        if (value == null || value.trim().isEmpty()) {
            return b.valid(false).explanation("o template está vazio").build();
        }
        try {
            XmlTemplate.compile(value);
            return b.valid(true).build();
        } catch (TemplateException e) {
            return b.valid(false).explanation(e.getMessage()).build();
        }
    }

    @Override
    protected Collection<ValidationResult> customValidate(ValidationContext context) {
        List<ValidationResult> results = new ArrayList<>();
        boolean hasText = context.getProperty(TEMPLATE).isSet();
        boolean hasFile = context.getProperty(TEMPLATE_FILE).isSet();
        if (hasText == hasFile) {
            results.add(new ValidationResult.Builder().subject("Template")
                    .valid(false)
                    .explanation("preencha 'Template XML' OU 'Arquivo de template' (exatamente um dos dois)")
                    .build());
        }
        return results;
    }

    @Override
    public void onTrigger(ProcessContext context, ProcessSession session) throws ProcessException {
        FlowFile original = session.get();
        if (original == null) {
            return;
        }
        Map<String, String> attrs = original.getAttributes();
        boolean perItem = MODE_PER_ITEM.getValue().equals(context.getProperty(MODE).getValue());
        boolean removeEmpty = context.getProperty(REMOVE_EMPTY).asBoolean();
        String xsd = context.getProperty(XSD_FILE).isSet()
                ? context.getProperty(XSD_FILE).evaluateAttributeExpressions(original).getValue() : null;
        XmlTemplate.Options opts = new XmlTemplate.Options();
        opts.failOnMissing = MISSING_FAIL.getValue().equals(context.getProperty(MISSING_FIELD).getValue());
        opts.zone = ZoneId.of(context.getProperty(TIME_ZONE).getValue());

        List<String> outputs = new ArrayList<>();
        try {
            XmlTemplate template = loadTemplate(context, original);
            final byte[][] holder = new byte[1][];
            session.read(original, in -> holder[0] = readAll(in));
            Object data = JsonTree.parse(new String(holder[0], StandardCharsets.UTF_8));

            List<Object> items;
            if (perItem && data instanceof List) {
                @SuppressWarnings("unchecked")
                List<Object> list = (List<Object>) data;
                items = list;
            } else {
                items = Collections.singletonList(data);
            }
            for (int i = 0; i < items.size(); i++) {
                Map<String, Object> rootData = new HashMap<>();
                if (perItem) {
                    rootData.put("index", new JsonTree.Num(String.valueOf(i)));
                    rootData.put("number", new JsonTree.Num(String.valueOf(i + 1)));
                    rootData.put("count", new JsonTree.Num(String.valueOf(items.size())));
                    rootData.put("first", i == 0);
                    rootData.put("last", i == items.size() - 1);
                }
                String xml = template.render(items.get(i), attrs, opts, rootData);
                XmlPostProcessor.parse(xml);
                if (removeEmpty) {
                    xml = XmlPostProcessor.removeEmptyElements(xml);
                }
                if (xsd != null && !xsd.trim().isEmpty()) {
                    XmlPostProcessor.validateXsd(xml, xsd.trim());
                }
                outputs.add(xml);
            }
        } catch (TemplateException e) {
            FlowFile failed = session.putAttribute(original, "xml.template.error", e.getMessage());
            getLogger().warn("Não foi possível gerar o XML para {}: {}", failed, e.getMessage());
            session.transfer(failed, REL_FAILURE);
            return;
        }

        String baseName = baseName(attrs.get("filename"));
        String fragmentId = UUID.randomUUID().toString();
        for (int i = 0; i < outputs.size(); i++) {
            final byte[] bytes = outputs.get(i).getBytes(StandardCharsets.UTF_8);
            FlowFile child = session.create(original);
            child = session.write(child, out -> out.write(bytes));
            Map<String, String> newAttrs = new HashMap<>();
            newAttrs.put("mime.type", "application/xml");
            if (perItem) {
                newAttrs.put("filename", baseName + "-" + (i + 1) + ".xml");
                newAttrs.put("fragment.identifier", fragmentId);
                newAttrs.put("fragment.index", String.valueOf(i));
                newAttrs.put("fragment.count", String.valueOf(outputs.size()));
            } else {
                newAttrs.put("filename", baseName + ".xml");
            }
            child = session.putAllAttributes(child, newAttrs);
            session.getProvenanceReporter().modifyContent(child, "XML gerado pelo template");
            session.transfer(child, REL_SUCCESS);
        }
        session.transfer(original, REL_ORIGINAL);
    }

    private XmlTemplate loadTemplate(ProcessContext context, FlowFile flowFile) throws TemplateException {
        if (context.getProperty(TEMPLATE).isSet()) {
            String text = context.getProperty(TEMPLATE).getValue();
            XmlTemplate t = textCache.get(text);
            if (t == null) {
                t = XmlTemplate.compile(text);
                if (textCache.size() > 50) {
                    textCache.clear();
                }
                textCache.put(text, t);
            }
            return t;
        }
        String path = context.getProperty(TEMPLATE_FILE).evaluateAttributeExpressions(flowFile).getValue();
        File file = new File(path == null ? "" : path.trim());
        if (!file.isFile()) {
            throw new TemplateException("Arquivo de template não encontrado: " + path);
        }
        Object[] cached = fileCache.get(file.getAbsolutePath());
        if (cached != null && (Long) cached[0] == file.lastModified()) {
            return (XmlTemplate) cached[1];
        }
        try {
            String text = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            XmlTemplate t;
            try {
                t = XmlTemplate.compile(text);
            } catch (TemplateException e) {
                throw new TemplateException("Erro no template " + file.getName() + ": " + e.getMessage());
            }
            if (fileCache.size() > 200) {
                fileCache.clear();
            }
            fileCache.put(file.getAbsolutePath(), new Object[] {file.lastModified(), t});
            return t;
        } catch (IOException e) {
            throw new TemplateException("Não foi possível ler o template " + path + ": " + e.getMessage(), e);
        }
    }

    private static String baseName(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "documento";
        }
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        while ((read = in.read(chunk)) != -1) {
            buffer.write(chunk, 0, read);
        }
        return buffer.toByteArray();
    }
}
