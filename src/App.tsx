import { useState, useEffect } from 'react';

const API_URL = "https://script.google.com/macros/s/AKfycbzS8Bl7BKWbvaG2jtEG8oJa9V4r94i8M51fF4YQHg0uFpro6NGwsybyZR93mj3buRwjEA/exec";

interface MenuItem {
  name: string;
  price: number;
}

interface Order {
  orderId: string;
  name: string;
  drink: string;
  sugar: string;
  ice: string;
  quantity: number;
  totalPrice: number;
}

interface OrderFormData {
  name: string;
  drink: string;
  sugar: string;
  ice: string;
  quantity: number;
  orderId?: string;
}

const SUGAR_OPTIONS = ["正常糖", "少糖", "半糖", "微糖", "無糖"];
const ICE_OPTIONS = ["正常冰", "少冰", "微冰", "去冰", "溫/熱"];

const downloadCSV = (orders: Order[]) => {
  const headers = ["訂購人", "飲料", "甜度", "冰塊", "數量", "總金額"];
  const csvRows = [headers.join(",")];
  for (const o of orders) {
    csvRows.push([o.name, o.drink, o.sugar, o.ice, o.quantity, o.totalPrice].join(","));
  }
  const csvString = csvRows.join("\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `orders_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setMenu(data.menu || []);
      setOrders(data.orders || []);
    } catch (err) {
      setError("資料載入失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notifySuccess = (msg: string) => {
    alert(msg);
    fetchData();
  };
  const notifyError = (msg: string) => {
    alert("錯誤: " + msg);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <header className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-2">☕ 辦公室飲料訂購</h1>
        <p className="mt-2 opacity-90">今日點單統計</p>
      </header>

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl shadow-sm border border-red-200">
          {error}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OrderForm
            menu={menu}
            editingOrder={editingOrder}
            setEditingOrder={setEditingOrder}
            onSuccess={notifySuccess}
            onError={notifyError}
          />
          <OrderList
            orders={orders}
            onEdit={setEditingOrder}
            onSuccess={notifySuccess}
            onError={notifyError}
          />
        </div>
      )}
    </div>
  );
}

interface OrderFormProps {
  menu: MenuItem[];
  editingOrder: Order | null;
  setEditingOrder: (order: Order | null) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function OrderForm({ menu, editingOrder, setEditingOrder, onSuccess, onError }: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    name: "",
    drink: "",
    sugar: "正常糖",
    ice: "正常冰",
    quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingOrder) {
      setFormData({
        name: editingOrder.name,
        drink: editingOrder.drink,
        sugar: editingOrder.sugar,
        ice: editingOrder.ice,
        quantity: editingOrder.quantity,
        orderId: editingOrder.orderId,
      });
    } else {
      setFormData({ name: "", drink: "", sugar: "正常糖", ice: "正常冰", quantity: 1 });
    }
  }, [editingOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.drink) {
      alert("請選擇飲料！");
      return;
    }
    setSubmitting(true);
    const selectedDrink = menu.find(m => m.name === formData.drink);
    const totalPrice = selectedDrink ? selectedDrink.price * formData.quantity : 0;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: editingOrder ? 'update' : 'create',
          data: { ...formData, totalPrice, orderId: editingOrder?.orderId }
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        onSuccess(result.message);
        setFormData({ name: "", drink: "", sugar: "正常糖", ice: "正常冰", quantity: 1 });
        setEditingOrder(null);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      onError(err.message || "發生未知錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
      <h2 className="text-xl font-bold border-b border-slate-100 pb-3 flex justify-between items-center">
        <span>{editingOrder ? "修改訂單" : "新訂單"}</span>
        {editingOrder && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-xs text-slate-400 hover:text-slate-600 bg-slate-50 px-2 py-1 rounded"
          >
            取消修改
          </button>
        )}
      </h2>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">訂購人姓名</label>
        <input
          type="text"
          placeholder="請輸入姓名"
          className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">選擇飲料</label>
        <select
          className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          value={formData.drink}
          onChange={e => setFormData({ ...formData, drink: e.target.value })}
          required
        >
          <option value="">請選擇飲料...</option>
          {menu.map(m => (
            <option key={m.name} value={m.name}>
              {m.name} (${m.price})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600 block">甜度選擇</label>
        <div className="flex flex-wrap gap-2">
          {SUGAR_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setFormData({ ...formData, sugar: opt })}
              className={`px-3 py-1.5 text-sm rounded-full transition-all border ${
                formData.sugar === opt
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600 block">冰塊選擇</label>
        <div className="flex flex-wrap gap-2">
          {ICE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setFormData({ ...formData, ice: opt })}
              className={`px-3 py-1.5 text-sm rounded-full transition-all border ${
                formData.ice === opt
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600 block">訂購數量</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={formData.quantity <= 1}
            onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
            className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition"
          >
            -
          </button>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 p-2 text-center border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
            className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-sky-600 text-white p-3.5 rounded-xl font-bold hover:bg-sky-700 transition shadow-sm disabled:opacity-75 disabled:cursor-not-allowed flex justify-center items-center"
      >
        {submitting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            傳送中...
          </>
        ) : (
          editingOrder ? "更新訂單" : "送出訂單"
        )}
      </button>
    </form>
  );
}

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function OrderList({ orders, onEdit, onSuccess, onError }: OrderListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (orderId: string) => {
    if (!confirm("確定刪除此訂單嗎？")) return;
    setDeletingId(orderId);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', data: { orderId } })
      });
      const result = await res.json();
      if (result.status === 'success') {
        onSuccess(result.message);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      onError(err.message || "刪除失敗");
    } finally {
      setDeletingId(null);
    }
  };

  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-bold">今日訂單</h2>
          {orders.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              共計: <span className="font-bold text-slate-700">{totalQuantity}</span> 杯 / $
              <span className="font-bold text-slate-700">{totalAmount}</span>
            </p>
          )}
        </div>
        {orders.length > 0 && (
          <button
            onClick={() => downloadCSV(orders)}
            className="text-sm bg-slate-50 border border-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 font-medium transition flex items-center gap-1 shadow-sm"
          >
            📥 下載 CSV
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center space-y-2">
          <span className="text-4xl">🍵</span>
          <p className="font-medium text-slate-400">目前尚無人訂購</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
          {orders.map(o => (
            <div key={o.orderId} className="flex justify-between items-center py-3.5 hover:bg-slate-50/50 transition px-1 rounded-lg">
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span className="text-slate-800">{o.drink}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal">
                    {o.sugar} / {o.ice}
                  </span>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{o.name}</span>
                  <span>•</span>
                  <span>{o.quantity} 杯</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-600">${o.totalPrice}</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm font-medium">
                <button
                  onClick={() => onEdit(o)}
                  className="text-sky-600 hover:text-sky-800 transition bg-sky-50 px-2.5 py-1 rounded-lg"
                >
                  編輯
                </button>
                <button
                  disabled={deletingId === o.orderId}
                  onClick={() => handleDelete(o.orderId)}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50 transition bg-red-50 px-2.5 py-1 rounded-lg"
                >
                  {deletingId === o.orderId ? "刪除中..." : "刪除"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
