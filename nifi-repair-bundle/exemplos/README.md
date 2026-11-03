# Arquivos de teste com defeitos

| Arquivo | O que é |
|---|---|
| `nfe_quebrada.xml` | NF-e 4.00 fictícia com erros na observação (`infCpl`, `obsCont`) e em campos |
| `nfe_corrigida.xml` | O resultado do RepairXmlJson para a NF-e acima |
| `gerar_nfe_quebrada.py` | Gera a NF-e quebrada |
| `gerar_xml_quebrado.py` | Gera um lote grande de embarques (800 por padrão, ~1,2 MB) com ~940 defeitos estruturais e um CSV com a linha de cada defeito |

```bash
python3 gerar_xml_quebrado.py 800 .     # lote_embarques_quebrado.xml + defeitos_inseridos.csv
python3 gerar_nfe_quebrada.py .         # nfe_quebrada.xml
```

Os dados são fictícios. A semente é fixa, então o arquivo gerado é sempre o mesmo.
