# Brewater

App Android que avalia se uma água mineral serve para café especial (brew + water).

- **Cadastro por foto ou manual**: fotografe a tabela de composição do rótulo (OCR offline com ML Kit) ou digite os valores. Tudo fica salvo no aparelho.
- **Avaliação**: converte cálcio/magnésio em dureza (GH) e bicarbonato em alcalinidade (KH), em mg/L de CaCO₃, e compara com o padrão de água da SCA. Nota de 0 a 100 e explicação de cada parâmetro.
- **Como melhorar**: calcula a melhor diluição com água destilada/osmose e a melhor mistura entre as águas cadastradas.

## Build

```bash
export JAVA_HOME=~/Library/Java/JavaVirtualMachines/jbr-21.0.8/Contents/Home
./gradlew assembleDebug testDebugUnitTest
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

## Baixar

Última versão: [Brewater.apk](https://github.com/LuisFelipe210/brewater/releases/latest/download/Brewater.apk) (Android 8 ou mais novo). Na primeira vez o Android pede para permitir instalar de fontes desconhecidas.

O app confere as releases do GitHub ao abrir e oferece a atualização sozinho.

## Publicar uma versão nova

A assinatura vem de `keystore.properties` (fora do git) e da chave em `~/.android/brewater/`. **Guarde backup dos dois**: sem a mesma chave, quem já tem o app não consegue atualizar.

1. Suba `versionCode` e `versionName` em `app/build.gradle.kts`.
2. Gere e publique (a tag é `v` + `versionName`, o texto vira a nota da atualização):

```bash
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk /tmp/Brewater.apk
gh release create v1.1 /tmp/Brewater.apk --title "Brewater 1.1" --notes "O que mudou"
```

## Instalar no celular via USB

Ative a depuração USB (ou por Wi-Fi) e:

```bash
/opt/homebrew/share/android-commandlinetools/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Onde está cada coisa

- `domain/WaterProfile.kt` — conversões químicas (GH, KH, TDS)
- `domain/Evaluator.kt` — faixas, pesos, nota e textos
- `domain/Improvements.kt` — diluição e misturas
- `ocr/LabelParser.kt` — leitura da tabela do rótulo (testado em `LabelParserTest`)
