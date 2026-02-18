import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      
      toast.success("تم تسجيل الدخول بنجاح");
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="card max-w-md w-full" data-testid="login-page">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#667eea' }}>
            تسجيل الدخول
          </h1>
          <p className="text-gray-600">نظام إدارة الصيانة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              className="input-field"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              data-testid="email-input"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="label">الرمز السري</label>
            <input
              type="password"
              className="input-field"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              data-testid="password-input"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            className="primary-button w-full"
            disabled={loading}
            data-testid="submit-button"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            💡 <strong>للمدير:</strong> baqer@gmail.com
          </p>
          <p className="text-xs text-blue-600 text-center mt-1">
            يمكنك تغيير الرمز من الإعدادات بعد الدخول
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
