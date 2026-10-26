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

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotalDiscountType, setSubtotalDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [subtotalDiscountValue, setSubtotalDiscountValue] = useState<string>('0');

  const addToCart = useCallback((product: Product) => {
    const currentStock = Number(product.total_current_stock || 0);
    if (currentStock <= 0) {
      Alert.alert('Out of Stock', `"${product.name}" has 0 available units in inventory.`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.product_id === product.product_id);
      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty + 1 > currentStock) {
          Alert.alert(
            'Stock Limit Reached',
            `Cannot add more. Available stock for "${product.name}" is ${currentStock} ${product.default_unit}.`
          );
          return prevCart;
        }
        const updated = [...prevCart];
        const item = { ...updated[existingIndex] };
        item.quantity += 1;
        const lineBase = item.quantity * item.unit_price;
        item.cashback_amount =
          item.cashback_type === 'percentage'
            ? (lineBase * item.cashback_value) / 100
            : Math.min(lineBase, item.cashback_value);
        updated[existingIndex] = item;
        return updated;
      }

      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          unit_price: Number(product.selling_price),
          item_discount_pct: 0,
          category_discount_pct: 0,
          cashback_type: 'percentage',
          cashback_value: 0,
          cashback_amount: 0,
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
            const currentStock = Number(item.product.total_current_stock || 0);
            if (delta > 0 && newQty > currentStock) {
              Alert.alert(
                'Stock Limit Reached',
                `Cannot add more. Available stock for "${item.product.name}" is ${currentStock} ${item.product.default_unit}.`
              );
              return item;
            }
            const lineBase = newQty * item.unit_price;
            const cbAmount =
              item.cashback_type === 'percentage'
                ? (lineBase * item.cashback_value) / 100
                : Math.min(lineBase, item.cashback_value);
            return { ...item, quantity: newQty, cashback_amount: cbAmount };
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

    cart.forEach((item) => {
      const base = item.quantity * item.unit_price;
      subtotal += base;
      totalCashback += item.cashback_amount || 0;
    });

    let discountAmount = 0;
    let discountPct = 0;
    const rawVal = parseFloat(subtotalDiscountValue) || 0;

    if (subtotalDiscountType === 'percentage') {
      discountPct = Math.min(100, Math.max(0, rawVal));
      discountAmount = (subtotal * discountPct) / 100;
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, rawVal));
      discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    }

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
