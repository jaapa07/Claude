package br.com.lincros.nifi.xml;

import java.io.File;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.ErrorHandler;
import org.xml.sax.InputSource;
import org.xml.sax.SAXParseException;

/** Validação do XML gerado (bem formado e XSD) e remoção de elementos vazios. */
public final class XmlPostProcessor {

    private static final Map<String, CachedSchema> SCHEMAS = new ConcurrentHashMap<>();

    private static final class CachedSchema {
        final long lastModified;
        final Schema schema;

        CachedSchema(long lastModified, Schema schema) {
            this.lastModified = lastModified;
            this.schema = schema;
        }
    }

    private XmlPostProcessor() {
    }

    /** Lê o XML; lança TemplateException com linha/coluna se não estiver bem formado. */
    public static Document parse(String xml) throws TemplateException {
        try {
            return newBuilder().parse(new InputSource(new StringReader(xml)));
        } catch (SAXParseException e) {
            throw new TemplateException("O XML gerado não é válido (linha " + e.getLineNumber() + ", coluna "
                    + e.getColumnNumber() + "): " + e.getMessage()
                    + ". Confira o template: tags abertas/fechadas e uso de {{{ }}}.");
        } catch (Exception e) {
            throw new TemplateException("O XML gerado não é válido: " + e.getMessage(), e);
        }
    }

    /**
     * Remove elementos sem texto, sem filhos e sem atributos (repetindo até não sobrar nenhum,
     * pois remover um filho pode deixar o pai vazio). Retorna o XML serializado.
     */
    public static String removeEmptyElements(String xml) throws TemplateException {
        Document doc = parse(xml);
        Element root = doc.getDocumentElement();
        boolean changed = true;
        int removed = 0;
        while (changed) {
            changed = false;
            NodeList all = doc.getElementsByTagName("*");
            for (int i = all.getLength() - 1; i >= 0; i--) {
                Element e = (Element) all.item(i);
                if (e != root && isEmpty(e)) {
                    Node prev = e.getPreviousSibling();
                    if (prev != null && prev.getNodeType() == Node.TEXT_NODE && prev.getNodeValue().trim().isEmpty()) {
                        prev.getParentNode().removeChild(prev);
                    }
                    e.getParentNode().removeChild(e);
                    changed = true;
                    removed++;
                }
            }
        }
        if (removed == 0) {
            return xml;
        }
        return serialize(doc, xml.trim().startsWith("<?xml"));
    }

    private static boolean isEmpty(Element e) {
        if (e.hasAttributes()) {
            return false;
        }
        NodeList children = e.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node c = children.item(i);
            if (c.getNodeType() == Node.ELEMENT_NODE) {
                return false;
            }
            if ((c.getNodeType() == Node.TEXT_NODE || c.getNodeType() == Node.CDATA_SECTION_NODE)
                    && !c.getNodeValue().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private static String serialize(Document doc, boolean withDeclaration) throws TemplateException {
        try {
            TransformerFactory tf = TransformerFactory.newInstance();
            tf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            Transformer t = tf.newTransformer();
            t.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            t.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, withDeclaration ? "no" : "yes");
            doc.setXmlStandalone(true);
            StringWriter w = new StringWriter();
            t.transform(new DOMSource(doc), new StreamResult(w));
            return w.toString();
        } catch (Exception e) {
            throw new TemplateException("Falha ao gerar o XML final: " + e.getMessage(), e);
        }
    }

    /** Valida o XML contra um arquivo XSD (com cache por arquivo e data de modificação). */
    public static void validateXsd(String xml, String xsdPath) throws TemplateException {
        File file = new File(xsdPath);
        if (!file.isFile()) {
            throw new TemplateException("Arquivo XSD não encontrado: " + xsdPath);
        }
        Schema schema;
        try {
            CachedSchema cached = SCHEMAS.get(file.getAbsolutePath());
            if (cached == null || cached.lastModified != file.lastModified()) {
                SchemaFactory sf = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
                sf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
                sf.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
                sf.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "file");
                cached = new CachedSchema(file.lastModified(), sf.newSchema(file));
                SCHEMAS.put(file.getAbsolutePath(), cached);
            }
            schema = cached.schema;
        } catch (Exception e) {
            throw new TemplateException("XSD inválido (" + xsdPath + "): " + e.getMessage(), e);
        }
        try {
            Validator v = schema.newValidator();
            v.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            v.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            v.validate(new StreamSource(new StringReader(xml)));
        } catch (SAXParseException e) {
            throw new TemplateException("XML não segue o XSD (linha " + e.getLineNumber() + "): " + e.getMessage());
        } catch (Exception e) {
            throw new TemplateException("Falha na validação XSD: " + e.getMessage(), e);
        }
    }

    private static DocumentBuilder newBuilder() throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setNamespaceAware(true);
        f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
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
}
