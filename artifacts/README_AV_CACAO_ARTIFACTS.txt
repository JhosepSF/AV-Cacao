AV-CACAO - ARTEFACTOS DE INFERENCIA
================================================================================

Este directorio contiene los artefactos runtime exportados desde los modelos
finales de la tesis.

NO contiene los archivos maestros .pt/.pth porque la app no debe cargarlos.

ARCHIVOS
--------------------------------------------------------------------------------

1. cacao_yolo26n_seg.onnx
   Segmentador YOLO26n-seg.
   Una sola clase: cacao.
   ONNX con dimensiones espaciales dinámicas.
   Uso:
       - intento inicial: imgsz=640, conf=0.05
       - fallback: imgsz=1024, conf=0.05
   Nunca usar retry de confianza ultrabaja.

2. resnet18_cacao.onnx
   Clasificador final ResNet18.
   Input: [1,3,224,224], FP32.
   Output: logits [1,4].
   Aplicar softmax fuera del modelo.

3. labels.json
   Orden exacto e inmutable de clases:
       0 Fitoptora
       1 Sana
       2 Plaga_Chinche
       3 Monilia

4. model_manifest.json
   Metadatos de modelos, hashes, versiones y procedencia.

5. pipeline_spec.json
   Especificación que React Native debe reproducir:
       EXIF
       segmentación
       selección de máscara
       PCA / orientación vertical
       fondo blanco
       crop + margen 8 %
       padding cuadrado
       1024x1024
       preprocesamiento ImageNet
       ResNet18

6. validation_report.json
   Validaciones de exportación PyTorch/PT vs ONNX.

7. CHECKSUMS_SHA256.txt
   SHA-256 de todos los archivos runtime.

FLUJO DE PRODUCCIÓN
--------------------------------------------------------------------------------

Cámara / galería
    -> orientación EXIF
    -> YOLO26n-seg 640
    -> si no detecta: YOLO26n-seg 1024
    -> seleccionar máscara principal
    -> PCA a vertical
    -> fondo blanco
    -> crop + margen 8 %
    -> padding cuadrado
    -> 1024x1024
    -> resize 256
    -> center crop 224
    -> normalización ImageNet
    -> ResNet18
    -> softmax
    -> clase estimada + probabilidades

POLÍTICA DE FALLO
--------------------------------------------------------------------------------

Si no se detecta una mazorca con conf >= 0.05:
NO clasificar.
Solicitar una nueva fotografía.

PIPELINE
--------------------------------------------------------------------------------

Versión:
2.5_V3_EXIF_VERTICAL_FINAL

SHA-256:
2a66bdf498512d3656a6679b14eb2b1e509c9ed495978eafd727d13a3a41bacb

NOTA SOBRE TIEMPO REAL
--------------------------------------------------------------------------------

Los ONNX están preparados para inferencia local. El rendimiento final debe
medirse en el dispositivo Android/iOS objetivo. El benchmark Tesla T4 de la
tesis no equivale al rendimiento de un teléfono.

Para la primera versión de AV-Cacao se recomienda:
    captura -> análisis -> resultado

Después de medir latencia end-to-end en dispositivos reales puede habilitarse
video continuo o muestreo de frames en vivo.

================================================================================
