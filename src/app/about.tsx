import * as React from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import modelManifest from '../../artifacts/model_manifest.json';
import { ModelLoader } from '../ml/inference/ModelLoader';

export default function AboutScreen() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const runIntegrityCheck = async () => {
    setIsVerifying(true);
    try {
      console.log('[about] Triggering explicit model integrity verification...');
      const loader = ModelLoader.getInstance();

      // Force checksum verification of the local models
      await loader.loadModels(true);

      Alert.alert(
        'Integridad Verificada',
        '¡Los archivos locales del segmentador (YOLO26n-seg) y clasificador (ResNet18) coinciden exactamente con los hashes de referencia de la tesis!',
        [{ text: 'Aceptar' }]
      );
    } catch (e) {
      console.error('[about] Integrity check failed:', e);
      Alert.alert(
        'Error de Integridad',
        `La verificación falló. Es posible que los modelos ONNX locales falten o estén corruptos.\n\nDetalle: ${e instanceof Error ? e.message : String(e)}`,
        [{ text: 'Cerrar' }]
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información del Modelo</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Core Metadata Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ficha Técnica de Inferencia</Text>
          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Segmentador:</Text>
            <Text style={styles.metaValue}>{modelManifest.segmenter.name}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Clasificador:</Text>
            <Text style={styles.metaValue}>{modelManifest.classifier.name}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Clases Sanitarias:</Text>
            <Text style={styles.metaValue}>4 (Fitóftora, Sana, Chinche, Moniliasis)</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Entrada Clasificador:</Text>
            <Text style={styles.metaValue}>
              {modelManifest.classifier.inference_benchmark_reference.input_size} × {modelManifest.classifier.inference_benchmark_reference.input_size} px
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Pipeline Geométrico:</Text>
            <Text style={styles.metaValue}>{modelManifest.pipeline.version}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Inferencia local:</Text>
            <Text style={styles.metaValue}>{modelManifest.deployment.offline_inference ? 'Local / Offline (100%)' : 'Online'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Precisión Ejecución:</Text>
            <Text style={styles.metaValue}>{modelManifest.deployment.precision}</Text>
          </View>
        </View>

        {/* Expandable Advanced Section */}
        <TouchableOpacity
          style={styles.expandableHeader}
          activeOpacity={0.8}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.expandableTitle}>
            {showAdvanced ? '▼ Ocultar metadatos avanzados' : '▶ Ver metadatos avanzados (SHA-256)'}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedCard}>
            <Text style={styles.advancedSecTitle}>Hashes SHA-256 de Referencia</Text>

            <View style={styles.hashBlock}>
              <Text style={styles.hashLabel}>YOLO26n-seg (.onnx)</Text>
              <Text style={styles.hashValue} selectable={true}>{modelManifest.segmenter.sha256}</Text>
            </View>

            <View style={styles.hashBlock}>
              <Text style={styles.hashLabel}>ResNet18 (.onnx)</Text>
              <Text style={styles.hashValue} selectable={true}>{modelManifest.classifier.sha256}</Text>
            </View>

            <View style={styles.hashBlock}>
              <Text style={styles.hashLabel}>Especificación del Pipeline</Text>
              <Text style={styles.hashValue} selectable={true}>{modelManifest.pipeline.sha256}</Text>
            </View>
          </View>
        )}

        {/* Integrity Check Action */}
        <View style={styles.actionContainer}>
          <Text style={styles.actionDesc}>
            Puedes verificar explícitamente que los archivos de modelo descargados en el teléfono coincidan con los originales y no tengan corrupción.
          </Text>

          <TouchableOpacity
            style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
            onPress={runIntegrityCheck}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.verifyButtonText}>Calculando hashes locales...</Text>
              </View>
            ) : (
              <Text style={styles.verifyButtonText}>Verificar integridad de los modelos</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16110e', // Deep cacao charcoal
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2b1e19',
    marginTop: 20,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: 60,
  },
  backButtonText: {
    fontSize: 15,
    color: '#e5d4c0',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e5d4c0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  card: {
    backgroundColor: '#1f1612',
    borderWidth: 1,
    borderColor: '#32231b',
    borderRadius: 14,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e5d4c0',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#32231b',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#251b16',
  },
  metaLabel: {
    fontSize: 14,
    color: '#b3a290',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    color: '#e5d4c0',
    fontWeight: '700',
  },
  expandableHeader: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  expandableTitle: {
    fontSize: 14,
    color: '#8c583e',
    fontWeight: '600',
  },
  advancedCard: {
    backgroundColor: '#19120e',
    borderWidth: 1,
    borderColor: '#2b1e17',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  advancedSecTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e5d4c0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hashBlock: {
    gap: 4,
  },
  hashLabel: {
    fontSize: 12,
    color: '#6c9a75',
    fontWeight: '700',
  },
  hashValue: {
    fontSize: 12,
    color: '#b3a290',
    fontFamily: 'monospace',
    backgroundColor: '#110c0a',
    padding: 6,
    borderRadius: 4,
  },
  actionContainer: {
    backgroundColor: '#1f1612',
    borderWidth: 1,
    borderColor: '#32231b',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  actionDesc: {
    fontSize: 13,
    color: '#b3a290',
    textAlign: 'center',
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: '#8c583e',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#5c3d2e',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
