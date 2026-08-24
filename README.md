# AV-Cacao

**AV-Cacao** es una aplicación móvil completa y robusta construida con **Expo + React Native + TypeScript**, diseñada para funcionar de forma 100% local, offline y en el dispositivo del usuario. La aplicación permite detectar, segmentar y clasificar el estado sanitario de mazorcas de cacao utilizando modelos de visión artificial ejecutados localmente mediante **ONNX Runtime**.

---

## 1. Características Principales

- **Detección y Segmentación Local:** Utiliza un modelo YOLO26n-seg local para segmentar la silueta exacta de una mazorca de cacao.
- **Clasificación Sanitaria:** Clasifica la mazorca segmentada en uno de 4 estados mediante una red ResNet18 local:
  - **Fitóftora** (Fitoptora)
  - **Sana** (Sana)
  - **Daño por chinche** (Plaga_Chinche)
  - **Moniliasis** (Monilia)
- **100% Offline y Privado:** No realiza llamadas a APIs en la nube. No sube fotos a internet. Funciona en zonas rurales sin cobertura móvil.
- **Validación de Integridad:** Utilidad integrada para verificar los hashes SHA-256 de los archivos de modelo en el dispositivo.
- **Historial Local:** Almacenamiento local persistente de análisis históricos con métricas de tiempo detalladas.

---

## 2. Arquitectura de Código

El proyecto sigue principios de **Clean Architecture** estructurado de forma modular y desacoplada:

```
av-cacao/
│
├── artifacts/              # Artefactos documentales y metadatos de los modelos
│   ├── model_manifest.json
│   └── pipeline_spec.json
│
├── assets/                 # Recursos de compilación empaquetados por Metro
│   ├── images/             # Iconos, splash screens y recursos visuales (PNGs reales)
│   └── models/             # Copias Maestras de Inferencia ONNX (.onnx)
│       ├── cacao_yolo26n_seg.onnx
│       └── resnet18_cacao.onnx
│
├── src/                    # Código fuente de la aplicación
│   ├── app/                # Enrutamiento de pantallas (Expo Router)
│   │   ├── _layout.tsx     # Enrutador principal (Stack Navigator)
│   │   ├── index.tsx       # Pantalla de inicio premium
│   │   ├── camera.tsx      # Captura de cámara y galería con guías de alineación
│   │   ├── preview.tsx     # Vista previa de la captura
│   │   ├── processing.tsx  # Ejecución visual con checkmarks reales de progreso
│   │   ├── result.tsx      # Resultado de predicciones y comparación visual de máscara
│   │   ├── history.tsx     # Historial local de mediciones persistido en AsyncStorage
│   │   └── about.tsx       # Ficha técnica y validación explícita de integridad
│   │
│   ├── types/              # Definiciones estrictas de interfaces de datos (TypeScript)
│   ├── storage/            # Gestión de almacenamiento local (AsyncStorage)
│   └── utils/              # Funciones auxiliares de hashing SHA-256 y base64
│   │
│   └── ml/                 # Núcleo de Aprendizaje Automático
│       ├── inference/      # Carga de modelos y backend de ejecución (InferenceBackend)
│       ├── segmentation/   # Decodificador YOLO26n-seg y selección por scoring
│       ├── classification/ # Clasificador ResNet18 y Softmax
│       ├── preprocessing/  # Preprocesamiento de EXIF, PCA y transformaciones geométricas
│       └── pipeline.ts     # Orquestador maestro del flujo de datos
│
├── tests/                  # Pruebas unitarias y de integración
│   └── pipeline.test.ts    # Suite de pruebas matemáticas, PCA, Softmax y Bounding Box
│
├── app.json                # Configuración de Expo y Plugins de Permisos Nativos
├── eas.json                # Configuración de perfiles de EAS Build
├── metro.config.js         # Configuración del empaquetado de archivos .onnx
└── package.json            # Dependencias del proyecto
```

---

## 3. Pipeline de Aprendizaje Automático (ML)

El flujo de procesamiento implementado en [`src/ml/pipeline.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/pipeline.ts) reproduce con precisión la especificación maestra:

1. **Fotografía (Cámara o Galería):** Carga el URI original de la imagen.
2. **Corrección EXIF y Redimensionamiento Seguro:** Bakea la orientación EXIF utilizando `expo-image-manipulator` y limita la dimensión máxima a 1024px para evitar problemas de memoria al procesar píxeles en JavaScript.
3. **Inferencia de YOLO26n-seg (640px):** Ejecuta la segmentación con resolución primaria 640. Si no se detectan candidatos con confianza $\ge 0.05$, reintenta a resolución 1024. Si falla, el pipeline se aborta responsablemente.
4. **Selección de la Mazorca Principal:** Evalúa los candidatos mediante la fórmula de scoring:
   $$\text{Score} = 0.50 \times \text{Confianza} + 0.30 \times \text{Puntaje de Área} + 0.20 \times \text{Centralidad}$$
5. **Máscara Binaria de Alta Resolución:** Realiza una interpolación bilinear sobre los coeficientes y las máscaras prototipo y las escala a las dimensiones originales.
6. **Orientación por Componentes Principales (PCA):** Calcula el ángulo $\theta$ del eje principal sobre los píxeles de la máscara upscaleada de forma directa y rápida:
   $$\theta = 0.5 \times \text{atan2}(2 \times \text{cov}_{xy}, \text{cov}_{xx} - \text{cov}_{yy})$$
7. **Normalización Geométrica:**
   - Reemplaza el fondo externo a la máscara por blanco puro `[255, 255, 255]`.
   - Rota la imagen y la máscara por $\alpha = 90^\circ - \theta$ para alinear la mazorca verticalmente.
   - Calcula el bounding box, agrega un margen del 8%, recorta y aplica padding blanco para hacerla cuadrada.
   - Redimensiona la representación maestra a $1024 \times 1024$ píxeles y la guarda localmente como JPEG.
8. **Normalización ImageNet para ResNet18:** Redimensiona a $256 \times 256$, extrae el crop central de $224 \times 224$, reordena a formato CHW, escala de $[0, 1]$ y normaliza con las medias y desviaciones estándar de ImageNet:
   $$\text{canal}_{\text{norm}} = \frac{\text{canal} - \text{mean}}{\text{std}}$$
9. **Inferencia de ResNet18 y Softmax:** Ejecuta el clasificador, aplica activación Softmax estable sobre las salidas y mapea las probabilidades resultantes al orden inmutable de clases.

---

## 4. Carga de Modelos y Sandbox de Inferencia

Los modelos ONNX se colocan en `assets/models/`. Metro los empaqueta como recursos crudos. 

Dado que el motor de ONNX Runtime requiere de una ruta de acceso de archivo real en el sistema nativo:
1. En el arranque de la aplicación, [`ModelLoader`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/ModelLoader.ts) resuelve el asset de Expo y descarga su contenido.
2. Si el asset está empaquetado o se resuelve como una URI virtual (ej. `assets://` o `http`), `ModelLoader` copia el archivo binario ONNX de forma segura al sandbox local en `FileSystem.documentDirectory` (en el almacenamiento aislado de la app).
3. `ModelLoader` crea e inicializa las sesiones `InferenceSession` correspondientes sobre las rutas absolutas del sandbox y las mantiene vivas en memoria, previniendo recreaciones costosas.

---

## 5. Instalación y Ejecución de Desarrollo

### Requisitos Previos
- Node.js (v20 o superior recomendado).
- Android SDK / Xcode si deseas compilar y emular de forma nativa.
- Cuenta en Expo y EAS CLI configurada.

### Pasos de Configuración:
1. Clonar el repositorio.
2. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
3. Ejecutar las pruebas unitarias locales para confirmar que todo funciona correctamente:
   ```bash
   npm test
   ```
4. Correr la verificación de tipos de TypeScript y del Linter para asegurar la calidad de código:
   ```bash
   npx tsc --noEmit
   npm run lint
   ```

---

## 6. Compilación de Development Build con EAS (Android)

Debido al uso de módulos nativos (ONNX Runtime), la aplicación **no funcionará en Expo Go**. Debe compilarse un **Development Build** propio.

### Comando para compilar el Development Build de Android:
```bash
eas build --profile development --platform android
```

Una vez finalizada la compilación, descarga el archivo APK generado por EAS, instálalo en tu dispositivo Android o emulador, e inicia el servidor de desarrollo local usando:
```bash
npx expo start --dev-client
```
Escanea el código QR desde la aplicación de desarrollo instalada para conectarte y probar en tiempo real.

### Comando para compilar la build de previsualización (Ad-Hoc/Internal testing):
```bash
eas build --profile preview --platform android
```

---

## 7. Mantenimiento y Actualización de Modelos

Si deseas actualizar los modelos de inferencia en el futuro sin modificar la interfaz de usuario:
1. Coloca los nuevos archivos `.onnx` en `assets/models/` conservando los nombres exactos:
   - `cacao_yolo26n_seg.onnx`
   - `resnet18_cacao.onnx`
2. Calcula los nuevos hashes SHA-256 de los modelos actualizados.
3. Abre [`src/ml/inference/ModelLoader.ts`](file:///c:/Users/JhosepSF/Downloads/AV-Cacao/src/ml/inference/ModelLoader.ts) y actualiza las constantes `YOLO_SHA256` y `RESNET_SHA256` con los nuevos hashes de referencia.
4. Actualiza los metadatos correspondientes en `artifacts/model_manifest.json` para reflejar la versión y procedencia del nuevo modelo.
5. Vuelve a compilar el Development Build o la versión final mediante EAS Build para empaquetar los nuevos modelos en el binario de la aplicación.
