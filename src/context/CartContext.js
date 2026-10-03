import React, { createContext, useContext, useState, useEffect } from 'react';
import cartService from '../services/cartService';
import { useAuth } from './AuthContext';
import Toast from 'react-native-toast-message';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const data = await cartService.getCart();
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setCartItems(items);
    } catch (e) {
      console.warn('Cart load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCartItems([]);
    }
  }, [isAuthenticated]);

  const addToCart = async (product, qty = 1) => {
    try {
      const pId = product._id || product.id;
      if (isAuthenticated) {
        await cartService.addToCart(pId, qty);
        await fetchCart();
      } else {
        setCartItems((prev) => {
          const existing = prev.find((item) => (item.productId?._id || item.productId || item._id) === pId);
          if (existing) {
            return prev.map((item) =>
              (item.productId?._id || item.productId || item._id) === pId
                ? { ...item, qty: (item.qty || 1) + qty }
                : item
            );
          }
          return [
            ...prev,
            {
              _id: 'local_' + Date.now(),
              productId: pId,
              name: product.name || 'Product',
              price: product.price || 0,
              image: product.image || (product.images?.[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) : ''),
              qty,
              savedForLater: false,
            },
          ];
        });
      }
      Toast.show({
        type: 'success',
        text1: 'Added to Cart 🛍️',
        text2: `${product.name || 'Product'} has been added to your cart.`,
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to add',
        text2: err.response?.data?.msg || 'Could not add to cart.',
        position: 'bottom',
      });
    }
  };

  const updateQty = async (itemId, qty) => {
    try {
      if (qty <= 0) {
        return removeFromCart(itemId);
      }
      if (isAuthenticated && !String(itemId).startsWith('local_')) {
        await cartService.updateCartItem(itemId, qty);
        await fetchCart();
      } else {
        setCartItems((prev) =>
          prev.map((item) => (item._id === itemId ? { ...item, qty } : item))
        );
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err.response?.data?.msg || 'Could not update item quantity.',
        position: 'bottom',
      });
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      if (isAuthenticated && !String(itemId).startsWith('local_')) {
        await cartService.removeCartItem(itemId);
        await fetchCart();
      } else {
        setCartItems((prev) => prev.filter((item) => item._id !== itemId));
      }
      Toast.show({
        type: 'info',
        text1: 'Item Removed',
        text2: 'Item removed from your cart.',
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Remove Failed',
        text2: 'Could not remove item.',
        position: 'bottom',
      });
    }
  };

  const saveForLaterItem = async (itemId) => {
    try {
      if (isAuthenticated && !String(itemId).startsWith('local_')) {
        await cartService.saveForLater(itemId);
        await fetchCart();
      } else {
        setCartItems((prev) =>
          prev.map((item) => (item._id === itemId ? { ...item, savedForLater: true } : item))
        );
      }
      Toast.show({
        type: 'info',
        text1: 'Saved For Later',
        text2: 'Moved to your saved items list.',
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: err.response?.data?.msg || 'Could not save item for later.',
        position: 'bottom',
      });
    }
  };

  const moveToCartItem = async (itemId) => {
    try {
      if (isAuthenticated && !String(itemId).startsWith('local_')) {
        await cartService.moveToCart(itemId);
        await fetchCart();
      } else {
        setCartItems((prev) =>
          prev.map((item) => (item._id === itemId ? { ...item, savedForLater: false } : item))
        );
      }
      Toast.show({
        type: 'success',
        text1: 'Moved to Cart 🛍️',
        text2: 'Item is back in your active bag.',
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Move Failed',
        text2: err.response?.data?.msg || 'Could not move item to cart.',
        position: 'bottom',
      });
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Active (in-bag) items vs Saved For Later items
  const activeItems = cartItems.filter((i) => !i.savedForLater);
  const savedItems = cartItems.filter((i) => Boolean(i.savedForLater));

  const cartCount = activeItems.reduce((acc, item) => acc + (Number(item.qty) || 1), 0);
  const cartTotal = activeItems.reduce((acc, item) => {
    const price = Number(item.price || item.productId?.price || 0);
    const qty = Number(item.qty) || 1;
    return acc + price * qty;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems: activeItems,
        savedItems,
        allCartItems: cartItems,
        cartCount,
        cartTotal,
        loading,
        addToCart,
        updateQty,
        removeFromCart,
        saveForLaterItem,
        moveToCartItem,
        clearCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
