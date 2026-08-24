import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { runCacaoPipeline } from '../ml/pipeline';
import { HistoryStorage } from '../storage/history';

interface StepItem {
  id: number;
  label: string;
  matchWords: string[];
  status: 'pending' | 'active' | 'completed';
}

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageUri = params.imageUri as string;

  const [currentProgress, setCurrentProgress] = useState('Inicializando...');
  const [steps, setSteps] = useState<StepItem[]>([
    { id: 1, label: 'Preparando imagen...', matchWords: ['cargando', 'preparando'], status: 'pending' },
    { id: 2, label: 'Detectando mazorca...', matchWords: ['detectando'], status: 'pending' },
    { id: 3, label: 'Segmentando...', matchWords: ['segmentando'], status: 'pending' },
    { id: 4, label: 'Normalizando cacao...', matchWords: ['normalizando'], status: 'pending' },
    { id: 5, label: 'Clasificando estado...', matchWords: ['clasificando'], status: 'pending' },
  ]);

  useEffect(() => {
    if (!imageUri) {
      router.replace('/');
      return;
    }

    const executePipeline = async () => {
      try {
        console.log('[processing] Starting pipeline execution...');
        const result = await runCacaoPipeline(imageUri, (stage) => {
          setCurrentProgress(stage);
          
          // Update visual stepper status based on active step text match
          setSteps((prevSteps) => {
            const activeIdx = prevSteps.findIndex((step) =>
              step.matchWords.some((word) => stage.toLowerCase().includes(word))
            );

            if (activeIdx === -1) return prevSteps;

            return prevSteps.map((step, idx) => {
              if (idx < activeIdx) {
                return { ...step, status: 'completed' as const };
              } else if (idx === activeIdx) {
                return { ...step, status: 'active' as const };
              } else {
                return { ...step, status: 'pending' as const };
              }
            });
          });
        });

        // Set last step to completed
        setSteps((prevSteps) => prevSteps.map((s) => ({ ...s, status: 'completed' as const })));

        // If pipeline was successful and classification exists:
        if (result.classification && !result.error) {
          // Save result to local history storage
          await HistoryStorage.addRecord({
            originalImageUri: result.originalImageUri,
            preprocessedImageUri: result.preprocessedImageUri,
            predictedClass: result.classification.className,
            confidence: result.classification.confidence,
            probabilities: result.classification.probabilities,
            totalInferenceMs: result.totalMs,
          });
        }

        // Clean up the mask Uint8Array from result before stringifying
        // to prevent exceeding route parameter size limits
        const cleanResult = {
          ...result,
          segmentation: {
            detected: result.segmentation.detected,
            confidence: result.segmentation.confidence,
            box: result.segmentation.box,
            inferenceSize: result.segmentation.inferenceSize,
            inferenceMs: result.segmentation.inferenceMs,
          },
        };

        // Redirect to results
        router.replace({
          pathname: '/result',
          params: { resultJson: JSON.stringify(cleanResult) },
        });

      } catch (e: any) {
        console.error('[processing] Pipeline execution failed:', e);
        
        // Clean error response
        const errorResult = {
          segmentation: {
            detected: false,
            inferenceSize: e.segmentation?.inferenceSize || 640,
            inferenceMs: e.segmentation?.inferenceMs || 0,
          },
          totalMs: e.totalMs || 0,
          originalImageUri: imageUri,
          error: e.error || 'Ocurrió un error inesperado durante el procesamiento.',
        };

        router.replace({
          pathname: '/result',
          params: { resultJson: JSON.stringify(errorResult) },
        });
      }
    };

    // Run pipeline with a slight delay to allow UI rendering
    const timeoutId = setTimeout(executePipeline, 500);
    return () => clearTimeout(timeoutId);
  }, [imageUri, router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Analizando Mazorca</Text>
          <Text style={styles.subtitle}>Procesamiento local 100% offline</Text>
        </View>

        {/* Dynamic Stepper */}
        <View style={styles.stepperContainer}>
          {steps.map((step) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.statusCol}>
                {step.status === 'completed' && (
                  <View style={styles.checkDot}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
                {step.status === 'active' && (
                  <ActivityIndicator size="small" color="#6c9a75" />
                )}
                {step.status === 'pending' && (
                  <View style={styles.pendingDot} />
                )}
              </View>
              <Text 
                style={[
                  styles.stepLabel, 
                  step.status === 'active' && styles.stepLabelActive,
                  step.status === 'completed' && styles.stepLabelCompleted
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Bottom Status text */}
        <View style={styles.footer}>
          <ActivityIndicator size="large" color="#8c583e" style={{ marginBottom: 20 }} />
          <Text style={styles.progressText}>{currentProgress}</Text>
          <Text style={styles.cautionText}>
            Por favor, no cierres la app ni bloquees la pantalla.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16110e', // Deep cacao charcoal
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e5d4c0',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c9a75', // leaf green color
    fontWeight: '600',
  },
  stepperContainer: {
    backgroundColor: '#1f1612',
    borderWidth: 1,
    borderColor: '#32231b',
    borderRadius: 16,
    padding: 24,
    gap: 20,
    marginVertical: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusCol: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6c9a75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#16110e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#32231b',
  },
  stepLabel: {
    fontSize: 16,
    color: '#5c4b40',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#e5d4c0',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: '#b3a290',
    textDecorationLine: 'line-through',
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 16,
    color: '#e5d4c0',
    fontWeight: '600',
    textAlign: 'center',
  },
  cautionText: {
    fontSize: 12,
    color: '#5c4b40',
    textAlign: 'center',
  },
});
