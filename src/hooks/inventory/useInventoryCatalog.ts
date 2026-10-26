import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/types/api';
import { inventoryApi } from '@/services/api';
import { CategoryStat } from '@/components/SearchableCategorySelect';
import { logError } from '@/utils/errorHandler';

export function useInventoryCatalog() {
  const { activeStore } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Compute existing categories with counts purely from database products (no hardcoded list)
  const existingCategoryStats = useMemo<CategoryStat[]>(() => {
    const counts = new Map<string, number>();
    const safeProducts = Array.isArray(products) ? products : [];
    safeProducts.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  const loadCatalog = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    }
    try {
      const data = await inventoryApi.listProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      logError('useInventoryCatalog:loadCatalog', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activeStoreId = activeStore?.store_id;

  useEffect(() => {
    let isMounted = true;
    inventoryApi
      .listProducts()
      .then((data) => {
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          logError('useInventoryCatalog:loadCatalog', err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeStoreId]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, search]);

  return {
    activeStore,
    products,
    setProducts,
    search,
    setSearch,
    isLoading,
    existingCategoryStats,
    filteredProducts,
    loadCatalog,
  };
}
