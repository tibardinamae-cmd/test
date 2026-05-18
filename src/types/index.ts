export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  photo: string;
  available: boolean;
  created_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  menu_item_id?: number;
  menuItemId: string;
  item_name?: string;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'gcash';
export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled' | 'refunded';

export interface Order {
  id: number;
  order_code: string;
  user_id: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  reference_code?: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  created_at?: string;
}

export interface Refund {
  id: number;
  refund_code: string;
  order_id: number;
  user_id: number;
  user_name: string;
  reason: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
