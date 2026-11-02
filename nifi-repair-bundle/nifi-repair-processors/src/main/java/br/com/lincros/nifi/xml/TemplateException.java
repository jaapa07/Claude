package br.com.lincros.nifi.xml;

/** Erro de template (sintaxe), de dados (campo ausente, valor inválido) ou de XML gerado. */
public class TemplateException extends Exception {

    private static final long serialVersionUID = 1L;

    public TemplateException(String message) {
        super(message);
    }

    public TemplateException(String message, Throwable cause) {
        super(message, cause);
    }
}
