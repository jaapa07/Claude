# Ecos da Ruína no iPhone

Há duas formas de jogar no iPhone.

## 1. Pelo navegador (já funciona, sem instalar nada)

Abra a página do jogo no Safari (ou no app do Claude) com o celular **deitado**.
Os controles de toque aparecem sozinhos: analógico à esquerda (onde o polegar tocar) e botões à direita
(espada, escudo, esquiva, E, selo, estrela) e no alto (troca, tônico, menu).
O progresso fica salvo no próprio aparelho. A página precisa de internet para baixar o jogo (~37 MB).

## 2. App nativo (100% offline, instalado na tela inicial)

A Apple só permite gerar e assinar apps iOS num **Mac com Xcode**. O projeto já está configurado:

- Predefinição de exportação **"iOS"** em `export_presets.cfg` (identificador `com.ecosdaruina.jogo`,
  iOS 14+, só arm64, paisagem, ícone em `assets/ios/icon_1024.png`, compressão ETC2/ASTC ligada em `project.godot`).
- A exportação foi testada aqui (Linux) e gera o projeto Xcode completo (`EcosDaRuina.xcodeproj`,
  `EcosDaRuina.pck`, `EcosDaRuina.xcframework`, `MoltenVK.xcframework`); só a etapa final de compilar o `.ipa`
  exige macOS. O pacote tem ~120 MB por causa da biblioteca do motor, por isso não fica no repositório.

Passo a passo no Mac:

1. Instale o **Godot 4.3** e, no editor, *Editor → Gerenciar modelos de exportação → Baixar* (4.3.stable).
2. Abra a pasta `ecos_da_ruina` no Godot.
3. *Projeto → Exportar… → iOS*. Em **App Store Team ID** coloque o seu Team ID da Apple
   (qualquer Apple ID gratuito serve para instalar no próprio iPhone). Exporte para uma pasta, por exemplo `build/ios/`.
4. Abra `build/ios/EcosDaRuina.xcodeproj` no **Xcode**, conecte o iPhone pelo cabo, escolha-o como destino,
   em *Signing & Capabilities* selecione o seu time e clique em **Run (▶)**.
5. Na primeira vez, no iPhone: *Ajustes → Geral → VPN e Gerenciamento de Dispositivos* → confiar no desenvolvedor.

Com conta gratuita o app vale 7 dias (depois é só rodar de novo pelo Xcode); com a conta paga de desenvolvedor
dá para usar TestFlight ou publicar na App Store.

Linha de comando (no Mac, alternativa ao passo 3):

```
godot --headless --path ecos_da_ruina --export-release "iOS" build/ios/EcosDaRuina.ipa
```
