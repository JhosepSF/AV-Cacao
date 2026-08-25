import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.infoText}>Cargando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar style="light" />
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
          <Text style={styles.permissionText}>
            Para analizar la mazorca de cacao directamente con tu teléfono, necesitamos acceder a la cámara trasera.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Conceder permiso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current && !isTakingPhoto) {
      try {
        setIsTakingPhoto(true);
        console.log('[camera] Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0,
          skipProcessing: false, // Ensures EXIF is correctly preserved
        });
        if (photo && photo.uri) {
          console.log('[camera] Photo captured:', photo.uri);
          // Navigate to preview screen with the photo URI
          router.push({
            pathname: '/preview',
            params: { imageUri: photo.uri },
          });
        }
      } catch (e) {
        console.error('[camera] Error taking photo:', e);
      } finally {
        setIsTakingPhoto(false);
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1.0,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('[camera] Gallery image selected:', uri);
        router.push({
          pathname: '/preview',
          params: { imageUri: uri },
        });
      }
    } catch (e) {
      console.error('[camera] Error picking gallery image:', e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />
      
      {/* Overlay guiding UI positioned absolutely on top */}
      <View style={[StyleSheet.absoluteFill, styles.overlayContainer]}>
        {/* Top banner */}
        <View style={styles.topBanner}>
          <Text style={styles.bannerText}>Coloca la mazorca de cacao en el centro</Text>
        </View>

        {/* Central Guide Grid / Oval */}
        <View style={styles.guideContainer}>
          <View style={styles.guideOval} />
        </View>

        {/* Bottom control bar */}
        <View style={styles.controlBar}>
          {/* Gallery button */}
          <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
            <View style={styles.galleryIconInner} />
            <Text style={styles.controlText}>Galería</Text>
          </TouchableOpacity>

          {/* Shutter button */}
          <TouchableOpacity 
            style={[styles.shutterButton, isTakingPhoto && styles.shutterButtonDisabled]} 
            onPress={takePhoto}
            disabled={isTakingPhoto}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16110e',
  },
  infoText: {
    fontSize: 16,
    color: '#e5d4c0',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#16110e',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e5d4c0',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#b3a290',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#8c583e',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#261c17',
    width: '100%',
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
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBanner: {
    backgroundColor: 'rgba(22, 17, 14, 0.75)',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 15,
    color: '#e5d4c0',
    fontWeight: '600',
    textAlign: 'center',
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideOval: {
    width: 250,
    height: 400,
    borderRadius: 125,
    borderWidth: 2.5,
    borderColor: '#8c583e',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  controlBar: {
    backgroundColor: 'rgba(22, 17, 14, 0.85)',
    paddingBottom: 40,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  galleryButton: {
    alignItems: 'center',
    gap: 6,
    width: 80,
  },
  galleryIconInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e5d4c0',
    backgroundColor: 'transparent',
  },
  controlText: {
    color: '#e5d4c0',
    fontSize: 12,
    fontWeight: '600',
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#8c583e', // Cocoa brown shutter center
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    alignItems: 'center',
    width: 80,
  },
  cancelText: {
    color: '#e5d4c0',
    fontSize: 15,
    fontWeight: '600',
  },
});
