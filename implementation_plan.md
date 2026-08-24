# Plan de Implementación: AV-Cacao

Este documento detalla el plan técnico para construir la aplicación móvil **AV-Cacao** utilizando **Expo**, **React Native**, **TypeScript**, y **ONNX Runtime**. La aplicación ejecutará localmente dos modelos ONNX para detectar, segmentar y clasificar el estado sanitario de mazorcas de cacao.

## Resumen del Proyecto

- **Nombre de la App:** AV-Cacao
- **ID del Proyecto EAS:** `47829ca7-521a-4fb6-9059-98068988fa03`
- **Modelos ONNX Locales:**
  1. **Segmentador:** `cacao_yolo26n_seg.onnx` (YOLO26n-seg, una clase "cacao")
  2. **Clasificador:** `resnet18_cacao.onnx` (ResNet18, 4 clases: Fitóftora, Sana, Daño por chinche, Moniliasis)
- **Pipeline de Inferencia:** Procesamiento de imagen local, PCA para orientación vertical, segmentación, normalización geométrica y clasificación en dispositivo.

---

## Preguntas Abiertas

> [!IMPORTANT]
> Por favor revisa y confirma los siguientes puntos de diseño antes de iniciar la implementación:
>
> 1. **Resolución intermedia de procesamiento:** Las fotos tomadas por la cámara pueden ser muy grandes (ej. 3000x4000). Para evitar problemas de memoria y lentitud al realizar operaciones de píxeles (PCA y rotación bilinear) en JavaScript, proponemos redimensionar la imagen a un tamaño máximo de 1024px en su lado más largo antes de aplicar el pipeline geométrico. ¿Estás de acuerdo con este enfoque de optimización?
> 2. **Visualización de la mazorca segmentada:** En la pantalla de resultados, el requerimiento solicita mostrar la "imagen original". ¿Te gustaría que también mostremos la imagen final preprocesada (la mazorca recortada, enderezada y con fondo blanco) como un elemento interactivo para que el usuario vea qué analizó el modelo?
> 3. **Almacenamiento Local del Historial:** Utilizaremos `AsyncStorage` (el estándar oficial de React Native) para persistir las clasificaciones e imágenes locales. Las imágenes se guardarán en el sistema de archivos del dispositivo mediante `expo-file-system`. ¿Es este enfoque local de tu agrado?

---

## Cambios Propuestos

### 1. Inicialización y Configuración

#### [NEW] [package.json](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/package.json)
Configurar el proyecto de Expo con TypeScript estricto y las dependencias necesarias:
- `onnxruntime-react-native`
- `expo-camera`
- `expo-image-picker`
- `expo-file-system`
- `expo-image-manipulator`
- `expo-asset`
- `jpeg-js` (decodificador y codificador de imágenes en JS puro)
- `@react-native-async-storage/async-storage`

#### [NEW] [metro.config.js](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/metro.config.js)
Configurar Metro para reconocer archivos `.onnx` como assets y asegurar que se empaqueten en la compilación final.

#### [NEW] [app.config.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/app.config.ts)
Configuración dinámica de Expo con el `projectId` de EAS y permisos para cámara y galería.

#### [NEW] [eas.json](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/eas.json)
Configurar perfiles `development`, `preview` y `production` para EAS Build con soporte para Android e iOS.

---

### 2. Estructura de Navegación y Vistas (Expo Router)

Las pantallas usarán un tema premium inspirado en el cacao y la agricultura, con colores tierra cálidos, verde esmeralda y oro suave sobre un tema oscuro o claro de alta legibilidad.

- `app/_layout.tsx`: Configuración del enrutador y carga inicial.
- `app/index.tsx`: Pantalla de inicio con branding premium.
- `app/camera.tsx`: Pantalla de cámara con overlay de guía visual.
- `app/preview.tsx`: Confirmación de captura.
- `app/processing.tsx`: Pipeline visual mostrando pasos reales con cronómetros individuales.
- `app/result.tsx`: Presentación de resultados y disclaimer responsable.
- `app/history.tsx`: Listado de análisis guardados con opción de eliminación.
- `app/about.tsx`: Información técnica de los modelos extraída de `model_manifest.json`.

---

### 3. Backend de Inferencia y Pipeline de ML (`src/ml/`)

#### [NEW] [OnnxBackend.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/OnnxBackend.ts)
Encapsula la creación de sesiones de ONNX Runtime, optimizando la reutilización de memoria y la carga robusta desde assets de Expo.

#### [NEW] [ModelLoader.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/ModelLoader.ts)
Controlador singleton de estados de carga de modelos (`idle`, `loading`, `ready`, `error`). Verifica los checksums SHA-256 de los modelos en desarrollo.

#### [NEW] [Yolo26SegDecoder.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/segmentation/Yolo26SegDecoder.ts)
Parser aislado para decodificar las salidas del segmentador YOLO26n-seg:
- Entrada: `output0` de `[1, 300, 38]` y `output1` de `[1, 32, mask_h, mask_w]`.
- Interpreta: `[x1, y1, x2, y2, score, class_id, 32_mask_coefficients]`.
- Ejecuta combinación lineal con prototipos y activación `sigmoid`.

#### [NEW] [maskSelection.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/segmentation/maskSelection.ts)
Selección de la mazorca principal basado en la fórmula ponderada de puntuación:
`score = 0.50 * confidence + 0.30 * area_score + 0.20 * centrality`

#### [NEW] [pca.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/pca.ts)
Cálculo de la orientación principal de la mazorca usando los momentos de la máscara binaria en un solo paso rápido sobre el array de píxeles:
`theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY)`

#### [NEW] [geometry.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/geometry.ts)
- Reemplazo de fondo por blanco utilizando la máscara binaria.
- Rotación bilinear de la imagen y máscara para alinear el eje principal a 90°.
- Bounding box con margen del 8%, padding cuadrado y redimensionamiento bilinear a la representación maestra de `1024x1024`.

#### [NEW] [imagenet.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/preprocessing/imagenet.ts)
Preprocesamiento de entrada de ResNet18: Resize a `256`, Center Crop de `224x224`, normalización por canales con medias y desviaciones de ImageNet, y empaquetado en tensor float32 `[1, 3, 224, 224]`.

#### [NEW] [pipeline.ts](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/pipeline.ts)
Orquestador del pipeline completo que recibe el URI de la imagen y devuelve el resultado detallado con métricas de tiempo.

---

## Plan de Verificación

### Pruebas Unitarias (`tests/`)
- Crear tests para `softmax`, orden de clases inmutable, normalización de ImageNet.
- Tests para fórmulas de `area_score`, `centrality`, `target score` y selección de la mejor máscara.
- Tests para PCA y cálculo de ángulo de inclinación 2D.
- Validar lectura correcta de `model_manifest.json` y verificación de integridad SHA-256.

### Pruebas de Integración (Golden Tests)
- Infraestructura para procesar imágenes de prueba y comparar las salidas numéricas del modelo e intermedias entre el entorno React Native y las referencias de PyTorch detalladas en `validation_report.json`.

### Verificación Manual
1. Iniciar el servidor de desarrollo y compilar la aplicación de desarrollo.
2. Comprobar que los permisos de cámara y galería funcionen correctamente.
3. Tomar una fotografía y verificar que el flujo visual de procesamiento muestre las etapas correctas.
4. Confirmar que la inferencia sea local, rápida y persistente (con datos guardados en el historial local).
5. Validar que la compilación EAS en Android funcione correctamente usando `eas build`.
