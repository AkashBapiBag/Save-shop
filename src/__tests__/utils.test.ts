import { describe, it, expect, vi } from 'vitest';
import {
  getFutureDate,
  generateUniqueBatchLotId,
  generateUniqueConsignmentBatchId,
} from '@/utils/batchIdUtils';
import { numberToWordsINR } from '@/utils/numberToWords';
import {
  getErrorMessage,
  formatError,
  showErrorAlert,
  logError,
} from '@/utils/errorHandler';
import {
  formatImageUri,
  pickSquareImageFromLibrary,
  captureSquareImageFromCamera,
  pickSignatureImageFromLibrary,
  captureSignatureImageFromCamera,
} from '@/utils/imageUtils';
import { APIError } from '@/services/api';
import { Alert } from 'react-native';

describe('batchIdUtils', () => {
  it('should return future date in YYYY-MM-DD format', () => {
    const dateStr = getFutureDate(30);
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should generate a unique lot identifier with clean store and product name', () => {
    const lotId = generateUniqueBatchLotId('My Super Store!', 'Organic Apple');
    expect(lotId).toContain('MYSUPERS');
    expect(lotId).toContain('ORGANI');
  });

  it('should fallback to defaults when store and product names are empty or null', () => {
    const lotId = generateUniqueBatchLotId(null, null);
    expect(lotId).toContain('STORE');
  });

  it('should generate a bulk consignment batch identifier', () => {
    const bulkId = generateUniqueConsignmentBatchId('Downtown Market');
    expect(bulkId).toContain('DOWNTOWN-BULK');
  });

  it('should fallback to STORE for bulk batch identifier if store is empty', () => {
    const bulkId = generateUniqueConsignmentBatchId('');
    expect(bulkId).toContain('STORE-BULK');
  });
});

describe('numberToWordsINR', () => {
  it('should convert 0 to zero', () => {
    expect(numberToWordsINR(0)).toBe('Zero Rupees only');
  });

  it('should handle isNaN amounts', () => {
    expect(numberToWordsINR('invalid')).toBe('Zero Rupees only');
  });

  it('should handle negative numbers', () => {
    expect(numberToWordsINR(-100)).toBe('Negative One Hundred Rupees only');
  });

  it('should handle singular 1 Rupee', () => {
    expect(numberToWordsINR(1)).toBe('One Rupee only');
  });

  it('should convert hundreds and tens', () => {
    expect(numberToWordsINR(125)).toBe('One Hundred and Twenty Five Rupees only');
  });

  it('should convert thousands', () => {
    expect(numberToWordsINR(1500)).toBe('One Thousand Five Hundred Rupees only');
  });

  it('should convert lakhs', () => {
    expect(numberToWordsINR(150000)).toBe('One Lakh Fifty Thousand Rupees only');
  });

  it('should convert crores', () => {
    expect(numberToWordsINR(10000000)).toBe('One Crore Rupees only');
  });

  it('should handle paise only', () => {
    expect(numberToWordsINR(0.50)).toBe('Fifty Paisa only');
  });

  it('should handle rupees and paise', () => {
    expect(numberToWordsINR(100.50)).toBe('One Hundred Rupees and Fifty Paisa only');
  });

  it('should handle zero, near-zero, singular rupee, negative and NaN', () => {
    expect(numberToWordsINR(0)).toBe('Zero Rupees only');
    expect(numberToWordsINR(0.001)).toBe('Zero Rupees only');
    expect(numberToWordsINR(1)).toBe('One Rupee only');
    expect(numberToWordsINR(-25)).toBe('Negative Twenty Five Rupees only');
    expect(numberToWordsINR(NaN)).toBe('Zero Rupees only');
    expect(numberToWordsINR('invalid')).toBe('Zero Rupees only');
  });
});

describe('errorHandler', () => {
  it('getErrorMessage returns fallback when error is null/undefined', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
  });

  it('getErrorMessage extracts message from APIError', () => {
    const err = new APIError('Server crashed', 'SERVER_ERROR', 500);
    expect(getErrorMessage(err)).toBe('Server crashed');
  });

  it('getErrorMessage extracts message from standard Error', () => {
    const err = new Error('Generic error');
    expect(getErrorMessage(err)).toBe('Generic error');
  });

  it('getErrorMessage extracts string error', () => {
    expect(getErrorMessage('Simple text error')).toBe('Simple text error');
  });

  it('getErrorMessage extracts message from object with message or detail', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
    expect(getErrorMessage({ detail: 'FastAPI detail' })).toBe('FastAPI detail');
    expect(getErrorMessage({})).toBe('An unexpected error occurred');
  });

  it('formatError classifies network, timeout, auth, 404 and validation errors', () => {
    const netErr = new APIError('Cannot connect', 'NETWORK_ERROR', 0);
    expect(formatError(netErr).title).toBe('Network Connection Error');

    const timeoutErr = new APIError('Timeout', 'TIMEOUT_ERROR', 0);
    expect(formatError(timeoutErr).title).toBe('Request Timed Out');

    const authErr = new APIError('Forbidden', 'AUTH_ERROR', 403);
    expect(formatError(authErr).title).toBe('Access Denied');

    const notFoundErr = new APIError('Missing', 'NOT_FOUND', 404);
    expect(formatError(notFoundErr).title).toBe('Resource Not Found');

    const valErr = new APIError('Invalid', 'VALIDATION_ERROR', 422);
    expect(formatError(valErr).title).toBe('Validation Failed');

    const stdErr = new Error('Standard failure');
    expect(formatError(stdErr).title).toBe('Error');
    expect(formatError(stdErr).message).toBe('Standard failure');

    expect(formatError('Literal string').message).toBe('Literal string');
    expect(formatError(12345).message).toBe('An unexpected error occurred');
  });

  it('getErrorMessage handles empty messages in APIError and Error', () => {
    const apiErrEmpty = new APIError('', 'CODE');
    expect(getErrorMessage(apiErrEmpty, 'Default Fallback')).toBe('Default Fallback');

    const errEmpty = new Error('');
    expect(getErrorMessage(errEmpty, 'Default Fallback')).toBe('Default Fallback');
  });

  it('showErrorAlert triggers Alert.alert with formatted error', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    showErrorAlert(new Error('Sample alert error'), 'Custom Title');
    expect(alertSpy).toHaveBeenCalledWith('Custom Title', 'Sample alert error');

    showErrorAlert('');
    expect(alertSpy).toHaveBeenCalledWith('Operation Failed', 'Please verify connection and try again.');
    alertSpy.mockRestore();
  });

  it('logError logs context without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logError('TestContext', new Error('Logged warning'));
    expect(consoleSpy).toHaveBeenCalledWith('[TestContext]', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('imageUtils', () => {
  it('formatImageUri handles null and non-string', () => {
    expect(formatImageUri(null)).toBeNull();
    expect(formatImageUri(undefined)).toBeNull();
    expect(formatImageUri('' as any)).toBeNull();
  });

  it('formatImageUri returns valid http, https, data, file, content, blob URIs untouched', () => {
    expect(formatImageUri('http://example.com/logo.png')).toBe('http://example.com/logo.png');
    expect(formatImageUri('https://example.com/logo.png')).toBe('https://example.com/logo.png');
    expect(formatImageUri('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
    expect(formatImageUri('file:///var/image.png')).toBe('file:///var/image.png');
    expect(formatImageUri('content://media/1')).toBe('content://media/1');
    expect(formatImageUri('blob:http://localhost/123')).toBe('blob:http://localhost/123');
  });

  it('formatImageUri wraps raw base64 into data URI', () => {
    expect(formatImageUri('iVBORw0KGgoAAAANSUhEUg==')).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
  });

  it('pickSquareImageFromLibrary calls ImagePicker and formats result', async () => {
    const result = await pickSquareImageFromLibrary();
    expect(result).not.toBeNull();
    expect(result?.uri).toBe('file://img.png');
    expect(result?.base64).toBe('sampleBase64');
  });

  it('pickSquareImageFromLibrary handles permission denied, canceled, missing base64, and error', async () => {
    const picker = await import('expo-image-picker');
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Denied permission
    vi.mocked(picker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ status: 'denied' as any, granted: false, canAskAgain: true, expires: 'never' });
    const res1 = await pickSquareImageFromLibrary();
    expect(res1).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Permission Required', expect.any(String));

    // Canceled
    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    const res2 = await pickSquareImageFromLibrary();
    expect(res2).toBeNull();

    // No base64 fallback to uri
    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://fallback.png', base64: null } as any],
    });
    const res3 = await pickSquareImageFromLibrary();
    expect(res3?.dataUri).toBe('file://fallback.png');

    // Exception caught
    vi.mocked(picker.launchImageLibraryAsync).mockRejectedValueOnce(new Error('Device picker crashed'));
    const res4 = await pickSquareImageFromLibrary();
    expect(res4).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Image Picker Error', 'Device picker crashed');

    alertSpy.mockRestore();
  });

  it('captureSquareImageFromCamera handles permission denied, canceled, missing base64, and error', async () => {
    const picker = await import('expo-image-picker');
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Denied permission
    vi.mocked(picker.requestCameraPermissionsAsync).mockResolvedValueOnce({ status: 'denied' as any, granted: false, canAskAgain: true, expires: 'never' });
    const res1 = await captureSquareImageFromCamera();
    expect(res1).toBeNull();

    // Canceled
    vi.mocked(picker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    const res2 = await captureSquareImageFromCamera();
    expect(res2).toBeNull();

    // Missing base64 fallback to uri
    vi.mocked(picker.launchCameraAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://camera_fallback.png', base64: null } as any],
    });
    const resCameraFallback = await captureSquareImageFromCamera();
    expect(resCameraFallback?.dataUri).toBe('file://camera_fallback.png');

    // Exception caught
    vi.mocked(picker.launchCameraAsync).mockRejectedValueOnce(new Error('Camera broken'));
    const res3 = await captureSquareImageFromCamera();
    expect(res3).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Camera Error', 'Camera broken');

    alertSpy.mockRestore();
  });

  it('pickSignatureImageFromLibrary handles permission denied, canceled, missing base64, and error', async () => {
    const picker = await import('expo-image-picker');
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});

    vi.mocked(picker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ status: 'denied' as any, granted: false, canAskAgain: true, expires: 'never' });
    const res1 = await pickSignatureImageFromLibrary();
    expect(res1).toBeNull();

    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    const res2 = await pickSignatureImageFromLibrary();
    expect(res2).toBeNull();

    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://sig.png', base64: null } as any],
    });
    const res3 = await pickSignatureImageFromLibrary();
    expect(res3?.dataUri).toBe('file://sig.png');

    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://sig.png', base64: 'abc1234' } as any],
    });
    const resBase64 = await pickSignatureImageFromLibrary();
    expect(resBase64?.dataUri).toBe('data:image/png;base64,abc1234');

    vi.mocked(picker.launchImageLibraryAsync).mockRejectedValueOnce(new Error('Sig pick failed'));
    const res4 = await pickSignatureImageFromLibrary();
    expect(res4).toBeNull();

    alertSpy.mockRestore();
  });

  it('captureSignatureImageFromCamera handles permission denied, canceled, missing base64, and error', async () => {
    const picker = await import('expo-image-picker');
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});

    vi.mocked(picker.requestCameraPermissionsAsync).mockResolvedValueOnce({ status: 'denied' as any, granted: false, canAskAgain: true, expires: 'never' });
    const res1 = await captureSignatureImageFromCamera();
    expect(res1).toBeNull();

    vi.mocked(picker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    const res2 = await captureSignatureImageFromCamera();
    expect(res2).toBeNull();

    vi.mocked(picker.launchCameraAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://sig_cam.png', base64: null } as any],
    });
    const res3 = await captureSignatureImageFromCamera();
    expect(res3?.dataUri).toBe('file://sig_cam.png');

    vi.mocked(picker.launchCameraAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://sig_cam.png', base64: 'cam1234' } as any],
    });
    const resCamBase64 = await captureSignatureImageFromCamera();
    expect(resCamBase64?.dataUri).toBe('data:image/png;base64,cam1234');

    vi.mocked(picker.launchCameraAsync).mockRejectedValueOnce(new Error('Camera hardware fault'));
    const res4 = await captureSignatureImageFromCamera();
    expect(res4).toBeNull();

    alertSpy.mockRestore();
  });
});
