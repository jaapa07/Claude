package br.com.lincros.nifi.repair;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Registra as correções aplicadas em um documento. Cada correção tem um código
 * curto (ex.: "aspas-extras-removidas") e um contador de ocorrências.
 */
public final class RepairLog {

    private final Map<String, Integer> actions = new LinkedHashMap<>();

    public void add(String action) {
        Integer current = actions.get(action);
        actions.put(action, current == null ? 1 : current + 1);
    }

    public boolean isEmpty() {
        return actions.isEmpty();
    }

    public boolean has(String action) {
        return actions.containsKey(action);
    }

    public List<String> actions() {
        return new ArrayList<>(actions.keySet());
    }

    public int totalCount() {
        int total = 0;
        for (Integer count : actions.values()) {
            total += count;
        }
        return total;
    }

    /** Ex.: "aspas-extras-removidas(2),espacos-aparados(5)". */
    public String summary() {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Integer> e : actions.entrySet()) {
            if (sb.length() > 0) {
                sb.append(',');
            }
            sb.append(e.getKey()).append('(').append(e.getValue()).append(')');
        }
        return sb.toString();
    }
}
