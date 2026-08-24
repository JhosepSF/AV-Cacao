# Walkthrough: AV-Cacao

Este documento resume las tareas completadas, los archivos creados, los resultados de las pruebas y las instrucciones finales para el compilado del Development Build.

## 1. Archivos Creados y Modificados

### Configuración del Proyecto
* [`metro.config.js`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/metro.config.js): Configuración para el bundling de archivos `.onnx` como assets locales de Metro.
* [`app.json`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/app.json): Configuración de Expo de la app (Nombre `AV-Cacao`, paquete `com.jhosepsf.avcacao`, plugins de permisos para cámara y galería, e ID del proyecto EAS).
* [`eas.json`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/eas.json): Configuración de los perfiles de compilación (`development`, `preview`, `production`) y soporte de cliente de desarrollo.
* [`package.json`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/package.json): Gestión de dependencias y script de pruebas locales (`npm test`).
* [`tsconfig.json`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/tsconfig.json): Opciones de compilación TypeScript con anulación CommonJS específica para `ts-node` al ejecutar pruebas locales.

### Módulos e interfaces de datos
* [`src/types/index.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/types/index.ts): Modelos e interfaces estrictas de TypeScript (`PipelineResult`, `SegmentationResult`, `ClassificationResult`).
* [`src/storage/history.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/storage/history.ts): Persistencia local e historial local persistido mediante `AsyncStorage` y guardado de URIs del sandbox.

### Núcleo de Aprendizaje Automático
* [`src/ml/inference/InferenceBackend.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/InferenceBackend.ts): Interfaz desacoplada del motor de inferencia.
* [`src/ml/inference/onnxSetup.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/onnxSetup.ts): Polyfill/Mock del módulo nativo Onnxruntime para prevenir crashes al evaluar/importar en entornos como Expo Go, Web o entornos de pruebas unitarias.
* [`src/ml/inference/OnnxBackend.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/OnnxBackend.ts): Implementación del backend ONNX con `onnxruntime-react-native` precedido por la importación de `onnxSetup`.
* [`src/ml/inference/ModelLoader.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/ModelLoader.ts): Cargador singleton que maneja la copia local a sandbox `FileSystem.documentDirectory`, verificación de firmas SHA-256 e inicialización persistente.
* [`src/ml/segmentation/Yolo26SegDecoder.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/segmentation/Yolo26SegDecoder.ts): Decodificador de la salida de YOLO26n-seg, combinador lineal de prototipos con coeficientes, y recorte final.
* [`src/ml/segmentation/maskSelection.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/segmentation/maskSelection.ts): Puntuador y seleccionador de la mazorca principal basado en la fórmula ponderada de área, centralidad y confianza.
* [`src/ml/preprocessing/pca.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/pca.ts): Análisis de componentes principales 2D en base a momentos de la máscara para cálculo del eje de alineación.
* [`src/ml/preprocessing/geometry.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/geometry.ts): Pipeline de transformación geométrica (blanqueado de fondo, rotación bilinear, crop con 8% de margen, padding cuadrado y resize bilinear de $1024 \times 1024$).
* [`src/ml/preprocessing/imagenet.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/imagenet.ts): Resize a 256, center crop 224 y normalización por canal de ImageNet.
* [`src/ml/preprocessing/exif.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/exif.ts): Extractor de píxeles crudos JPEG tras aplicar transformaciones de rotación EXIF y downscaling de seguridad a un máximo de 1024px.
* [`src/ml/classification/softmax.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/classification/softmax.ts): Activación Softmax estable.
* [`src/ml/classification/classifierService.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/classification/classifierService.ts): Orquestador de inferencia y asignación inmutable de clases sanitarias del cacao.
* [`src/ml/pipeline.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/pipeline.ts): Orquestador maestro del flujo completo.

### Vistas y Navegación
* [`src/app/_layout.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/_layout.tsx): Navegador principal del Stack con pre-cargado de modelos.
* [`src/app/index.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/index.tsx): Pantalla de bienvenida premium con temática agrícola.
* [`src/app/camera.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/camera.tsx): Pantalla de captura y galería con guías elípticas.
* [`src/app/preview.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/preview.tsx): Vista previa e inicio de ejecución.
* [`src/app/processing.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/processing.tsx): Stepper visual y contador de tiempo por fase.
* [`src/app/result.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/result.tsx): Presentación detallada, comparación de imagen original/segmentada, histograma de probabilidades en orden inmutable y disclaimer responsable.
* [`src/app/history.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/history.tsx): Historial de análisis del usuario.
* [`src/app/about.tsx`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/app/about.tsx): Ficha técnica y botón de verificación de integridad local SHA-256.

### Pruebas e Iconos
* [`tests/pipeline.test.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/tests/pipeline.test.ts): Suite completa de pruebas unitarias.
* [`assets/images/`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/assets/images): Iconos y recursos gráficos generados en formato PNG real a partir del logotipo.

---

## 2. Pruebas y Validación Realizadas

1. **Pruebas Unitarias de Inferencia (`npm test`):**
   * **Softmax:** Validación de que los outputs son estables, sumen exactamente `1.0` y mantengan el argmax.
   * **Orden de clases:** Confirmación de que el orden de clases se mantiene inmutable: `Fitoptora` (0), `Sana` (1), `Plaga_Chinche` (2), `Monilia` (3).
   * **Normalización ImageNet:** Validación de que los valores mapeados coinciden con los esperados para el canal R, G y B.
   * **Cálculos de Scoring de Máscara:** Comprobación de que las funciones de puntuación de área y centralidad retornan los valores numéricos correspondientes al centrado.
   * **PCA / Cálculo de Ángulo 2D:** Confirmación de que el cálculo del ángulo $\theta$ con momentos de imagen sobre una línea diagonal es exactamente `PI/4` ($45^\circ$).
   * **Bounding Box y Margen del 8%:** Confirmación de que la bounding box con margen se calcula y se clamp-ea correctamente.
   * **Manifest:** Validación de integridad hashes de referencia YOLO y ResNet.
   * **Resultado:** **7/7 pruebas pasaron satisfactoriamente.**

2. **Compilación de TypeScript (`npx tsc --noEmit`):**
   * La validación del typecheck se ejecuta y finaliza con código de salida `0` sin reportar ningún error de tipos ni advertencias.

3. **Linter de Código (`npm run lint`):**
   * El análisis de ESLint de Expo finaliza con código de salida `0` reportando cero errores y cero advertencias.

4. **Diagnóstico Expo Doctor (`npx expo-doctor`):**
   * Pasa el 100% de las verificaciones (21/21 passed) garantizando la compatibilidad total de las dependencias nativas instaladas, esquemas de app.json, y el empaquetado de assets de iconos y splash screens en PNG.

---

## 3. Instrucciones de Compilación y Despliegue

Para compilar e instalar la aplicación de desarrollo en Android, sigue los siguientes pasos:

1. **Iniciar Sesión en EAS:**
   ```bash
   eas login
   ```
2. **Generar e Instalar las Credenciales de Android:**
   Asegúrate de que estás en la raíz del proyecto y corre el siguiente comando para compilar el **Development Build** para Android:
   ```bash
   eas build --profile development --platform android
   ```
3. **Descargar e Instalar el APK:**
   Una vez terminada la build en la consola de EAS, escanea el código QR proporcionado por la terminal o accede al dashboard de Expo para descargar el archivo APK resultante directamente en tu teléfono Android.
4. **Ejecutar el Servidor de Desarrollo:**
   Corre el servidor de desarrollo local de Expo:
   ```bash
   npx expo start --dev-client
   ```
   Abre la app de desarrollo instalada en tu teléfono y escanea el código de desarrollo para iniciar.
