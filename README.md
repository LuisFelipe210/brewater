# Brewater

Fiz esse app pra parar de chutar qual água mineral comprar pro café. Você tira foto da tabela do rótulo (ou digita os números), ele calcula dureza e alcalinidade e compara com o que a SCA recomenda. Sai uma nota de 0 a 100, o porquê de cada parâmetro e, se a água não for boa, quanto diluir ou com qual outra água misturar.

Funciona offline e nada sai do celular.

## Baixar

Android 8 ou mais novo: [Brewater.apk](https://github.com/LuisFelipe210/brewater/releases/latest/download/Brewater.apk). Na primeira instalação o Android vai pedir pra liberar apps de fontes desconhecidas. Depois disso o próprio app avisa quando sai versão nova.

iPhone: abre https://luisfelipe210.github.io/brewater/ no Safari e usa "Adicionar à Tela de Início". O código fica em [`ios/`](ios/).

## Rodar

```bash
export JAVA_HOME=~/Library/Java/JavaVirtualMachines/jbr-21.0.8/Contents/Home
./gradlew assembleDebug testDebugUnitTest
```

Pra instalar direto no celular com depuração USB ligada:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Lançar versão nova

Sobe `versionCode` e `versionName` em `app/build.gradle.kts` e:

```bash
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk /tmp/Brewater.apk
gh release create v1.1 /tmp/Brewater.apk --title "Brewater 1.1" --notes "O que mudou"
```

A tag precisa ser `v` + `versionName`, que é o que o app compara pra saber se tem atualização. O texto de `--notes` aparece no aviso.

A chave de assinatura não tá no repositório: fica em `~/.android/brewater/`, junto com o `keystore.properties`. Se perder isso, quem já instalou não consegue mais atualizar por cima, então guarda backup disso.

## Código

A química tá em `app/src/main/kotlin/.../domain` (conversões, faixas da SCA, nota, diluição e mistura) e a leitura do rótulo em `ocr/LabelParser.kt`. O parser apanha bastante do OCR em garrafa curva ("Sufato", "O,956", vírgula sumindo), por isso os testes usam saída real de fotos de rótulo.
