package br.com.lincros.nifi.repair;

import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.xml.sax.ErrorHandler;
import org.xml.sax.InputSource;
import org.xml.sax.SAXParseException;

/**
 * Corrige XML malformado: "&" e "<" soltos no texto, aspas extras ou internas
 * em atributos, atributos sem aspas, espaços dentro das tags, tags não
 * fechadas ou fechadas fora de ordem, entidades HTML (&nbsp; &ccedil;...),
 * lixo antes da declaração, múltiplas raízes e prefixos sem namespace.
 */
public final class XmlRepairer {

    private static final Pattern ENTITY = Pattern.compile("&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{0,31});");
    private static final Pattern DECL_ENCODING = Pattern.compile("encoding\\s*=\\s*[\"']([A-Za-z0-9._\\-]+)[\"']");
    private static final Pattern DECL_STANDALONE = Pattern.compile("standalone\\s*=\\s*[\"'](yes|no)[\"']");
    private static final Map<String, Character> HTML_ENTITIES = new HashMap<>();

    static {
        String[] entities = {
            "nbsp", "\u00A0", "copy", "\u00A9", "reg", "\u00AE", "deg", "\u00B0", "ordm", "\u00BA", "ordf", "\u00AA",
            "sect", "\u00A7", "para", "\u00B6", "middot", "\u00B7", "laquo", "\u00AB", "raquo", "\u00BB",
            "euro", "\u20AC", "pound", "\u00A3", "cent", "\u00A2", "yen", "\u00A5", "trade", "\u2122",
            "ndash", "\u2013", "mdash", "\u2014", "lsquo", "\u2018", "rsquo", "\u2019", "ldquo", "\u201C",
            "rdquo", "\u201D", "hellip", "\u2026", "bull", "\u2022", "times", "\u00D7", "divide", "\u00F7",
            "plusmn", "\u00B1", "sup2", "\u00B2", "sup3", "\u00B3", "frac12", "\u00BD", "frac14", "\u00BC",
            "iexcl", "\u00A1", "iquest", "\u00BF", "micro", "\u00B5",
            "Agrave", "\u00C0", "Aacute", "\u00C1", "Acirc", "\u00C2", "Atilde", "\u00C3", "Auml", "\u00C4",
            "Ccedil", "\u00C7", "Egrave", "\u00C8", "Eacute", "\u00C9", "Ecirc", "\u00CA", "Euml", "\u00CB",
            "Igrave", "\u00CC", "Iacute", "\u00CD", "Icirc", "\u00CE", "Iuml", "\u00CF", "Ntilde", "\u00D1",
            "Ograve", "\u00D2", "Oacute", "\u00D3", "Ocirc", "\u00D4", "Otilde", "\u00D5", "Ouml", "\u00D6",
            "Ugrave", "\u00D9", "Uacute", "\u00DA", "Ucirc", "\u00DB", "Uuml", "\u00DC",
            "agrave", "\u00E0", "aacute", "\u00E1", "acirc", "\u00E2", "atilde", "\u00E3", "auml", "\u00E4",
            "ccedil", "\u00E7", "egrave", "\u00E8", "eacute", "\u00E9", "ecirc", "\u00EA", "euml", "\u00EB",
            "igrave", "\u00EC", "iacute", "\u00ED", "icirc", "\u00EE", "iuml", "\u00EF", "ntilde", "\u00F1",
            "ograve", "\u00F2", "oacute", "\u00F3", "ocirc", "\u00F4", "otilde", "\u00F5", "ouml", "\u00F6",
            "ugrave", "\u00F9", "uacute", "\u00FA", "ucirc", "\u00FB", "uuml", "\u00FC"
        };
        for (int i = 0; i < entities.length; i += 2) {
            HTML_ENTITIES.put(entities[i], entities[i + 1].charAt(0));
        }
    }

    private static final class Element {
        final String name;
        final int contentStart;
        boolean hasChild;

        Element(String name, int contentStart) {
            this.name = name;
            this.contentStart = contentStart;
        }
    }

    private final String s;
    private final int n;
    private final RepairOptions opts;
    private final RepairLog log;
    private final StringBuilder out;
    private final Deque<Element> stack = new ArrayDeque<>();
    private final Set<String> usedPrefixes = new LinkedHashSet<>();
    private final Set<String> declaredPrefixes = new LinkedHashSet<>();
    private int pos;
    private int rootCount;
    private int firstRootOut = -1;
    private String firstRootName;

    private XmlRepairer(String s, RepairOptions opts, RepairLog log) {
        this.s = s;
        this.n = s.length();
        this.opts = opts;
        this.log = log;
        this.out = new StringBuilder(s.length() + 32);
    }

    // ------------------------------------------------------------------ API

    /** Corrige o texto e retorna XML bem formado (sempre em UTF-8). */
    public static String repair(String text, RepairOptions opts, RepairLog log) throws RepairException {
        XmlRepairer r = new XmlRepairer(text, opts, log);
        String result = r.run();
        String error = parseError(result);
        if (error != null) {
            throw new RepairException("XML continua inválido após correção: " + error);
        }
        return result;
    }

    /** O XML (bytes originais) é bem formado? */
    public static boolean isWellFormed(byte[] bytes) {
        try {
            newBuilder().parse(new ByteArrayInputStream(bytes));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Mensagem de erro do parser, ou null se o texto for bem formado. */
    static String parseError(String text) {
        try {
            newBuilder().parse(new InputSource(new StringReader(text)));
            return null;
        } catch (SAXParseException e) {
            return "linha " + e.getLineNumber() + ", coluna " + e.getColumnNumber() + ": " + e.getMessage();
        } catch (Exception e) {
            return e.getMessage();
        }
    }

    /** Lê a codificação declarada em <?xml ... encoding="..."?>, se houver. */
    public static String declaredEncoding(byte[] bytes) {
        int len = Math.min(bytes.length, 512);
        String head = new String(bytes, 0, len, StandardCharsets.ISO_8859_1);
        int start = head.indexOf("<?xml");
        if (start < 0) {
            return null;
        }
        int end = head.indexOf("?>", start);
        Matcher m = DECL_ENCODING.matcher(end < 0 ? head.substring(start) : head.substring(start, end));
        return m.find() ? m.group(1) : null;
    }

    private static DocumentBuilder newBuilder() throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setNamespaceAware(true);
        f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        f.setFeature("http://xml.org/sax/features/external-general-entities", false);
        f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        f.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        f.setXIncludeAware(false);
        f.setExpandEntityReferences(false);
        DocumentBuilder b = f.newDocumentBuilder();
        b.setErrorHandler(new ErrorHandler() {
            @Override
            public void warning(SAXParseException e) {
            }

            @Override
            public void error(SAXParseException e) throws SAXParseException {
                throw e;
            }

            @Override
            public void fatalError(SAXParseException e) throws SAXParseException {
                throw e;
            }
        });
        return b;
    }

    // ------------------------------------------------------------------ varredura

    private String run() throws RepairException {
        skipLeadingGarbage();
        if (s.startsWith("<?xml", pos) && pos + 5 < n && (s.charAt(pos + 5) <= ' ' || s.charAt(pos + 5) == '?')) {
            readDeclaration();
        }
        while (pos < n) {
            char c = s.charAt(pos);
            if (c == '<') {
                handleLt();
            } else {
                int next = s.indexOf('<', pos);
                if (next < 0) {
                    next = n;
                }
                emitText(s.substring(pos, next));
                pos = next;
            }
        }
        while (!stack.isEmpty()) {
            log.add("tag-nao-fechada");
            closeTop();
        }
        if (rootCount == 0) {
            throw new RepairException("Nenhum elemento XML encontrado");
        }
        finishNamespacesAndRoots();
        return out.toString();
    }

    private void skipLeadingGarbage() {
        int decl = s.indexOf("<?xml");
        int start;
        if (decl >= 0 && s.substring(0, decl).indexOf('<') < 0) {
            start = decl;
        } else {
            start = 0;
            while (start < n) {
                int lt = s.indexOf('<', start);
                if (lt < 0 || lt + 1 >= n) {
                    start = n;
                    break;
                }
                char next = s.charAt(lt + 1);
                if (isNameStart(next) || next == '!' || next == '?') {
                    start = lt;
                    break;
                }
                start = lt + 1;
            }
        }
        if (start > 0) {
            if (s.substring(0, Math.min(start, n)).trim().isEmpty()) {
                log.add("espaco-antes-da-declaracao-removido");
            } else {
                log.add("lixo-inicial-removido");
            }
        }
        pos = Math.min(start, n);
    }

    private void readDeclaration() {
        int end = s.indexOf("?>", pos);
        int close = end < 0 ? s.indexOf('>', pos) : end + 2;
        if (close < 0) {
            close = n;
        }
        String decl = s.substring(pos, Math.min(close, n));
        Matcher enc = DECL_ENCODING.matcher(decl);
        if (enc.find() && !enc.group(1).equalsIgnoreCase("UTF-8") && !enc.group(1).equalsIgnoreCase("UTF8")) {
            log.add("declaracao-encoding-ajustada-utf8");
        }
        out.append("<?xml version=\"1.0\" encoding=\"UTF-8\"");
        Matcher sa = DECL_STANDALONE.matcher(decl);
        if (sa.find()) {
            out.append(" standalone=\"").append(sa.group(1)).append('"');
        }
        out.append("?>");
        pos = close;
    }

    private void handleLt() {
        if (s.startsWith("<!--", pos)) {
            readComment();
        } else if (s.startsWith("<![CDATA[", pos)) {
            readCdata();
        } else if (s.startsWith("<?", pos)) {
            readProcessingInstruction();
        } else if (startsWithIgnoreCase("<!DOCTYPE", pos)) {
            readDoctype();
        } else if (pos + 1 < n && s.charAt(pos + 1) == '/') {
            readEndTag();
        } else if (pos + 1 < n && isNameStart(s.charAt(pos + 1))) {
            readStartTag(pos + 1);
        } else if (pos + 1 < n && s.charAt(pos + 1) <= ' ' && spacedTagAhead()) {
            log.add("espaco-dentro-da-tag-removido");
            readStartTag(skipWs(pos + 1));
        } else {
            log.add("menor-que-escapado");
            emitRaw("&lt;");
            pos++;
        }
    }

    /** "< nome>" só é tag se existir um "</nome" mais adiante. */
    private boolean spacedTagAhead() {
        int i = skipWs(pos + 1);
        int start = i;
        while (i < n && isNameChar(s.charAt(i))) {
            i++;
        }
        if (i == start || !isNameStart(s.charAt(start))) {
            return false;
        }
        String name = s.substring(start, i);
        return s.indexOf("</" + name, i) >= 0 || s.indexOf("</ " + name, i) >= 0;
    }

    private void readComment() {
        int end = s.indexOf("-->", pos + 4);
        String body;
        if (end < 0) {
            log.add("comentario-nao-fechado");
            body = s.substring(pos + 4);
            pos = n;
        } else {
            body = s.substring(pos + 4, end);
            pos = end + 3;
        }
        String fixed = body;
        while (fixed.contains("--")) {
            fixed = fixed.replace("--", "- -");
        }
        if (fixed.endsWith("-")) {
            fixed = fixed + " ";
        }
        if (!fixed.equals(body)) {
            log.add("comentario-corrigido");
        }
        emitRaw("<!--" + fixed + "-->");
    }

    private void readCdata() {
        int end = s.indexOf("]]>", pos + 9);
        String body;
        if (end < 0) {
            log.add("cdata-nao-fechado");
            body = s.substring(pos + 9);
            pos = n;
        } else {
            body = s.substring(pos + 9, end);
            pos = end + 3;
        }
        if (stack.isEmpty()) {
            if (!body.trim().isEmpty()) {
                log.add("texto-fora-da-raiz-removido");
            }
            return;
        }
        out.append("<![CDATA[").append(body).append("]]>");
    }

    private void readProcessingInstruction() {
        boolean isDecl = s.startsWith("<?xml", pos) && pos + 5 < n
                && (s.charAt(pos + 5) <= ' ' || s.charAt(pos + 5) == '?');
        int end = s.indexOf("?>", pos + 2);
        int next = end < 0 ? n : end + 2;
        if (isDecl) {
            log.add("declaracao-xml-extra-removida");
        } else {
            emitRaw(s.substring(pos, next) + (end < 0 ? "?>" : ""));
        }
        pos = next;
    }

    private void readDoctype() {
        int bracket = s.indexOf('[', pos);
        int gt = s.indexOf('>', pos);
        int end;
        if (bracket >= 0 && gt >= 0 && bracket < gt) {
            int close = s.indexOf("]>", bracket);
            end = close < 0 ? n : close + 2;
        } else {
            end = gt < 0 ? n : gt + 1;
        }
        out.append(s, pos, end);
        pos = end;
    }

    private void readEndTag() {
        int i = pos + 2;
        int afterSlash = i;
        i = skipWs(i);
        int nameStart = i;
        while (i < n && isNameChar(s.charAt(i))) {
            i++;
        }
        String name = s.substring(nameStart, i);
        if (name.isEmpty() || !isNameStart(name.charAt(0))) {
            log.add("menor-que-escapado");
            emitRaw("&lt;");
            pos++;
            return;
        }
        if (nameStart > afterSlash) {
            log.add("espaco-dentro-da-tag-removido");
        }
        int gt = i;
        while (gt < n && s.charAt(gt) != '>' && s.charAt(gt) != '<') {
            gt++;
        }
        if (gt < n && s.charAt(gt) == '>') {
            if (!s.substring(i, gt).trim().isEmpty()) {
                log.add("caractere-invalido-na-tag-removido");
            } else if (gt > i) {
                log.add("espaco-dentro-da-tag-removido");
            }
            pos = gt + 1;
        } else {
            log.add("maior-que-ausente-adicionado");
            pos = gt;
        }
        handleClose(name);
    }

    private void handleClose(String name) {
        Element target = null;
        for (Element e : stack) {
            if (e.name.equals(name)) {
                target = e;
                break;
            }
        }
        if (target == null) {
            for (Element e : stack) {
                if (e.name.equalsIgnoreCase(name)) {
                    target = e;
                    log.add("maiusculas-minusculas-da-tag-corrigidas");
                    break;
                }
            }
        }
        if (target == null) {
            log.add("tag-de-fechamento-orfa-removida");
            return;
        }
        while (stack.peek() != target) {
            log.add("tag-nao-fechada");
            closeTop();
        }
        closeTop();
    }

    private void closeTop() {
        Element e = stack.pop();
        if (opts.trimWhitespace && !e.hasChild) {
            String content = out.substring(e.contentStart);
            String trimmed = content.trim();
            if (!trimmed.equals(content)) {
                out.setLength(e.contentStart);
                out.append(trimmed);
                log.add("espacos-aparados");
            }
        }
        out.append("</").append(e.name).append('>');
    }

    private void readStartTag(int nameStart) {
        int i = nameStart;
        while (i < n && isNameChar(s.charAt(i))) {
            i++;
        }
        String name = s.substring(nameStart, i);
        pos = i;
        Map<String, String> attrs = new LinkedHashMap<>();
        boolean selfClosing = false;
        while (true) {
            pos = skipWs(pos);
            if (pos >= n) {
                log.add("tag-nao-fechada");
                break;
            }
            char c = s.charAt(pos);
            if (c == '>') {
                pos++;
                break;
            }
            if (c == '/') {
                if (pos + 1 < n && s.charAt(pos + 1) == '>') {
                    selfClosing = true;
                    pos += 2;
                    break;
                }
                pos++;
                log.add("caractere-invalido-na-tag-removido");
                continue;
            }
            if (c == '<') {
                log.add("maior-que-ausente-adicionado");
                break;
            }
            if (isNameStart(c)) {
                int a = pos;
                while (pos < n && isNameChar(s.charAt(pos))) {
                    pos++;
                }
                String attrName = s.substring(a, pos);
                int afterName = skipWs(pos);
                String value;
                if (afterName < n && s.charAt(afterName) == '=') {
                    pos = skipWs(afterName + 1);
                    value = readAttributeValue();
                } else {
                    log.add("atributo-sem-valor-corrigido");
                    value = attrName;
                }
                if (opts.trimWhitespace) {
                    String trimmed = value.trim();
                    if (!trimmed.equals(value)) {
                        log.add("espacos-aparados");
                        value = trimmed;
                    }
                }
                if (attrs.containsKey(attrName)) {
                    log.add("atributo-duplicado-removido");
                } else {
                    attrs.put(attrName, value);
                }
                continue;
            }
            if (JsonRepairer.isQuote(c)) {
                log.add("aspas-extras-removidas");
            } else {
                log.add("caractere-invalido-na-tag-removido");
            }
            pos++;
        }
        openElement(name, attrs, selfClosing);
    }

    /**
     * Lê o valor de um atributo. Uma aspa só fecha o valor se depois dela vier
     * ">", "/>", fim, ou outro atributo (nome=). Senão é aspa interna.
     */
    private String readAttributeValue() {
        if (pos >= n) {
            return "";
        }
        char open = s.charAt(pos);
        if (!JsonRepairer.isQuote(open)) {
            int start = pos;
            while (pos < n && s.charAt(pos) > ' ' && s.charAt(pos) != '>'
                    && !(s.charAt(pos) == '/' && pos + 1 < n && s.charAt(pos + 1) == '>')) {
                pos++;
            }
            log.add("atributo-sem-aspas-corrigido");
            return s.substring(start, pos);
        }
        if (open != '"' && open != '\'') {
            log.add("aspas-tipograficas-convertidas");
        }
        int r = 1;
        while (pos + r < n && s.charAt(pos + r) == open) {
            r++;
        }
        if (r >= 2 && attrValueEnds(pos + r)) {
            if (r > 2) {
                log.add("aspas-extras-removidas");
            }
            pos += r;
            return "";
        }
        if (r >= 2) {
            log.add("aspas-extras-removidas");
        }
        int contentStart = pos + r;
        int i = contentStart;
        StringBuilder sb = new StringBuilder();
        while (i < n) {
            char c = s.charAt(i);
            if (JsonRepairer.isQuote(c)) {
                int runEnd = i;
                while (runEnd < n && JsonRepairer.isQuote(s.charAt(runEnd))) {
                    runEnd++;
                }
                if (attrValueEnds(runEnd)) {
                    int delimiter = runEnd - 1;
                    for (int k = runEnd - 1; k >= i; k--) {
                        if (JsonRepairer.sameFamily(open, s.charAt(k))) {
                            delimiter = k;
                            break;
                        }
                    }
                    for (int k = i; k < delimiter; k++) {
                        char q = s.charAt(k);
                        if (q == s.charAt(delimiter)) {
                            log.add("aspas-extras-removidas");
                        } else {
                            sb.append(q);
                        }
                    }
                    if (delimiter < runEnd - 1) {
                        log.add("aspas-extras-removidas");
                    }
                    pos = runEnd;
                    return sb.toString();
                }
                sb.append(s, i, runEnd);
                i = runEnd;
                continue;
            }
            if (c == '>' && !hasQuoteBeforeTagEnd(i)) {
                break;
            }
            sb.append(c);
            i++;
        }
        // aspa de fechamento ausente: termina no ">" ou no fim
        log.add("aspa-de-atributo-nao-fechada");
        pos = i;
        return sb.toString();
    }

    private boolean hasQuoteBeforeTagEnd(int from) {
        for (int i = from + 1; i < n; i++) {
            char c = s.charAt(i);
            if (c == '<' || c == '\n') {
                return false;
            }
            if (JsonRepairer.isQuote(c)) {
                return attrValueEnds(i + 1);
            }
        }
        return false;
    }

    private boolean attrValueEnds(int i) {
        if (i >= n) {
            return true;
        }
        char c = s.charAt(i);
        if (c == '>' || (c == '/' && i + 1 < n && s.charAt(i + 1) == '>') || (c == '?' && i + 1 < n && s.charAt(i + 1) == '>')) {
            return true;
        }
        if (c > ' ') {
            return false;
        }
        int k = skipWs(i);
        if (k >= n) {
            return true;
        }
        char d = s.charAt(k);
        if (d == '>' || d == '/' || d == '<') {
            return true;
        }
        if (!isNameStart(d)) {
            return false;
        }
        int j = k;
        while (j < n && isNameChar(s.charAt(j))) {
            j++;
        }
        j = skipWs(j);
        return j < n && (s.charAt(j) == '=' || s.charAt(j) == '>' || s.charAt(j) == '/');
    }

    private void openElement(String name, Map<String, String> attrs, boolean selfClosing) {
        if (stack.isEmpty()) {
            rootCount++;
            if (rootCount == 1) {
                firstRootOut = out.length();
                firstRootName = name;
            }
        } else {
            stack.peek().hasChild = true;
        }
        trackPrefix(name);
        out.append('<').append(name);
        for (Map.Entry<String, String> a : attrs.entrySet()) {
            String attrName = a.getKey();
            if (attrName.startsWith("xmlns:")) {
                declaredPrefixes.add(attrName.substring(6));
            } else if (!attrName.equals("xmlns")) {
                trackPrefix(attrName);
            }
            out.append(' ').append(attrName).append("=\"").append(escape(a.getValue(), true)).append('"');
        }
        if (selfClosing) {
            out.append("/>");
        } else {
            out.append('>');
            stack.push(new Element(name, out.length()));
        }
    }

    private void trackPrefix(String qname) {
        int colon = qname.indexOf(':');
        if (colon > 0) {
            String prefix = qname.substring(0, colon);
            if (!prefix.equals("xml") && !prefix.equals("xmlns")) {
                usedPrefixes.add(prefix);
            }
        }
    }

    private void emitText(String text) {
        if (stack.isEmpty()) {
            if (!text.trim().isEmpty()) {
                log.add("texto-fora-da-raiz-removido");
            }
            return;
        }
        out.append(escape(text, false));
    }

    private void emitRaw(String raw) {
        if (stack.isEmpty() && raw.startsWith("&")) {
            log.add("texto-fora-da-raiz-removido");
            return;
        }
        out.append(raw);
    }

    /** Escapa texto/atributo preservando entidades válidas e convertendo entidades HTML. */
    private String escape(String raw, boolean attribute) {
        StringBuilder sb = new StringBuilder(raw.length() + 8);
        int i = 0;
        while (i < raw.length()) {
            char c = raw.charAt(i);
            if (c == '&') {
                Matcher m = ENTITY.matcher(raw);
                if (m.find(i) && m.start() == i) {
                    String ent = m.group(1);
                    i = m.end();
                    appendEntity(ent, sb, attribute);
                    continue;
                }
                log.add("e-comercial-escapado");
                sb.append("&amp;");
            } else if (c == '<') {
                log.add("menor-que-escapado");
                sb.append("&lt;");
            } else if (c == '>' && i >= 2 && raw.charAt(i - 1) == ']' && raw.charAt(i - 2) == ']') {
                sb.append("&gt;");
            } else if (attribute && c == '"') {
                log.add("aspas-internas-escapadas");
                sb.append("&quot;");
            } else if (attribute && (c == '\n' || c == '\t')) {
                sb.append(c == '\n' ? "&#10;" : "&#9;");
            } else {
                sb.append(c);
            }
            i++;
        }
        return sb.toString();
    }

    private void appendEntity(String ent, StringBuilder sb, boolean attribute) {
        if (ent.equals("amp") || ent.equals("lt") || ent.equals("gt") || ent.equals("quot") || ent.equals("apos")) {
            sb.append('&').append(ent).append(';');
            return;
        }
        if (ent.startsWith("#")) {
            int cp;
            try {
                cp = ent.charAt(1) == 'x' || ent.charAt(1) == 'X'
                        ? Integer.parseInt(ent.substring(2), 16)
                        : Integer.parseInt(ent.substring(1));
            } catch (NumberFormatException e) {
                cp = -1;
            }
            if (isXmlChar(cp)) {
                sb.append('&').append(ent).append(';');
            } else {
                log.add("entidade-invalida-removida");
            }
            return;
        }
        Character c = HTML_ENTITIES.get(ent);
        if (c != null) {
            log.add("entidade-html-convertida");
            char ch = c == '\u00A0' ? ' ' : c;
            sb.append(ch);
            return;
        }
        log.add("e-comercial-escapado");
        sb.append("&amp;").append(ent).append(';');
    }

    private void finishNamespacesAndRoots() {
        StringBuilder decls = new StringBuilder();
        for (Iterator<String> it = usedPrefixes.iterator(); it.hasNext();) {
            String prefix = it.next();
            if (!declaredPrefixes.contains(prefix)) {
                log.add("namespace-declarado");
                decls.append(" xmlns:").append(prefix).append("=\"urn:nao-declarado:").append(prefix).append('"');
            }
        }
        if (rootCount > 1) {
            log.add("multiplas-raizes-agrupadas");
            String wrapper = opts.xmlWrapperElement == null || opts.xmlWrapperElement.trim().isEmpty()
                    ? "root" : opts.xmlWrapperElement.trim();
            out.insert(firstRootOut, "<" + wrapper + decls + ">");
            out.append("</").append(wrapper).append('>');
        } else if (decls.length() > 0) {
            out.insert(firstRootOut + 1 + firstRootName.length(), decls.toString());
        }
    }

    // ------------------------------------------------------------------ utilitários

    private int skipWs(int i) {
        while (i < n && s.charAt(i) <= ' ') {
            i++;
        }
        return i;
    }

    private boolean startsWithIgnoreCase(String prefix, int at) {
        return s.regionMatches(true, at, prefix, 0, prefix.length());
    }

    private static boolean isNameStart(char c) {
        return Character.isLetter(c) || c == '_' || c == ':';
    }

    private static boolean isNameChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == ':' || c == '-' || c == '.' || c == '\u00B7';
    }

    private static boolean isXmlChar(int cp) {
        return cp == 0x9 || cp == 0xA || cp == 0xD
                || (cp >= 0x20 && cp <= 0xD7FF)
                || (cp >= 0xE000 && cp <= 0xFFFD)
                || (cp >= 0x10000 && cp <= 0x10FFFF);
    }
}
