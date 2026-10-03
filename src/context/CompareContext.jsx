import React, { createContext, useContext, useState, useEffect } from 'react';
import compareService from '../services/compareService';
import Toast from 'react-native-toast-message';

const CompareContext = createContext();

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState([]);

  useEffect(() => {
    async function load() {
      const initial = await compareService.getCompareList();
      setCompareList(initial);
    }
    load();
  }, []);

  const addToCompare = async (product) => {
    try {
      const updated = await compareService.addToCompare(product);
      setCompareList(updated);
      Toast.show({
        type: 'success',
        text1: 'Added to Compare ⚖️',
        text2: `${product.name} added (${updated.length}/4)`,
        position: 'bottom',
      });
      return true;
    } catch (err) {
      Toast.show({
        type: 'info',
        text1: 'Comparison Limit Reached',
        text2: err.message,
        position: 'bottom',
      });
      return false;
    }
  };

  const removeFromCompare = async (productId) => {
    const updated = await compareService.removeFromCompare(productId);
    setCompareList(updated);
    Toast.show({
      type: 'info',
      text1: 'Removed from Compare',
      position: 'bottom',
    });
  };

  const toggleCompare = async (product) => {
    const pId = product._id || product.id;
    if (isInCompare(pId)) {
      await removeFromCompare(pId);
    } else {
      await addToCompare(product);
    }
  };

  const clearCompare = async () => {
    await compareService.clearCompare();
    setCompareList([]);
    Toast.show({
      type: 'info',
      text1: 'Compare list cleared',
      position: 'bottom',
    });
  };

  const isInCompare = (productId) => {
    return compareList.some((p) => (p._id || p.id) === productId);
  };

  return (
    <CompareContext.Provider
      value={{
        compareList,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        isInCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}

export default CompareContext;
