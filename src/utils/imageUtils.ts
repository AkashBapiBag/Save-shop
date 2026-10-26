import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface PickedImageResult {
  uri: string;
  base64: string; // Base64 string for API payload
  dataUri: string; // Formatted data URI for Image preview
}

/**
 * Normalizes any image representation (URL, file URI, data URI, or raw base64)
 * into a valid URI string that React Native <Image> can render.
 */
export const formatImageUri = (base64OrUrl?: string | null): string | null => {
  if (!base64OrUrl || typeof base64OrUrl !== 'string') return null;
  const trimmed = base64OrUrl.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  // If it is raw base64 string, default to png data URI
  return `data:image/png;base64,${trimmed}`;
};

/**
 * Launches the device image library with a strict 1:1 square aspect ratio crop.
 */
export const pickSquareImageFromLibrary = async (): Promise<PickedImageResult | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to select a store logo.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Strictly 1:1 square ratio
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const rawBase64 = asset.base64 || '';
    const dataUri = rawBase64
      ? `data:image/jpeg;base64,${rawBase64}`
      : asset.uri;

    return {
      uri: asset.uri,
      base64: rawBase64,
      dataUri,
    };
  } catch (err: any) {
    Alert.alert('Image Picker Error', err?.message || 'Failed to select image.');
    return null;
  }
};

/**
 * Launches the device camera with a strict 1:1 square aspect ratio crop.
 */
export const captureSquareImageFromCamera = async (): Promise<PickedImageResult | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to photograph your store logo.'
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Strictly 1:1 square ratio
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const rawBase64 = asset.base64 || '';
    const dataUri = rawBase64
      ? `data:image/jpeg;base64,${rawBase64}`
      : asset.uri;

    return {
      uri: asset.uri,
      base64: rawBase64,
      dataUri,
    };
  } catch (err: any) {
    Alert.alert('Camera Error', err?.message || 'Failed to capture photo.');
    return null;
  }
};

/**
 * Launches the device image library for selecting an authorized signature.
 */
export const pickSignatureImageFromLibrary = async (): Promise<PickedImageResult | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to select a signature image.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const rawBase64 = asset.base64 || '';
    const dataUri = rawBase64
      ? `data:image/png;base64,${rawBase64}`
      : asset.uri;

    return {
      uri: asset.uri,
      base64: rawBase64,
      dataUri,
    };
  } catch (err: any) {
    Alert.alert('Image Picker Error', err?.message || 'Failed to select signature image.');
    return null;
  }
};

/**
 * Launches the device camera for photographing an authorized signature on paper.
 */
export const captureSignatureImageFromCamera = async (): Promise<PickedImageResult | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to photograph your signature.'
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const rawBase64 = asset.base64 || '';
    const dataUri = rawBase64
      ? `data:image/png;base64,${rawBase64}`
      : asset.uri;

    return {
      uri: asset.uri,
      base64: rawBase64,
      dataUri,
    };
  } catch (err: any) {
    Alert.alert('Camera Error', err?.message || 'Failed to capture signature photo.');
    return null;
  }
};
