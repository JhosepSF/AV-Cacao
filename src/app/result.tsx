import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PipelineResult } from '../types';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const resultJson = params.resultJson as string;

  const [activeTab, setActiveTab] = useState<'original' | 'cacao'>('original');

  if (!resultJson) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se recibió ningún resultado de análisis.</Text>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')}>
          <Text style={styles.homeButtonText}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const result: PipelineResult = JSON.parse(resultJson);
  const error = result.error;
  const isSuccess = !error && result.classification;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Resultado del Análisis</Text>
        </View>

        {isSuccess ? (
          /* SUCCESS STATE */
          <View style={styles.card}>
            
            {/* Visual comparison tabs */}
            {result.preprocessedImageUri && (
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'original' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('original')}
                >
                  <Text style={[styles.tabText, activeTab === 'original' && styles.tabTextActive]}>Imagen Original</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'cacao' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('cacao')}
                >
                  <Text style={[styles.tabText, activeTab === 'cacao' && styles.tabTextActive]}>Segmentado PCA</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Display active image */}
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: activeTab === 'cacao' && result.preprocessedImageUri ? result.preprocessedImageUri : result.originalImageUri }} 
                style={styles.resultImage} 
              />
            </View>

            {/* Classification Summary Card */}
            <View style={styles.resultHeader}>
              <Text style={styles.estimatedClassLabel}>Clasificación estimada</Text>
              <Text style={styles.classNameText}>{result.classification!.displayName}</Text>
              <Text style={styles.confidenceText}>
                Confianza: {(result.classification!.confidence * 100).toFixed(1)}%
              </Text>
            </View>

            {/* Probabilities list */}
            <View style={styles.probsContainer}>
              <Text style={styles.probsTitle}>Distribución de probabilidades</Text>
              
              {result.classification!.probabilities.map((prob) => {
                let label: string = prob.className;
                if (prob.className === 'Fitoptora') label = 'Fitóftora';
                else if (prob.className === 'Sana') label = 'Sana';
                else if (prob.className === 'Plaga_Chinche') label = 'Daño por chinche';
                else if (prob.className === 'Monilia') label = 'Moniliasis';

                const isMainClass = prob.className === result.classification!.className;

                return (
                  <View key={prob.className} style={styles.probRow}>
                    <View style={styles.probLabelRow}>
                      <Text style={[styles.probLabel, isMainClass && styles.probLabelBold]}>
                        {label}
                      </Text>
                      <Text style={[styles.probValue, isMainClass && styles.probValueBold]}>
                        {(prob.probability * 100).toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${prob.probability * 100}%` },
                          isMainClass ? styles.progressFillActive : styles.progressFillSecondary
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Metrics info */}
            <View style={styles.metricsBox}>
              <Text style={styles.metricsText}>
                Inferencia: local/offline
              </Text>
              <Text style={styles.metricsText}>
                Tiempo de procesamiento total: {result.totalMs} ms ({ (result.totalMs / 1000).toFixed(2) } s)
              </Text>
            </View>

          </View>
        ) : (
          /* REJECTION STATE (No mazorca detected) */
          <View style={styles.card}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: result.originalImageUri }} style={styles.resultImage} />
            </View>

            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionTitle}>Mazorca No Detectada</Text>
              <Text style={styles.rejectionText}>
                {error || 'No se pudo segmentar una mazorca de cacao con suficiente confianza en la imagen.'}
              </Text>
            </View>

            <View style={styles.metricsBox}>
              <Text style={styles.metricsText}>
                Intento YOLO: {result.segmentation.inferenceSize}px • {result.segmentation.inferenceMs} ms
              </Text>
            </View>
          </View>
        )}

        {/* Responsible Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            ⚠️ AV-Cacao es una herramienta de apoyo y sus resultados no sustituyen la evaluación de un especialista agrícola.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8}
            onPress={() => router.replace('/camera')}
          >
            <Text style={styles.primaryButtonText}>Analizar otra mazorca</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            activeOpacity={0.8}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e5d4c0',
  },
  card: {
    backgroundColor: '#1f1612',
    borderWidth: 1,
    borderColor: '#32231b',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#16110e',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#8c583e', // Cocoa brown for active tab
  },
  tabText: {
    fontSize: 13,
    color: '#6e5e53',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  imageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#16110e',
    borderWidth: 1,
    borderColor: '#32231b',
    marginBottom: 16,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2b1e19',
  },
  estimatedClassLabel: {
    fontSize: 13,
    color: '#6c9a75', // green leaf accent
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  classNameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e5d4c0',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 15,
    color: '#b3a290',
    fontWeight: '600',
  },
  probsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  probsTitle: {
    fontSize: 14,
    color: '#e5d4c0',
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  probRow: {
    marginBottom: 14,
  },
  probLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  probLabel: {
    fontSize: 14,
    color: '#b3a290',
  },
  probLabelBold: {
    color: '#e5d4c0',
    fontWeight: '700',
  },
  probValue: {
    fontSize: 14,
    color: '#8e7e72',
  },
  probValueBold: {
    color: '#e5d4c0',
    fontWeight: '700',
  },
  progressBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16110e',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFillActive: {
    backgroundColor: '#8c583e', // Cocoa brown for the chosen prediction
  },
  progressFillSecondary: {
    backgroundColor: '#3a2b22', // Muted brown for secondary classes
  },
  metricsBox: {
    backgroundColor: '#16110e',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  metricsText: {
    fontSize: 12,
    color: '#6e5e53',
    fontFamily: 'monospace',
  },
  rejectionBox: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  rejectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#d9534f', // Red error color
    textAlign: 'center',
  },
  rejectionText: {
    fontSize: 14,
    color: '#b3a290',
    textAlign: 'center',
    lineHeight: 22,
  },
  disclaimerContainer: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#8a796e',
    lineHeight: 18,
    textAlign: 'justify',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#8c583e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#261c17',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3e2e25',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5d4c0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16110e',
    padding: 24,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e5d4c0',
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: '#8c583e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
