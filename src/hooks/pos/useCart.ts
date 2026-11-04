import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { Product, CartItem } from '@/types/api';

export interface CartCalculation {
  subtotal: number;
  totalCashback: number;
  discountAmount: number;
  discountPct: number;
  finalTotal: number;
}

export function calculateProductDiscount(product: Product, quantity: number, unitPrice: number) {
  const discVal = Number(product.discount_value || 0);
  const discType = product.discount_type || 'percentage';
  const lineBase = quantity * unitPrice;
  if (discVal <= 0 || lineBase <= 0) {
    return { item_discount_pct: 0, item_discount_amount: 0 };
  }
  if (discType === 'amount') {
    const unitDisc = Math.min(unitPrice, discVal);
    const item_discount_amount = unitDisc * quantity;
    const item_discount_pct = unitPrice > 0 ? (unitDisc / unitPrice) * 100 : 0;
    return { item_discount_pct, item_discount_amount };
  } else {
    const item_discount_pct = Math.min(100, Math.max(0, discVal));
    const item_discount_amount = (lineBase * item_discount_pct) / 100;
    return { item_discount_pct, item_discount_amount };
  }
}

export function calculateProductCashback(
  product: Product,
  quantity: number,
  unitPrice: number,
  fallbackItem?: Partial<CartItem>
) {
  const prodCbVal = Number(product.cashback_value || 0);
  const lineBase = quantity * unitPrice;

  if (prodCbVal > 0) {
    const cbType = product.cashback_type || 'percentage';
    if (cbType === 'amount') {
      const unitCb = Math.min(unitPrice, prodCbVal);
      const cashback_amount = Math.min(lineBase, unitCb * quantity);
      const cashback_pct = unitPrice > 0 ? (unitCb / unitPrice) * 100 : 0;
      return { cashback_type: cbType, cashback_value: prodCbVal, cashback_amount, cashback_pct };
    } else {
      const cashback_pct = Math.min(100, Math.max(0, prodCbVal));
      const cashback_amount = (lineBase * cashback_pct) / 100;
      return { cashback_type: cbType, cashback_value: prodCbVal, cashback_amount, cashback_pct };
    }
  }

  // Fallback to item-level cashback if set (for backward compatibility)
  const itemCbVal = Number(fallbackItem?.cashback_value || 0);
  const itemCbType = fallbackItem?.cashback_type || 'percentage';
  if (itemCbVal > 0 && lineBase > 0) {
    if (itemCbType === 'amount') {
      const cashback_amount = Math.min(lineBase, itemCbVal);
      const cashback_pct = lineBase > 0 ? (cashback_amount / lineBase) * 100 : 0;
      return { cashback_type: itemCbType, cashback_value: itemCbVal, cashback_amount, cashback_pct };
    } else {
      const cashback_pct = Math.min(100, Math.max(0, itemCbVal));
      const cashback_amount = (lineBase * cashback_pct) / 100;
      return { cashback_type: itemCbType, cashback_value: itemCbVal, cashback_amount, cashback_pct };
    }
  }

  return {
    cashback_type: product.cashback_type || 'percentage',
    cashback_value: 0,
    cashback_amount: 0,
    cashback_pct: 0,
  };
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotalDiscountType, setSubtotalDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [subtotalDiscountValue, setSubtotalDiscountValue] = useState<string>('0');

  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.product_id === product.product_id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const item = { ...updated[existingIndex] };
        item.quantity += 1;
        const { item_discount_pct, item_discount_amount } = calculateProductDiscount(
          item.product,
          item.quantity,
          item.unit_price
        );
        const { cashback_type, cashback_value, cashback_amount } = calculateProductCashback(
          item.product,
          item.quantity,
          item.unit_price,
          item
        );
        item.cashback_type = cashback_type;
        item.cashback_value = cashback_value;
        item.cashback_amount = cashback_amount;
        item.item_discount_pct = item_discount_pct;
        item.item_discount_amount = item_discount_amount;
        updated[existingIndex] = item;
        return updated;
      }

      const unitPrice = Number(product.selling_price);
      const { item_discount_pct, item_discount_amount } = calculateProductDiscount(product, 1, unitPrice);
      const { cashback_type, cashback_value, cashback_amount } = calculateProductCashback(product, 1, unitPrice);

      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          unit_price: unitPrice,
          item_discount_pct,
          item_discount_amount,
          category_discount_pct: 0,
          cashback_type,
          cashback_value,
          cashback_amount,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const { item_discount_pct, item_discount_amount } = calculateProductDiscount(
              item.product,
              newQty,
              item.unit_price
            );
            const { cashback_type, cashback_value, cashback_amount } = calculateProductCashback(
              item.product,
              newQty,
              item.unit_price,
              item
            );
            return {
              ...item,
              quantity: newQty,
              cashback_type,
              cashback_value,
              cashback_amount,
              item_discount_pct,
              item_discount_amount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const setQuantity = useCallback((productId: string, exactQty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.product_id === productId) {
            if (exactQty <= 0) return null;
            const finalQty = exactQty;
            const { item_discount_pct, item_discount_amount } = calculateProductDiscount(
              item.product,
              finalQty,
              item.unit_price
            );
            const { cashback_type, cashback_value, cashback_amount } = calculateProductCashback(
              item.product,
              finalQty,
              item.unit_price,
              item
            );
            return {
              ...item,
              quantity: finalQty,
              cashback_type,
              cashback_value,
              cashback_amount,
              item_discount_pct,
              item_discount_amount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const updateItemCashback = useCallback((
    productId: string,
    type: 'amount' | 'percentage',
    valStr: string
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.product_id !== productId) return item;
        const lineBase = item.quantity * item.unit_price;
        let numVal = parseFloat(valStr) || 0;
        if (numVal < 0) numVal = 0;

        if (type === 'percentage') {
          if (numVal > 100) numVal = 100;
          const cbAmount = (lineBase * numVal) / 100;
          return {
            ...item,
            cashback_type: type,
            cashback_value: numVal,
            cashback_amount: cbAmount,
          };
        } else {
          if (numVal > lineBase) numVal = lineBase;
          return {
            ...item,
            cashback_type: type,
            cashback_value: numVal,
            cashback_amount: numVal,
          };
        }
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSubtotalDiscountValue('0');
  }, []);

  const calculation = useMemo<CartCalculation>(() => {
    let subtotal = 0;
    let totalCashback = 0;
    let itemsDiscount = 0;

    cart.forEach((item) => {
      const base = item.quantity * item.unit_price;
      subtotal += base;
      totalCashback += item.cashback_amount || 0;
      itemsDiscount += item.item_discount_amount || 0;
    });

    let discountAmount = itemsDiscount;
    const rawVal = parseFloat(subtotalDiscountValue) || 0;
    if (rawVal > 0) {
      if (subtotalDiscountType === 'percentage') {
        const subtotalPct = Math.min(100, Math.max(0, rawVal));
        discountAmount += ((subtotal - itemsDiscount) * subtotalPct) / 100;
      } else {
        discountAmount += Math.min(subtotal - itemsDiscount, Math.max(0, rawVal));
      }
    }

    const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    const finalTotal = Math.max(0, subtotal - discountAmount);

    return {
      subtotal,
      totalCashback,
      discountAmount,
      discountPct,
      finalTotal,
    };
  }, [cart, subtotalDiscountType, subtotalDiscountValue]);

  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return {
    cart,
    setCart,
    addToCart,
    updateQuantity,
    setQuantity,
    updateItemCashback,
    clearCart,
    subtotalDiscountType,
    setSubtotalDiscountType,
    subtotalDiscountValue,
    setSubtotalDiscountValue,
    calculation,
    totalCartCount,
  };
}
