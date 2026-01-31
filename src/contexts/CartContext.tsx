import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUser } from '@clerk/clerk-react';
import { elegantAPI } from '@/lib/elegant-api';

export interface CartItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  quantity: number;
  maxQuantity?: number;
  itemType?: string;
  sku?: string;
  cartItemId?: string; // API cart item ID for authenticated users (UUID)
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, user } = useUser();
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shopping-cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load cart from API when user signs in and merge with localStorage cart
  useEffect(() => {
    const migrateAndLoadCart = async () => {
      if (isSignedIn && user?.id) {
        setIsLoading(true);
        try {
          // Get localStorage cart (guest cart)
          const localStorageData = localStorage.getItem('shopping-cart');
          const localCart: CartItem[] = localStorageData ? JSON.parse(localStorageData) : [];
          
          // Get API cart
          const apiCartResponse = await elegantAPI.getCartItems(user.id);
          const apiCartItems = apiCartResponse?.items || [];
          
          // Map cart items with embedded _items details
          const formattedApiCart: CartItem[] = apiCartItems.map((cartItem: any) => {
            const itemDetails = cartItem._items;
            
            // Get display image from item_info
            const displayImage = itemDetails?.item_info?.image?.[0] || '';
            
            return {
              id: cartItem.items_id,
              slug: itemDetails?.slug || '',
              title: itemDetails?.title || '',
              description: itemDetails?.description || '',
              price: cartItem.price,
              currency: itemDetails?.currency || 'USD',
              image: displayImage,
              quantity: cartItem.quantity,
              maxQuantity: itemDetails?.min_quantity,
              itemType: itemDetails?.item_type,
              cartItemId: cartItem.id
            };
          });

          // Merge carts: API cart + local cart
          const mergedCart = mergeCartItems(formattedApiCart, localCart);
          
          // If there were local items, sync them to API
          if (localCart.length > 0) {
            await syncLocalItemsToAPI(localCart, formattedApiCart, user.id);
            toast.success(`Merged ${localCart.length} item(s) from your guest cart`);
            
            // Clear localStorage after successful migration
            localStorage.removeItem('shopping-cart');
            
            // Redirect to cart page for checkout
            window.location.href = '/cart';
          }
          
          setItems(mergedCart);
        } catch (error) {
          console.error('Failed to migrate cart:', error);
          toast.error('Failed to sync cart items');
        } finally {
          setIsLoading(false);
        }
      }
    };

    migrateAndLoadCart();
  }, [isSignedIn, user?.id]);

  // Helper function to merge cart items
  const mergeCartItems = (apiCart: CartItem[], localCart: CartItem[]): CartItem[] => {
    const mergedMap = new Map<number, CartItem>();
    
    // Add API cart items first (they have cartItemId)
    apiCart.forEach(item => mergedMap.set(item.id, item));
    
    // Merge local cart items
    localCart.forEach(localItem => {
      const existing = mergedMap.get(localItem.id);
      if (existing) {
        // Item exists in both - combine quantities
        const newQuantity = Math.min(
          existing.quantity + localItem.quantity,
          localItem.maxQuantity || Infinity
        );
        mergedMap.set(localItem.id, {
          ...existing,
          quantity: newQuantity
        });
      } else {
        // New item from local cart
        mergedMap.set(localItem.id, localItem);
      }
    });
    
    return Array.from(mergedMap.values());
  };

  // Helper function to sync local items to API
  const syncLocalItemsToAPI = async (
    localCart: CartItem[], 
    apiCart: CartItem[], 
    userId: string
  ) => {
    const syncPromises = localCart.map(async (localItem) => {
      const existingApiItem = apiCart.find(item => item.id === localItem.id);
      
      if (existingApiItem) {
        // Update existing item quantity
        const newQuantity = Math.min(
          existingApiItem.quantity + localItem.quantity,
          localItem.maxQuantity || Infinity
        );
        
        await elegantAPI.updateCartItem(userId, existingApiItem.cartItemId!, {
          price: localItem.price,
          quantity: newQuantity
        });
      } else {
        // Add new item to API with optional bookings_info for Membership items
        const cartItemData: {
          items_id: number;
          price: number;
          quantity: number;
          bookings_info?: Record<string, any>;
        } = {
          items_id: localItem.id,
          price: localItem.price,
          quantity: localItem.quantity
        };

        if (localItem.itemType === 'Membership') {
          const currentDate = new Date().toISOString().split('T')[0];
          cartItemData.bookings_info = {
            membership_paid_date: currentDate,
            membership_type: (localItem as any).sku || ''
          };
        }

        await elegantAPI.addCartItem(userId, cartItemData);
      }
    });

    await Promise.all(syncPromises);
  };

  // Save to localStorage for non-authenticated users
  useEffect(() => {
    if (!isSignedIn) {
      localStorage.setItem('shopping-cart', JSON.stringify(items));
    }
  }, [items, isSignedIn]);

  const addItem = async (newItem: Omit<CartItem, 'quantity'>) => {
    const existingItem = items.find(item => item.id === newItem.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      if (newItem.maxQuantity && newQuantity > newItem.maxQuantity) {
        toast.error('Maximum quantity reached');
        return;
      }
      
      // Update in API if authenticated
      if (isSignedIn && user?.id) {
        try {
          await elegantAPI.updateCartItem(user.id, existingItem.cartItemId!, {
            price: newItem.price,
            quantity: newQuantity
          });
        } catch (error) {
          console.error('Failed to update cart in API:', error);
        }
      }
      
      toast.success('Quantity updated in cart');
      setItems(currentItems =>
        currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
      return;
    }
    
    // Add new item to API if authenticated
    if (isSignedIn && user?.id) {
      try {
        // Build cart item data with optional bookings_info for Membership items
        const cartItemData: {
          items_id: number;
          price: number;
          quantity: number;
          bookings_info?: Record<string, any>;
        } = {
          items_id: newItem.id,
          price: newItem.price,
          quantity: 1
        };

        // Add bookings_info for Membership items
        if (newItem.itemType === 'Membership') {
          const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          cartItemData.bookings_info = {
            membership_paid_date: currentDate,
            membership_type: (newItem as any).sku || ''
          };
        }

        const apiItem = await elegantAPI.addCartItem(user.id, cartItemData);
        
        toast.success('Added to cart');
        setItems(currentItems => [...currentItems, { 
          ...newItem, 
          quantity: 1,
          cartItemId: apiItem.id 
        } as CartItem]);
      } catch (error) {
        console.error('Failed to add to cart via API:', error);
        toast.error('Failed to add to cart');
      }
    } else {
      // Guest user - use localStorage
      toast.success('Added to cart');
      setItems(currentItems => [...currentItems, { ...newItem, quantity: 1 }]);
    }
  };

  const removeItem = async (id: number) => {
    const item = items.find(item => item.id === id);
    
    // Delete from API if authenticated
    if (isSignedIn && user?.id && item?.cartItemId) {
      try {
        await elegantAPI.deleteCartItem(user.id, item.cartItemId);
      } catch (error) {
        console.error('Failed to remove from cart via API:', error);
      }
    }
    
    setItems(currentItems => currentItems.filter(item => item.id !== id));
    toast.success('Removed from cart');
  };

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    
    const item = items.find(item => item.id === id);
    
    if (item?.maxQuantity && quantity > item.maxQuantity) {
      toast.error('Maximum quantity reached');
      return;
    }
    
    // Update in API if authenticated
    if (isSignedIn && user?.id && item?.cartItemId) {
      try {
        await elegantAPI.updateCartItem(user.id, item.cartItemId, {
          price: item.price * quantity, // Send total price (unit price × quantity)
          quantity
        });
      } catch (error) {
        console.error('Failed to update quantity via API:', error);
      }
    }
    
    setItems(currentItems =>
      currentItems.map(item => {
        if (item.id === id) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = async () => {
    // Clear from API if authenticated
    if (isSignedIn && user?.id) {
      try {
        await elegantAPI.clearCart(user.id);
      } catch (error) {
        console.error('Failed to clear cart via API:', error);
      }
    }
    
    setItems([]);
    toast.success('Cart cleared');
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
