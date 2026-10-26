/**
 * Pure utility functions for generating batch/lot identifiers.
 */

export const getFutureDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const generateUniqueBatchLotId = (
  storeName?: string | null,
  productName?: string | null
): string => {
  const now = new Date();

  // Date: YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Time: HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${mins}${secs}`;

  // Clean Store Name (alphanumeric, max 8 chars)
  const cleanStore = storeName
    ? storeName.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()
    : 'STORE';

  // Clean Product Name (alphanumeric, max 6 chars)
  const cleanProd = productName
    ? `-${productName.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`
    : '';

  return `${cleanStore}${cleanProd}-${dateStr}-${timeStr}`;
};

export const generateUniqueConsignmentBatchId = (storeName?: string | null): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${mins}${secs}`;

  const cleanStore = storeName
    ? storeName.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()
    : 'STORE';

  return `${cleanStore}-BULK-${dateStr}-${timeStr}`;
};
