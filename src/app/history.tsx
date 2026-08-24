import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HistoryStorage } from '../storage/history';
import { HistoryItem } from '../types';

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    const data = await HistoryStorage.getHistory();
    setHistory(data);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const getDisplayLabel = (className: string): string => {
    if (className === 'Fitoptora') return 'Fitóftora';
    if (className === 'Sana') return 'Sana';
    if (className === 'Plaga_Chinche') return 'Daño por chinche';
    if (className === 'Monilia') return 'Moniliasis';
    return className;
  };

  const viewDetail = (item: HistoryItem) => {
    // Reconstruct a PipelineResult representation to reuse the ResultScreen
    const resultObj = {
      segmentation: {
        detected: true,
        confidence: item.confidence,
        inferenceSize: 640 as const,
        inferenceMs: 0,
      },
      classification: {
        classId: 0, // Mock id
        className: item.predictedClass,
        displayName: getDisplayLabel(item.predictedClass),
        confidence: item.confidence,
        probabilities: item.probabilities,
        inferenceMs: 0,
      },
      totalMs: item.totalInferenceMs,
      originalImageUri: item.originalImageUri,
      preprocessedImageUri: item.preprocessedImageUri,
    };

    router.push({
      pathname: '/result',
      params: { resultJson: JSON.stringify(resultObj) },
    });
  };

  const confirmDeleteOne = (id: string) => {
    Alert.alert(
      'Eliminar Registro',
      '¿Estás seguro de que quieres eliminar este análisis?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            await HistoryStorage.deleteRecord(id);
            loadHistory();
          } 
        }
      ]
    );
  };

  const confirmClearAll = () => {
    if (history.length === 0) return;
    Alert.alert(
      'Borrar Todo el Historial',
      '¿Estás seguro de que quieres eliminar todos los registros guardados? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Borrar Todo', 
          style: 'destructive',
          onPress: async () => {
            await HistoryStorage.clearHistory();
            loadHistory();
          } 
        }
      ]
    );
  };

  const formatLocalDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial Local</Text>
          <TouchableOpacity 
            style={[styles.clearButton, history.length === 0 && styles.clearButtonDisabled]} 
            onPress={confirmClearAll}
            disabled={history.length === 0}
          >
            <Text style={[styles.clearButtonText, history.length === 0 && styles.clearButtonTextDisabled]}>Borrar todo</Text>
          </TouchableOpacity>
        </View>

        {/* Content List */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.infoText}>Cargando historial...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>Sin registros aún</Text>
            <Text style={styles.emptySubtitle}>Las clasificaciones exitosas que realices se guardarán automáticamente aquí.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/camera')}>
              <Text style={styles.primaryButtonText}>Analizar una mazorca</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <TouchableOpacity 
                  style={styles.cardClickable} 
                  activeOpacity={0.7}
                  onPress={() => viewDetail(item)}
                >
                  {/* Thumbnail */}
                  <Image 
                    source={{ uri: item.preprocessedImageUri || item.originalImageUri }} 
                    style={styles.thumbnail} 
                  />

                  {/* Summary details */}
                  <View style={styles.details}>
                    <Text style={styles.cardClass}>{getDisplayLabel(item.predictedClass)}</Text>
                    <Text style={styles.cardDate}>{formatLocalDate(item.date)}</Text>
                    <Text style={styles.cardMeta}>
                      Confianza: {(item.confidence * 100).toFixed(1)}% • {item.totalInferenceMs} ms
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Delete button */}
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => confirmDeleteOne(item.id)}
                >
                  <Text style={styles.deleteIconText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}

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
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#d9534f', // Red action text
    fontWeight: '600',
  },
  clearButtonTextDisabled: {
    color: '#5c4b40',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#b3a290',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e5d4c0',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#b3a290',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#8c583e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1f1612',
    borderWidth: 1,
    borderColor: '#32231b',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 14,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#16110e',
    resizeMode: 'cover',
  },
  details: {
    flex: 1,
    gap: 3,
  },
  cardClass: {
    fontSize: 16,
    fontWeight: '800',
    color: '#e5d4c0',
  },
  cardDate: {
    fontSize: 11,
    color: '#6e5e53',
  },
  cardMeta: {
    fontSize: 12,
    color: '#b3a290',
  },
  deleteButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconText: {
    color: '#5c4b40',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
