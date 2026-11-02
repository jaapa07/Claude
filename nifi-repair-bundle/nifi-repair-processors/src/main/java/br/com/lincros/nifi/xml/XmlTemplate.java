package br.com.lincros.nifi.xml;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Template XML com marcações no estilo Handlebars.
 *
 * <pre>
 * {{campo}}  {{a.b.c}}  {{lista[0].x}}  {{lista.length}}   valor (escapado para XML)
 * {{{campo}}}                                             valor sem escape (XML pronto)
 * {{campo | upper | default:'N/A'}}                       filtros
 * {{#each itens}} ... {{else}} ... {{/each}}              repete para cada item
 * {{#if campo}} {{#if valor > 0}} ... {{else}} ... {{/if}} condição
 * {{#unless campo}} ... {{/unless}}                       condição negada
 * {{#with cliente}} ... {{/with}}                         muda o contexto
 * {{@index}} {{@number}} {{@first}} {{@last}} {{@count}} {{@key}}   dados do laço
 * {{../campo}} {{@root.campo}} {{@attr.filename}}         pai, raiz, atributo do FlowFile
 * {{! comentário }}
 * </pre>
 *
 * Dentro de um laço, um campo que não existe no item é procurado nos níveis de cima,
 * então a parte única (ex.: número do pedido) pode ser usada dentro da lista.
 */
public final class XmlTemplate {

    /** Opções de renderização. */
    public static final class Options {
        /** Falha se um campo usado no template não existir no JSON (sem filtro default). */
        public boolean failOnMissing = false;
        /** Fuso usado pelo filtro date quando a data não tem fuso. */
        public ZoneId zone = ZoneId.of("America/Sao_Paulo");
    }

    static final Object MISSING = new Object();
    private static final char LINE_MARK = '\u0000';

    private static final Pattern COMPARISON = Pattern.compile("^(.+?)\\s*(==|!=|>=|<=|>|<)\\s*(.+)$");
    private static final Pattern NUMBER_LITERAL = Pattern.compile("-?\\d+(\\.\\d+)?");

    private final List<Node> nodes;

    private XmlTemplate(List<Node> nodes) {
        this.nodes = nodes;
    }

    // ================================================================== compilação

    public static XmlTemplate compile(String template) throws TemplateException {
        String text = stripStandaloneLines(template);
        Parser p = new Parser(text);
        List<Node> nodes = p.parse();
        return new XmlTemplate(nodes);
    }

    /** Linhas que só têm marcações de bloco ({{#each}}, {{/if}}...) não geram linha em branco na saída. */
    static String stripStandaloneLines(String template) {
        String[] lines = template.split("\n", -1);
        StringBuilder sb = new StringBuilder(template.length());
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String check = line.endsWith("\r") ? line.substring(0, line.length() - 1) : line;
            boolean last = i == lines.length - 1;
            if (!check.trim().isEmpty() && isOnlyBlockTags(check)) {
                // marcador invisível no lugar da quebra de linha: mantém a contagem de linhas para mensagens de erro
                sb.append(check.trim());
                if (!last) {
                    sb.append(LINE_MARK);
                }
            } else {
                sb.append(line);
                if (!last) {
                    sb.append('\n');
                }
            }
        }
        return sb.toString();
    }

    private static boolean isOnlyBlockTags(String line) {
        String rest = line.trim();
        while (!rest.isEmpty()) {
            if (!rest.startsWith("{{")) {
                return false;
            }
            int end = rest.indexOf("}}");
            if (end < 0) {
                return false;
            }
            String inner = rest.substring(2, end).trim();
            boolean block = inner.startsWith("#") || inner.startsWith("/") || inner.startsWith("!") || inner.equals("else");
            if (!block) {
                return false;
            }
            rest = rest.substring(end + 2).trim();
        }
        return true;
    }

    private static final class Parser {
        private final String s;
        private int pos;

        Parser(String s) {
            this.s = s;
        }

        private int lineAt(int at) {
            int line = 1;
            for (int i = 0; i < at && i < s.length(); i++) {
                if (s.charAt(i) == '\n' || s.charAt(i) == LINE_MARK) {
                    line++;
                }
            }
            return line;
        }

        List<Node> parse() throws TemplateException {
            List<Node> root = new ArrayList<>();
            List<Block> stack = new ArrayList<>();
            List<Node> current = root;
            while (pos < s.length()) {
                int open = s.indexOf("{{", pos);
                if (open < 0) {
                    current.add(new Text(s.substring(pos)));
                    break;
                }
                if (open > pos) {
                    current.add(new Text(s.substring(pos, open)));
                }
                int line = lineAt(open);
                boolean raw = s.startsWith("{{{", open);
                int close = s.indexOf(raw ? "}}}" : "}}", open + (raw ? 3 : 2));
                if (close < 0) {
                    throw new TemplateException("Marcação aberta sem '}}' na linha " + line);
                }
                String inner = s.substring(open + (raw ? 3 : 2), close).trim();
                pos = close + (raw ? 3 : 2);

                if (inner.startsWith("!")) {
                    continue;
                }
                if (raw) {
                    current.add(new Var(Expr.parse(inner, line), true, line));
                    continue;
                }
                if (inner.startsWith("#")) {
                    String[] parts = inner.substring(1).trim().split("\\s+", 2);
                    String kind = parts[0];
                    if (!kind.equals("each") && !kind.equals("if") && !kind.equals("unless") && !kind.equals("with")) {
                        throw new TemplateException("Bloco desconhecido '#" + kind + "' na linha " + line
                                + " (use #each, #if, #unless ou #with)");
                    }
                    if (parts.length < 2 || parts[1].trim().isEmpty()) {
                        throw new TemplateException("'#" + kind + "' sem campo na linha " + line);
                    }
                    Block b = new Block(kind, parts[1].trim(), line);
                    current.add(b);
                    stack.add(b);
                    current = b.body;
                    continue;
                }
                if (inner.equals("else")) {
                    if (stack.isEmpty()) {
                        throw new TemplateException("'{{else}}' fora de um bloco na linha " + line);
                    }
                    Block b = stack.get(stack.size() - 1);
                    if (b.inElse) {
                        throw new TemplateException("'{{else}}' repetido na linha " + line);
                    }
                    b.inElse = true;
                    current = b.elseBody;
                    continue;
                }
                if (inner.startsWith("/")) {
                    String kind = inner.substring(1).trim();
                    if (stack.isEmpty()) {
                        throw new TemplateException("'{{/" + kind + "}}' sem abertura na linha " + line);
                    }
                    Block b = stack.remove(stack.size() - 1);
                    if (!b.kind.equals(kind)) {
                        throw new TemplateException("'{{/" + kind + "}}' na linha " + line + " fecha o bloco '#"
                                + b.kind + "' aberto na linha " + b.line);
                    }
                    current = stack.isEmpty() ? root : (stack.get(stack.size() - 1).inElse
                            ? stack.get(stack.size() - 1).elseBody : stack.get(stack.size() - 1).body);
                    continue;
                }
                if (inner.isEmpty()) {
                    throw new TemplateException("Marcação vazia '{{}}' na linha " + line);
                }
                current.add(new Var(Expr.parse(inner, line), false, line));
            }
            if (!stack.isEmpty()) {
                Block b = stack.get(stack.size() - 1);
                throw new TemplateException("Bloco '#" + b.kind + "' aberto na linha " + b.line
                        + " não foi fechado com '{{/" + b.kind + "}}'");
            }
            return root;
        }
    }

    // ================================================================== renderização

    /** Gera o XML a partir dos dados (árvore do {@link JsonTree}). */
    public String render(Object data, Map<String, String> attributes, Options options) throws TemplateException {
        return render(data, attributes, options, Collections.<String, Object>emptyMap());
    }

    String render(Object data, Map<String, String> attributes, Options options, Map<String, Object> rootData)
            throws TemplateException {
        Ctx ctx = new Ctx(data, attributes == null ? Collections.<String, String>emptyMap() : attributes, options);
        StringBuilder out = new StringBuilder();
        Frame root = new Frame(data, null, rootData);
        for (Node n : nodes) {
            n.render(ctx, root, out);
        }
        return out.toString();
    }

    private static final class Ctx {
        final Object root;
        final Map<String, String> attributes;
        final Options options;

        Ctx(Object root, Map<String, String> attributes, Options options) {
            this.root = root;
            this.attributes = attributes;
            this.options = options;
        }
    }

    private static final class Frame {
        final Object value;
        final Frame parent;
        final Map<String, Object> data;

        Frame(Object value, Frame parent, Map<String, Object> data) {
            this.value = value;
            this.parent = parent;
            this.data = data;
        }
    }

    private interface Node {
        void render(Ctx ctx, Frame frame, StringBuilder out) throws TemplateException;
    }

    private static final class Text implements Node {
        final String text;

        Text(String text) {
            this.text = text.replace(String.valueOf(LINE_MARK), "");
        }

        @Override
        public void render(Ctx ctx, Frame frame, StringBuilder out) {
            out.append(text);
        }
    }

    private static final class Var implements Node {
        final Expr expr;
        final boolean raw;
        final int line;

        Var(Expr expr, boolean raw, int line) {
            this.expr = expr;
            this.raw = raw;
            this.line = line;
        }

        @Override
        public void render(Ctx ctx, Frame frame, StringBuilder out) throws TemplateException {
            Object v = expr.evaluate(ctx, frame, line);
            if (v == MISSING) {
                if (ctx.options.failOnMissing) {
                    throw new TemplateException("Campo '" + expr.path.text + "' não existe no JSON (linha "
                            + line + " do template). Use {{" + expr.path.text + " | default:''}} se for opcional.");
                }
                return;
            }
            String text = toText(v);
            out.append(raw ? text : escapeXml(text));
        }
    }

    private static final class Block implements Node {
        final String kind;
        final String exprText;
        final int line;
        final List<Node> body = new ArrayList<>();
        final List<Node> elseBody = new ArrayList<>();
        boolean inElse;
        private Condition condition;
        private Path path;

        Block(String kind, String exprText, int line) throws TemplateException {
            this.kind = kind;
            this.exprText = exprText;
            this.line = line;
            if (kind.equals("if") || kind.equals("unless")) {
                condition = Condition.parse(exprText, line);
            } else {
                path = Path.parse(exprText, line);
            }
        }

        @Override
        public void render(Ctx ctx, Frame frame, StringBuilder out) throws TemplateException {
            switch (kind) {
                case "if":
                    renderAll(condition.test(ctx, frame) ? body : elseBody, ctx, frame, out);
                    return;
                case "unless":
                    renderAll(condition.test(ctx, frame) ? elseBody : body, ctx, frame, out);
                    return;
                case "with": {
                    Object v = path.resolve(ctx, frame);
                    if (truthy(v)) {
                        renderAll(body, ctx, new Frame(v, frame, Collections.<String, Object>emptyMap()), out);
                    } else {
                        renderAll(elseBody, ctx, frame, out);
                    }
                    return;
                }
                default:
                    renderEach(ctx, frame, out);
            }
        }

        @SuppressWarnings("unchecked")
        private void renderEach(Ctx ctx, Frame frame, StringBuilder out) throws TemplateException {
            Object v = path.resolve(ctx, frame);
            List<Object> items;
            if (v == MISSING || v == JsonTree.NULL) {
                items = Collections.emptyList();
            } else if (v instanceof List) {
                items = (List<Object>) v;
            } else {
                // um único objeto onde se esperava lista (comum em JSON vindo de XML): trata como lista de 1
                items = Collections.singletonList(v);
            }
            if (items.isEmpty()) {
                renderAll(elseBody, ctx, frame, out);
                return;
            }
            int count = items.size();
            for (int i = 0; i < count; i++) {
                Map<String, Object> data = new HashMap<>();
                data.put("index", new JsonTree.Num(String.valueOf(i)));
                data.put("number", new JsonTree.Num(String.valueOf(i + 1)));
                data.put("first", i == 0);
                data.put("last", i == count - 1);
                data.put("count", new JsonTree.Num(String.valueOf(count)));
                renderAll(body, ctx, new Frame(items.get(i), frame, data), out);
            }
        }
    }

    private static void renderAll(List<Node> nodes, Ctx ctx, Frame frame, StringBuilder out) throws TemplateException {
        for (Node n : nodes) {
            n.render(ctx, frame, out);
        }
    }

    // ================================================================== caminhos

    private static final class Path {
        final String text;
        int ups;
        boolean root;
        String attribute;
        String dataVar;
        final List<Object> segments = new ArrayList<>();

        private Path(String text) {
            this.text = text;
        }

        static Path parse(String raw, int line) throws TemplateException {
            String t = raw.trim();
            Path p = new Path(t);
            if (t.startsWith("@attr.")) {
                p.attribute = t.substring(6);
                if (p.attribute.isEmpty()) {
                    throw new TemplateException("'@attr.' sem nome de atributo na linha " + line);
                }
                return p;
            }
            if (t.startsWith("@root")) {
                p.root = true;
                t = t.substring(5);
                if (t.startsWith(".")) {
                    t = t.substring(1);
                }
            } else if (t.startsWith("@")) {
                p.dataVar = t.substring(1);
                if (!p.dataVar.matches("index|number|first|last|count")) {
                    throw new TemplateException("Variável '" + raw + "' desconhecida na linha " + line
                            + " (use @index, @number, @first, @last, @count, @root ou @attr)");
                }
                return p;
            }
            while (t.startsWith("../")) {
                p.ups++;
                t = t.substring(3);
            }
            if (t.equals("..")) {
                p.ups++;
                t = "";
            }
            if (t.equals("this") || t.equals(".")) {
                t = "";
            } else if (t.startsWith("this.")) {
                t = t.substring(5);
            }
            if (!t.isEmpty()) {
                for (String part : t.split("\\.")) {
                    if (part.isEmpty()) {
                        throw new TemplateException("Caminho inválido '" + raw + "' na linha " + line);
                    }
                    Matcher m = Pattern.compile("^([^\\[]*)((\\[\\d+\\])*)$").matcher(part);
                    if (!m.matches()) {
                        throw new TemplateException("Caminho inválido '" + raw + "' na linha " + line);
                    }
                    if (!m.group(1).isEmpty()) {
                        p.segments.add(m.group(1));
                    }
                    Matcher idx = Pattern.compile("\\[(\\d+)\\]").matcher(m.group(2));
                    while (idx.find()) {
                        p.segments.add(Integer.parseInt(idx.group(1)));
                    }
                }
            }
            return p;
        }

        Object resolve(Ctx ctx, Frame frame) {
            if (attribute != null) {
                String v = ctx.attributes.get(attribute);
                return v == null ? MISSING : v;
            }
            if (dataVar != null) {
                for (Frame f = frame; f != null; f = f.parent) {
                    if (f.data.containsKey(dataVar)) {
                        return f.data.get(dataVar);
                    }
                }
                return MISSING;
            }
            if (root) {
                return walk(ctx.root, 0);
            }
            Frame f = frame;
            for (int i = 0; i < ups && f.parent != null; i++) {
                f = f.parent;
            }
            if (segments.isEmpty()) {
                return f.value;
            }
            if (ups > 0) {
                return walk(f.value, 0);
            }
            // procura o primeiro nível do caminho no item atual e, se não achar, nos níveis de cima
            for (Frame cur = f; cur != null; cur = cur.parent) {
                Object first = get(cur.value, segments.get(0));
                if (first != MISSING) {
                    return walk(first, 1);
                }
            }
            return MISSING;
        }

        private Object walk(Object start, int from) {
            Object v = start;
            for (int i = from; i < segments.size(); i++) {
                v = get(v, segments.get(i));
                if (v == MISSING) {
                    return MISSING;
                }
            }
            return v;
        }

        @SuppressWarnings("unchecked")
        private static Object get(Object obj, Object seg) {
            if (obj instanceof Map) {
                Map<String, Object> map = (Map<String, Object>) obj;
                if (seg instanceof String && map.containsKey(seg)) {
                    return map.get(seg);
                }
                return MISSING;
            }
            if (obj instanceof List) {
                List<Object> list = (List<Object>) obj;
                if (seg instanceof Integer) {
                    int i = (Integer) seg;
                    return i < list.size() ? list.get(i) : MISSING;
                }
                if ("length".equals(seg) || "size".equals(seg)) {
                    return new JsonTree.Num(String.valueOf(list.size()));
                }
                return MISSING;
            }
            if (obj instanceof String && ("length".equals(seg) || "size".equals(seg))) {
                return new JsonTree.Num(String.valueOf(((String) obj).length()));
            }
            return MISSING;
        }
    }

    // ================================================================== expressões e filtros

    private static final class Filter {
        final String name;
        final List<String> args;

        Filter(String name, List<String> args) {
            this.name = name;
            this.args = args;
        }
    }

    private static final class Expr {
        Path path;
        final List<Filter> filters = new ArrayList<>();

        static Expr parse(String raw, int line) throws TemplateException {
            List<String> parts = splitOutsideQuotes(raw, '|');
            Expr e = new Expr();
            e.path = Path.parse(parts.get(0), line);
            for (int i = 1; i < parts.size(); i++) {
                List<String> f = splitOutsideQuotes(parts.get(i).trim(), ':');
                String name = f.get(0).trim();
                List<String> args = new ArrayList<>();
                for (int k = 1; k < f.size(); k++) {
                    args.add(unquote(f.get(k).trim()));
                }
                checkFilter(name, args.size(), line);
                e.filters.add(new Filter(name, args));
            }
            return e;
        }

        Object evaluate(Ctx ctx, Frame frame, int line) throws TemplateException {
            Object v = path.resolve(ctx, frame);
            for (Filter f : filters) {
                v = applyFilter(f, v, ctx, line);
            }
            return v;
        }
    }

    private static void checkFilter(String name, int argc, int line) throws TemplateException {
        int min;
        int max;
        switch (name) {
            case "upper": case "lower": case "trim": case "digits": case "json":
                min = 0; max = 0; break;
            case "default":
                min = 1; max = 1; break;
            case "number": case "truncate":
                min = 1; max = 1; break;
            case "date":
                min = 1; max = 2; break;
            case "lpad": case "rpad":
                min = 1; max = 2; break;
            case "replace":
                min = 2; max = 2; break;
            default:
                throw new TemplateException("Filtro '" + name + "' desconhecido na linha " + line
                        + " (disponíveis: default, upper, lower, trim, number, date, digits, lpad, rpad, truncate, replace, json)");
        }
        if (argc < min || argc > max) {
            throw new TemplateException("Filtro '" + name + "' com número errado de argumentos na linha " + line);
        }
    }

    private static Object applyFilter(Filter f, Object v, Ctx ctx, int line) throws TemplateException {
        if (f.name.equals("default")) {
            return isEmptyValue(v) ? f.args.get(0) : v;
        }
        if (v == MISSING || v == JsonTree.NULL) {
            return v;
        }
        String s = toText(v);
        switch (f.name) {
            case "upper": return s.toUpperCase(Locale.ROOT);
            case "lower": return s.toLowerCase(Locale.ROOT);
            case "trim": return s.trim();
            case "digits": return s.replaceAll("\\D", "");
            case "json": return JsonTree.toJson(v);
            case "truncate": {
                int n = intArg(f, 0, line);
                return s.length() <= n ? s : s.substring(0, n);
            }
            case "lpad": case "rpad": {
                int n = intArg(f, 0, line);
                String pad = f.args.size() > 1 && !f.args.get(1).isEmpty() ? f.args.get(1) : (f.name.equals("lpad") ? "0" : " ");
                StringBuilder sb = new StringBuilder(s);
                while (sb.length() < n) {
                    if (f.name.equals("lpad")) {
                        sb.insert(0, pad);
                    } else {
                        sb.append(pad);
                    }
                }
                return sb.toString();
            }
            case "replace": return s.replace(f.args.get(0), f.args.get(1));
            case "number": {
                int scale = intArg(f, 0, line);
                BigDecimal d = parseDecimal(s);
                if (d == null) {
                    throw new TemplateException("Filtro number: '" + s + "' não é um número (linha " + line + ")");
                }
                return d.setScale(scale, RoundingMode.HALF_UP).toPlainString();
            }
            case "date":
                return formatDate(s, f.args.get(0), f.args.size() > 1 ? f.args.get(1) : null, ctx.options.zone, line);
            default:
                return v;
        }
    }

    private static int intArg(Filter f, int i, int line) throws TemplateException {
        try {
            return Integer.parseInt(f.args.get(i));
        } catch (NumberFormatException e) {
            throw new TemplateException("Filtro '" + f.name + "' espera um número inteiro (linha " + line + ")");
        }
    }

    static BigDecimal parseDecimal(String s) {
        String t = s.trim();
        if (t.contains(",") && !t.contains(".")) {
            t = t.replace(',', '.');
        } else if (t.contains(",") && t.contains(".")) {
            // 1.234,56 (padrão brasileiro) ou 1,234.56 (padrão americano)
            t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(".", "").replace(',', '.') : t.replace(",", "");
        }
        try {
            return new BigDecimal(t);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static final String[] INPUT_DATE_PATTERNS = {
        "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm", "dd/MM/yyyy", "yyyy-MM-dd HH:mm:ss", "yyyyMMdd"
    };

    static String formatDate(String value, String outPattern, String inPattern, ZoneId zone, int line)
            throws TemplateException {
        DateTimeFormatter out;
        try {
            out = DateTimeFormatter.ofPattern(outPattern);
        } catch (IllegalArgumentException e) {
            throw new TemplateException("Filtro date: formato '" + outPattern + "' inválido (linha " + line + ")");
        }
        ZonedDateTime zdt = parseDate(value.trim(), inPattern, zone);
        if (zdt == null) {
            throw new TemplateException("Filtro date: não reconheci a data '" + value + "' (linha " + line
                    + "). Informe o formato de entrada, ex.: date:'dd/MM/yyyy':'yyyyMMdd'");
        }
        try {
            return zdt.format(out);
        } catch (RuntimeException e) {
            throw new TemplateException("Filtro date: não foi possível formatar '" + value + "' como '"
                    + outPattern + "' (linha " + line + ")");
        }
    }

    private static ZonedDateTime parseDate(String v, String inPattern, ZoneId zone) {
        if (inPattern != null) {
            DateTimeFormatter f = DateTimeFormatter.ofPattern(inPattern);
            try {
                return ZonedDateTime.parse(v, f);
            } catch (DateTimeParseException ignored) {
                // tenta sem fuso
            }
            try {
                return LocalDateTime.parse(v, f).atZone(zone);
            } catch (DateTimeParseException ignored) {
                // tenta só data
            }
            try {
                return LocalDate.parse(v, f).atStartOfDay(zone);
            } catch (DateTimeParseException e) {
                return null;
            }
        }
        try {
            return OffsetDateTime.parse(v).toZonedDateTime();
        } catch (DateTimeParseException ignored) {
            // próximo formato
        }
        try {
            return LocalDateTime.parse(v).atZone(zone);
        } catch (DateTimeParseException ignored) {
            // próximo formato
        }
        try {
            return LocalDate.parse(v).atStartOfDay(zone);
        } catch (DateTimeParseException ignored) {
            // próximo formato
        }
        for (String p : INPUT_DATE_PATTERNS) {
            DateTimeFormatter f = DateTimeFormatter.ofPattern(p);
            try {
                return LocalDateTime.parse(v, f).atZone(zone);
            } catch (DateTimeParseException ignored) {
                // tenta como data
            }
            try {
                return LocalDate.parse(v, f).atStartOfDay(zone);
            } catch (DateTimeParseException ignored) {
                // próximo
            }
        }
        if (v.matches("\\d{12,13}")) {
            return Instant.ofEpochMilli(Long.parseLong(v)).atZone(zone);
        }
        return null;
    }

    // ================================================================== condições

    private static final class Condition {
        Path left;
        String op;
        Path rightPath;
        Object rightLiteral;

        static Condition parse(String raw, int line) throws TemplateException {
            Condition c = new Condition();
            Matcher m = COMPARISON.matcher(raw.trim());
            if (!m.matches() || isQuoted(m.group(1).trim())) {
                c.left = Path.parse(raw, line);
                return c;
            }
            c.left = Path.parse(m.group(1), line);
            c.op = m.group(2);
            String r = m.group(3).trim();
            if (isQuoted(r)) {
                c.rightLiteral = unquote(r);
            } else if (NUMBER_LITERAL.matcher(r).matches()) {
                c.rightLiteral = new JsonTree.Num(r);
            } else if (r.equals("true") || r.equals("false")) {
                c.rightLiteral = Boolean.valueOf(r);
            } else if (r.equals("null")) {
                c.rightLiteral = JsonTree.NULL;
            } else {
                c.rightPath = Path.parse(r, line);
            }
            return c;
        }

        boolean test(Ctx ctx, Frame frame) {
            Object a = left.resolve(ctx, frame);
            if (op == null) {
                return truthy(a);
            }
            Object b = rightPath != null ? rightPath.resolve(ctx, frame) : rightLiteral;
            boolean aNull = a == MISSING || a == JsonTree.NULL;
            boolean bNull = b == MISSING || b == JsonTree.NULL;
            if (aNull || bNull) {
                if (op.equals("==")) {
                    return aNull && bNull;
                }
                if (op.equals("!=")) {
                    return aNull != bNull;
                }
                return false;
            }
            String sa = toText(a);
            String sb = toText(b);
            int cmp;
            BigDecimal da = numericOrNull(a, sa);
            BigDecimal db = numericOrNull(b, sb);
            if (da != null && db != null) {
                cmp = da.compareTo(db);
            } else {
                cmp = sa.compareTo(sb);
            }
            switch (op) {
                case "==": return cmp == 0;
                case "!=": return cmp != 0;
                case ">": return cmp > 0;
                case "<": return cmp < 0;
                case ">=": return cmp >= 0;
                default: return cmp <= 0;
            }
        }

        private static BigDecimal numericOrNull(Object v, String s) {
            if (v instanceof JsonTree.Num || NUMBER_LITERAL.matcher(s.trim()).matches()) {
                try {
                    return new BigDecimal(s.trim());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
            return null;
        }
    }

    // ================================================================== utilitários

    static boolean truthy(Object v) {
        if (v == MISSING || v == JsonTree.NULL || v == null) {
            return false;
        }
        if (v instanceof Boolean) {
            return (Boolean) v;
        }
        if (v instanceof String) {
            return !((String) v).isEmpty();
        }
        if (v instanceof List) {
            return !((List<?>) v).isEmpty();
        }
        if (v instanceof Map) {
            return !((Map<?, ?>) v).isEmpty();
        }
        return true;
    }

    private static boolean isEmptyValue(Object v) {
        return v == MISSING || v == JsonTree.NULL || v == null || (v instanceof String && ((String) v).isEmpty());
    }

    static String toText(Object v) {
        if (v instanceof String) {
            return (String) v;
        }
        if (v instanceof Map || v instanceof List) {
            return JsonTree.toJson(v);
        }
        if (v == JsonTree.NULL || v == MISSING || v == null) {
            return "";
        }
        return v.toString();
    }

    /** Escapa para texto ou atributo XML e remove caracteres proibidos em XML 1.0. */
    public static String escapeXml(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&': sb.append("&amp;"); break;
                case '<': sb.append("&lt;"); break;
                case '>': sb.append("&gt;"); break;
                case '"': sb.append("&quot;"); break;
                case '\'': sb.append("&apos;"); break;
                default:
                    if ((c < 0x20 && c != '\t' && c != '\n' && c != '\r') || c == '￾' || c == '￿') {
                        break;
                    }
                    sb.append(c);
            }
        }
        return sb.toString();
    }

    private static List<String> splitOutsideQuotes(String s, char sep) {
        List<String> parts = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        char quote = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (quote != 0) {
                cur.append(c);
                if (c == quote) {
                    quote = 0;
                }
            } else if (c == '\'' || c == '"') {
                quote = c;
                cur.append(c);
            } else if (c == sep) {
                parts.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        parts.add(cur.toString());
        return parts;
    }

    private static boolean isQuoted(String s) {
        return s.length() >= 2 && ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith("\"") && s.endsWith("\"")));
    }

    private static String unquote(String s) {
        return isQuoted(s) ? s.substring(1, s.length() - 1) : s;
    }
}
