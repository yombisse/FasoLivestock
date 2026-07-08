import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Text,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
  StyleProp,
  ViewStyle,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';

interface AppImagePickerProps {
  onImageSelected: (uri: string, fileName: string, type: string) => void;
  currentImageUri?: string;
  shape?: 'square' | 'circle';
  size?: number;
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppImagePicker: React.FC<AppImagePickerProps> = ({
  onImageSelected,
  currentImageUri,
  shape = 'square',
  size = 120,
  placeholder = 'Ajouter une photo',
  disabled = false,
  style,
}) => {
  const [showActionSheet, setShowActionSheet] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      console.log('Camera permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Camera permission error:', err);
      return false;
    }
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 13+ uses READ_MEDIA_IMAGES, older versions use READ_EXTERNAL_STORAGE
      const permission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      if (!permission) return true;

      const granted = await PermissionsAndroid.request(permission);
      console.log('Gallery permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Gallery permission error:', err);
      return false;
    }
  };

  const checkPermissionStatus = async (permission: string): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const status = await PermissionsAndroid.check(permission as any);
      return status;
    } catch (err) {
      console.error('Permission check error:', err);
      return false;
    }
  };

  const handleCameraPress = async () => {
    setShowActionSheet(false);

    if (Platform.OS === 'android') {
      const hasPermission = await checkPermissionStatus(PermissionsAndroid.PERMISSIONS.CAMERA);
      
      if (!hasPermission) {
        const granted = await requestCameraPermission();
        if (granted) {
          openCamera();
        } else {
          showPermissionDeniedAlert('caméra');
        }
        return;
      }
    }

    openCamera();
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as any,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, handleImagePickerResponse);
  };

  const handleGalleryPress = async () => {
    setShowActionSheet(false);

    if (Platform.OS === 'android') {
      const permission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      if (permission) {
        const hasPermission = await checkPermissionStatus(permission);
        
        if (!hasPermission) {
          const granted = await requestGalleryPermission();
          if (granted) {
            openGallery();
          } else {
            showPermissionDeniedAlert('galerie');
          }
          return;
        }
      }
    }

    openGallery();
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as any,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: false,
    };

    launchImageLibrary(options, handleImagePickerResponse);
  };

  const handleImagePickerResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      console.error('ImagePicker Error: ', response.errorMessage);
      Alert.alert('Erreur', response.errorMessage || 'Erreur lors de la sélection de l\'image');
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset: Asset = response.assets[0];
      if (asset.uri) {
        onImageSelected(
          asset.uri,
          asset.fileName || 'photo.jpg',
          asset.type || 'image/jpeg'
        );
      }
    }
  };

  const showPermissionDeniedAlert = (type: 'caméra' | 'galerie') => {
    Alert.alert(
      'Permission refusée',
      'Vous avez refusé l\'accès. Activez la permission dans Paramètres > Applications > FasoLivestock.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les Paramètres', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const handlePress = () => {
    if (disabled) return;
    setShowActionSheet(true);
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: shape === 'circle' ? size / 2 : 12,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, containerStyle, style]}
        onPress={handlePress}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        {currentImageUri ? (
          <>
            <Image source={{ uri: currentImageUri }} style={styles.image} resizeMode="cover" />
            <View style={[styles.editBadge, { borderRadius: 12 }]}>
              <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
            </View>
          </>
        ) : (
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons name="camera-plus" size={32} color="#757575" />
            <Text style={styles.placeholder}>{placeholder}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={styles.actionSheet}>
            <TouchableOpacity
              style={styles.actionSheet}
              activeOpacity={1}
            >
              <View style={styles.actionSheetContent}>
                <Text style={styles.actionSheetTitle}>Sélectionner une image</Text>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCameraPress}
                >
                  <MaterialCommunityIcons name="camera" size={24} color="#212121" />
                  <Text style={styles.actionButtonText}>Prendre une photo</Text>
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleGalleryPress}
                >
                  <MaterialCommunityIcons name="image-multiple" size={24} color="#212121" />
                  <Text style={styles.actionButtonText}>Choisir dans la galerie</Text>
                </TouchableOpacity>

                <View style={styles.spacer} />

                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowActionSheet(false)}
                >
                  <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  placeholder: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#2E7D32',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionSheetContent: {
    padding: 16,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  spacer: {
    height: 8,
  },
  cancelButton: {
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
});

export default AppImagePicker;

