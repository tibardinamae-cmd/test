import { useState, useEffect } from 'react';
import { User, MenuItem, Order, OrderItem, InventoryItem, Refund, PaymentMethod } from './types';

// ============================================
// API BASE URL - Change if needed
// ============================================
const API_URL = window.location.origin;

async function api(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data from database
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Fetch data from database
  const fetchMenu = async () => {
    const data = await api('/menu');
    if (Array.isArray(data)) setMenu(data);
  };

  const fetchOrders = async () => {
    const url = user?.role === 'user' ? `/orders?userId=${user.id}` : '/orders';
    const data = await api(url);
    if (Array.isArray(data)) setOrders(data);
  };

  const fetchInventory = async () => {
    const data = await api('/inventory');
    if (Array.isArray(data)) setInventory(data);
  };

  const fetchRefunds = async () => {
    const url = user?.role === 'user' ? `/refunds?userId=${user.id}` : '/refunds';
    const data = await api(url);
    if (Array.isArray(data)) setRefunds(data);
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMenu(), fetchOrders(), fetchInventory(), fetchRefunds()]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  // ============================================
  // CART FUNCTIONS
  // ============================================
  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.menuItemId === String(item.id));
    if (existing) {
      setCart(cart.map(c => c.menuItemId === String(item.id) ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { menuItemId: String(item.id), name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ============================================
  // ORDER FUNCTIONS
  // ============================================
  const placeOrder = async (payment: PaymentMethod, refCode?: string) => {
    await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        userId: user?.id,
        items: cart,
        total: cartTotal,
        paymentMethod: payment,
        referenceCode: refCode,
      }),
    });
    setCart([]);
    setShowCheckout(false);
    await fetchOrders();
    setPage('orders');
  };

  const updateOrderStatus = async (id: number, status: string) => {
    await api(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    await fetchOrders();
  };

  const deleteOrder = async (id: number) => {
    await api(`/orders/${id}`, { method: 'DELETE' });
    await fetchOrders();
  };

  // ============================================
  // REFUND FUNCTIONS
  // ============================================
  const requestRefund = async (orderId: number, reason: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await api('/refunds', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          userId: user?.id,
          userName: user?.name,
          reason,
          amount: order.total,
        }),
      });
      await fetchRefunds();
    }
  };

  const updateRefundStatus = async (id: number, status: string) => {
    await api(`/refunds/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    await fetchRefunds();
    await fetchOrders();
  };

  // ============================================
  // INVENTORY FUNCTIONS
  // ============================================
  const addInventory = async (item: any) => {
    await api('/inventory', { method: 'POST', body: JSON.stringify(item) });
    await fetchInventory();
  };

  const updateInventory = async (id: number, item: any) => {
    await api(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(item) });
    await fetchInventory();
  };

  const deleteInventory = async (id: number) => {
    await api(`/inventory/${id}`, { method: 'DELETE' });
    await fetchInventory();
  };

  // ============================================
  // MENU FUNCTIONS
  // ============================================
  const addMenu = async (item: any) => {
    await api('/menu', { method: 'POST', body: JSON.stringify(item) });
    await fetchMenu();
  };

  const updateMenu = async (id: number, item: any) => {
    await api(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) });
    await fetchMenu();
  };

  const deleteMenu = async (id: number) => {
    await api(`/menu/${id}`, { method: 'DELETE' });
    await fetchMenu();
  };

  // ============================================
  // LOGIN
  // ============================================
  if (!user) return <LoginScreen onLogin={async (email, password) => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success) {
      setUser(res.user);
      setPage(res.user.role === 'admin' ? 'dashboard' : 'menu');
    }
    return res;
  }} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading from database...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  if (user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <aside className="fixed left-0 top-0 h-full w-16 lg:w-56 bg-gray-900 z-30">
          <div className="p-4 border-b border-gray-800">
            <span className="hidden lg:block text-white font-semibold">Takoyaki House</span>
            <span className="lg:hidden text-white text-xl">T</span>
          </div>
          <nav className="py-4">
            {['dashboard', 'orders', 'inventory', 'menu', 'refunds'].map(id => (
              <button key={id} onClick={() => setPage(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm ${page === id ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                <span>{id === 'dashboard' ? '📊' : id === 'orders' ? '📋' : id === 'inventory' ? '📦' : id === 'menu' ? '🍽' : '↩'}</span>
                <span className="hidden lg:block">{id.charAt(0).toUpperCase() + id.slice(1)}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => { setUser(null); setPage('dashboard'); }} className="w-full p-4 border-t border-gray-800 text-gray-400 hover:text-white text-left flex items-center gap-3">
            <span>⏻</span>
            <span className="hidden lg:block text-sm">Logout</span>
          </button>
        </aside>

        <main className="ml-16 lg:ml-56 min-h-screen p-4 lg:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{page.charAt(0).toUpperCase() + page.slice(1)}</h1>
            <p className="text-sm text-gray-500">Connected to Aiven Database</p>
          </div>

          {page === 'dashboard' && <DashboardView orders={orders} inventory={inventory} />}
          {page === 'orders' && <OrdersTable orders={orders} onUpdate={updateOrderStatus} onDelete={deleteOrder} />}
          {page === 'inventory' && <InventoryTable inventory={inventory} onAdd={addInventory} onUpdate={updateInventory} onDelete={deleteInventory} />}
          {page === 'menu' && <MenuTable menu={menu} orders={orders} onAdd={addMenu} onUpdate={updateMenu} onDelete={deleteMenu} />}
          {page === 'refunds' && <RefundsTable refunds={refunds} onUpdate={updateRefundStatus} />}
        </main>
      </div>
    );
  }

  // ============================================
  // USER DASHBOARD
  // ============================================
  const userOrders = orders.filter(o => o.user_id === user.id);
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">Takoyaki House</span>
          <nav className="flex items-center gap-1">
            {['menu', 'orders', 'refunds'].map(id => (
              <button key={id} onClick={() => setPage(id)} className={`px-3 py-1.5 rounded text-sm ${page === id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCart(true)} className="relative p-2 text-gray-600 hover:bg-gray-100 rounded">
              🛒
              {cart.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
            </button>
            <button onClick={() => { setUser(null); setPage('dashboard'); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded">⏻</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-24 lg:pb-4">
        {page === 'menu' && <UserMenuView menu={menu} cart={cart} onAdd={addToCart} />}
        {page === 'orders' && <UserOrdersTable orders={userOrders} onRefund={requestRefund} />}
        {page === 'refunds' && <UserRefundsTable refunds={refunds} />}
      </main>

      {showCart && <CartSidebar cart={cart} total={cartTotal} onClose={() => setShowCart(false)} onRemove={(id) => setCart(cart.filter(c => c.menuItemId !== id))} onUpdateQty={(id, d) => setCart(cart.map(c => c.menuItemId === id ? { ...c, quantity: Math.max(0, c.quantity + d) } : c).filter(c => c.quantity > 0))} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} />}
      {showCheckout && <CheckoutModal total={cartTotal} onClose={() => setShowCheckout(false)} onPay={placeOrder} />}
    </div>
  );
}

// ============================================
// LOGIN SCREEN
// ============================================
function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<any> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await onLogin(email, password);
    if (!res.success) setError('Invalid email or password');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Takoyaki House</h1>
          <p className="text-gray-500 text-sm">Hinunangan, Southern Leyte</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-6">Sign In</h2>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            <p className="mb-2">Demo: admin@takoyaki.com / admin123</p>
            <p>Demo: juan@email.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADMIN: DASHBOARD VIEW
// ============================================
function DashboardView({ orders, inventory }: { orders: Order[]; inventory: InventoryItem[] }) {
  const completed = orders.filter(o => o.status === 'completed');
  const totalSales = completed.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const lowStock = inventory.filter(i => i.quantity <= i.min_stock);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border"><p className="text-sm text-gray-500">Total Sales</p><p className="text-2xl font-bold">₱{totalSales.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border"><p className="text-sm text-gray-500">Total Orders</p><p className="text-2xl font-bold">{orders.length}</p></div>
        <div className="bg-white p-4 rounded-lg border"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-orange-500">{pending}</p></div>
        <div className="bg-white p-4 rounded-lg border"><p className="text-sm text-gray-500">Low Stock</p><p className="text-2xl font-bold text-red-500">{lowStock.length}</p></div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-medium text-red-700 mb-2">⚠️ Low Stock Alert</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => <span key={i.id} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">{i.name}: {i.quantity} {i.unit}</span>)}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b font-medium">Recent Orders from Database</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Payment</th><th className="p-3 text-right">Total</th></tr></thead>
          <tbody>
            {orders.slice(0, 5).map(o => (
              <tr key={o.id} className="border-t"><td className="p-3">{o.order_code}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusColor(o.status)}`}>{o.status}</span></td><td className="p-3 uppercase">{o.payment_method}</td><td className="p-3 text-right font-medium">₱{o.total}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// ADMIN: ORDERS TABLE
// ============================================
function OrdersTable({ orders, onUpdate, onDelete }: { orders: Order[]; onUpdate: (id: number, status: string) => void; onDelete: (id: number) => void }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'preparing', 'completed', 'cancelled', 'refunded'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded text-sm ${filter === s ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b font-medium">All Orders from Database ({filtered.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Order Code</th>
                <th className="p-3 text-left">User ID</th>
                <th className="p-3 text-left">Items</th>
                <th className="p-3 text-left">Payment</th>
                <th className="p-3 text-left">Ref Code</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{o.order_code}</td>
                  <td className="p-3">{o.user_id}</td>
                  <td className="p-3 max-w-xs truncate">{o.items?.map(i => i.item_name).join(', ') || '-'}</td>
                  <td className="p-3 uppercase">{o.payment_method}</td>
                  <td className="p-3 font-mono text-xs">{o.reference_code || '-'}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusColor(o.status)}`}>{o.status}</span></td>
                  <td className="p-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right font-medium">₱{o.total}</td>
                  <td className="p-3 text-center space-x-1">
                    {o.status === 'pending' && <button onClick={() => onUpdate(o.id, 'preparing')} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">Prepare</button>}
                    {o.status === 'preparing' && <button onClick={() => onUpdate(o.id, 'completed')} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Complete</button>}
                    {o.status === 'pending' && <button onClick={() => onUpdate(o.id, 'cancelled')} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Cancel</button>}
                    <button onClick={() => { if (confirm('Delete?')) onDelete(o.id); }} className="px-2 py-1 bg-gray-200 rounded text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADMIN: INVENTORY TABLE
// ============================================
function InventoryTable({ inventory, onAdd, onUpdate, onDelete }: { inventory: InventoryItem[]; onAdd: (item: any) => void; onUpdate: (id: number, item: any) => void; onDelete: (id: number) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ name: '', category: '', quantity: 0, unit: '', min_stock: 0 });

  const openAdd = () => { setEditItem(null); setForm({ name: '', category: '', quantity: 0, unit: '', min_stock: 0 }); setShowModal(true); };
  const openEdit = (item: InventoryItem) => { setEditItem(item); setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, min_stock: item.min_stock }); setShowModal(true); };
  const save = async () => {
    if (editItem) await onUpdate(editItem.id, form);
    else await onAdd(form);
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Inventory from Database ({inventory.length})</h2>
        <button onClick={openAdd} className="px-4 py-2 bg-orange-500 text-white rounded text-sm">+ Add</button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Quantity</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-left">Min Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id} className={`border-t ${item.quantity <= item.min_stock ? 'bg-red-50' : ''}`}>
                  <td className="p-3">{item.id}</td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.unit}</td>
                  <td className="p-3">{item.min_stock}</td>
                  <td className="p-3 text-center">{item.quantity <= item.min_stock ? <span className="text-red-500 font-medium">Low</span> : <span className="text-green-500">OK</span>}</td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => onUpdate(item.id, { ...item, quantity: item.quantity + 10 })} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Restock</button>
                    <button onClick={() => openEdit(item)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Edit</button>
                    <button onClick={() => { if (confirm('Delete?')) onDelete(item.id); }} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-medium mb-4">{editItem ? 'Edit' : 'Add'} Item</h3>
            <div className="space-y-3">
              <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
              <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} className="px-3 py-2 border rounded text-sm" />
                <input placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="px-3 py-2 border rounded text-sm" />
              </div>
              <input type="number" placeholder="Min Stock" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: +e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
              <div className="flex gap-2"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={save} className="flex-1 py-2 bg-orange-500 text-white rounded">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ADMIN: MENU TABLE
// ============================================
function MenuTable({ menu, orders, onAdd, onUpdate, onDelete }: { menu: MenuItem[]; orders: Order[]; onAdd: (item: any) => void; onUpdate: (id: number, item: any) => void; onDelete: (id: number) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', price: 0, category: 'Takoyaki', image: 'CT', photo: '', available: true });

  const getOrderCount = (itemId: string) => {
    return orders.reduce((count, order) => {
      const items = order.items || [];
      return count + items.filter((i: any) => String(i.menu_item_id) === itemId).reduce((s: number, i: any) => s + i.quantity, 0);
    }, 0);
  };

  const openAdd = () => { setEditItem(null); setForm({ name: '', price: 0, category: 'Takoyaki', image: 'CT', photo: '', available: true }); setShowModal(true); };
  const openEdit = (item: MenuItem) => { setEditItem(item); setForm({ name: item.name, price: item.price, category: item.category, image: item.image, photo: item.photo || '', available: item.available }); setShowModal(true); };
  const save = async () => {
    if (editItem) await onUpdate(editItem.id, form);
    else await onAdd(form);
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Menu Items from Database ({menu.length})</h2>
        <button onClick={openAdd} className="px-4 py-2 bg-orange-500 text-white rounded text-sm">+ Add</button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Photo</th>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Orders</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menu.map(item => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-3"><img src={item.photo || `https://via.placeholder.com/50?text=${item.image}`} alt={item.name} className="w-10 h-10 rounded object-cover" /></td>
                  <td className="p-3">{item.id}</td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">₱{item.price}</td>
                  <td className="p-3"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">{getOrderCount(String(item.id))}x</span></td>
                  <td className="p-3 text-center">{item.available ? <span className="text-green-500">✓</span> : <span className="text-red-500">✗</span>}</td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => onUpdate(item.id, { ...item, available: !item.available })} className="px-2 py-1 bg-gray-100 rounded text-xs">{item.available ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => openEdit(item)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Edit</button>
                    <button onClick={() => { if (confirm('Delete?')) onDelete(item.id); }} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-medium mb-4">{editItem ? 'Edit' : 'Add'} Menu Item</h3>
            <div className="space-y-3">
              <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
              <input type="number" placeholder="Price" value={form.price || ''} onChange={e => setForm({ ...form, price: +e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded text-sm">
                <option>Takoyaki</option><option>Combo</option><option>Sides</option><option>Drinks</option>
              </select>
              <input placeholder="Photo URL" value={form.photo} onChange={e => setForm({ ...form, photo: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
              <div className="flex gap-2"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={save} className="flex-1 py-2 bg-orange-500 text-white rounded">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ADMIN: REFUNDS TABLE
// ============================================
function RefundsTable({ refunds, onUpdate }: { refunds: Refund[]; onUpdate: (id: number, status: string) => void }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b font-medium">Refund Requests from Database ({refunds.length})</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Refund Code</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">No refund requests</td></tr>
            ) : refunds.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.refund_code}</td>
                <td className="p-3">{r.order_id}</td>
                <td className="p-3">{r.user_name}</td>
                <td className="p-3 max-w-xs truncate">{r.reason}</td>
                <td className="p-3">₱{r.amount}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                <td className="p-3 text-center space-x-1">
                  {r.status === 'pending' && <>
                    <button onClick={() => onUpdate(r.id, 'approved')} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Approve</button>
                    <button onClick={() => onUpdate(r.id, 'rejected')} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Reject</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// USER: MENU VIEW
// ============================================
function UserMenuView({ menu, cart, onAdd }: { menu: MenuItem[]; cart: OrderItem[]; onAdd: (item: MenuItem) => void }) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(menu.map(m => m.category))];
  const filtered = category === 'All' ? menu : menu.filter(m => m.category === category);

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${category === c ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600'}`}>{c}</button>)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.filter(i => i.available).map(item => {
          const inCart = cart.find(c => c.menuItemId === String(item.id));
          return (
            <div key={item.id} className="bg-white rounded-lg border overflow-hidden">
              <img src={item.photo || `https://via.placeholder.com/200?text=${item.name}`} alt={item.name} className="w-full h-32 object-cover" />
              <div className="p-3">
                <h3 className="font-medium text-sm">{item.name}</h3>
                <p className="text-orange-500 font-semibold">₱{item.price}</p>
                <button onClick={() => onAdd(item)} className="w-full mt-2 py-1.5 bg-orange-500 text-white rounded text-sm">
                  {inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// USER: ORDERS TABLE
// ============================================
function UserOrdersTable({ orders, onRefund }: { orders: Order[]; onRefund: (id: number, reason: string) => void }) {
  const [refundModal, setRefundModal] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b font-medium">My Orders ({orders.length})</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Order Code</th>
              <th className="p-3 text-left">Items</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-medium">{o.order_code}</td>
                <td className="p-3 max-w-xs truncate">{o.items?.map(i => i.item_name).join(', ')}</td>
                <td className="p-3 uppercase">{o.payment_method}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusColor(o.status)}`}>{o.status}</span></td>
                <td className="p-3 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right font-medium">₱{o.total}</td>
                <td className="p-3 text-center">{o.status === 'completed' && <button onClick={() => setRefundModal(o.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs">Refund</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {refundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-medium mb-4">Request Refund</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason..." className="w-full px-3 py-2 border rounded text-sm mb-4" rows={3} />
            <div className="flex gap-2">
              <button onClick={() => { setRefundModal(null); setReason(''); }} className="flex-1 py-2 border rounded">Cancel</button>
              <button onClick={() => { if (reason) { onRefund(refundModal, reason); setRefundModal(null); setReason(''); alert('Refund requested!'); } }} className="flex-1 py-2 bg-red-500 text-white rounded">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// USER: REFUNDS TABLE
// ============================================
function UserRefundsTable({ refunds }: { refunds: Refund[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b font-medium">My Refund Requests ({refunds.length})</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No refund requests</td></tr>
            ) : refunds.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.refund_code}</td>
                <td className="p-3">{r.order_id}</td>
                <td className="p-3">{r.reason}</td>
                <td className="p-3">₱{r.amount}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function CartSidebar({ cart, total, onClose, onRemove, onUpdateQty, onCheckout }: { cart: OrderItem[]; total: number; onClose: () => void; onRemove: (id: string) => void; onUpdateQty: (id: string, d: number) => void; onCheckout: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between"><h3 className="font-medium">Cart</h3><button onClick={onClose}>&times;</button></div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? <p className="text-center text-gray-400 py-8">Empty</p> : cart.map(item => (
            <div key={item.menuItemId} className="bg-gray-50 rounded p-3">
              <div className="flex justify-between"><p className="text-sm font-medium">{item.name}</p><button onClick={() => onRemove(item.menuItemId)} className="text-gray-400">&times;</button></div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateQty(item.menuItemId, -1)} className="w-6 h-6 bg-gray-200 rounded text-sm">-</button>
                  <span className="text-sm">{item.quantity}</span>
                  <button onClick={() => onUpdateQty(item.menuItemId, 1)} className="w-6 h-6 bg-orange-500 text-white rounded text-sm">+</button>
                </div>
                <p className="font-medium text-sm">₱{item.price * item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between mb-3"><span>Total</span><span className="font-semibold">₱{total}</span></div>
            <button onClick={onCheckout} className="w-full py-2 bg-orange-500 text-white font-medium rounded">Checkout</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ total, onClose, onPay }: { total: number; onClose: () => void; onPay: (method: PaymentMethod, refCode?: string) => void }) {
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [refCode, setRefCode] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="font-medium mb-4">Checkout</h3>
        <p className="text-2xl font-bold text-center mb-4">₱{total}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[{ id: 'cash', label: '💵 Cash' }, { id: 'gcash', label: '📱 GCash' }].map(m => (
            <button key={m.id} onClick={() => setPayment(m.id as PaymentMethod)} className={`py-3 rounded text-sm font-medium ${payment === m.id ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>{m.label}</button>
          ))}
        </div>
        {payment === 'gcash' && (
          <div className="bg-gray-50 rounded p-3 mb-4">
            <p className="text-xs text-gray-500 mb-2">Account: 09123456789 (Takoyaki House)</p>
            <input placeholder="Reference Code" value={refCode} onChange={e => setRefCode(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded">Cancel</button>
          <button onClick={() => onPay(payment, refCode || undefined)} className="flex-1 py-2 bg-orange-500 text-white rounded font-medium">Pay</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER
// ============================================
function statusColor(status: string): string {
  const colors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', preparing: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', refunded: 'bg-purple-100 text-purple-700' };
  return colors[status] || 'bg-gray-100 text-gray-700';
}
