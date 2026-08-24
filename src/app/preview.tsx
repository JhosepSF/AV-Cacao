import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageUri = params.imageUri as string;

  if (!imageUri) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se proporcionó ninguna imagen.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <Text style={styles.backButtonText}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startProcessing = () => {
    router.replace({
      pathname: '/processing',
      params: { imageUri },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Confirmar Imagen</Text>
          <Text style={styles.headerSubtitle}>Asegúrate de que la mazorca esté bien centrada</Text>
        </View>

        {/* Image Display */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUri }} style={styles.image} />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.confirmButton} 
            activeOpacity={0.8}
            onPress={startProcessing}
          >
            <Text style={styles.confirmButtonText}>Confirmar análisis</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.retakeButton} 
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Text style={styles.retakeButtonText}>Volver a capturar</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e5d4c0',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#b3a290',
  },
  imageWrapper: {
    flex: 1,
    marginVertical: 30,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3e2e25',
    backgroundColor: '#261c17',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#8c583e', // Warm cocoa brown
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  retakeButton: {
    backgroundColor: '#261c17',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3e2e25',
  },
  retakeButtonText: {
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
  backButton: {
    backgroundColor: '#8c583e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
