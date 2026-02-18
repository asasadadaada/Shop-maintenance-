import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, Users, CheckCircle, Clock, AlertCircle, Plus, LogOut, Bell, X, Trash2, Play, UserPlus, Settings as SettingsIcon } from "lucide-react";
import { playNotificationSound } from "../utils/notificationSound";
import LiveMap from "../components/LiveMap";
import Settings from "./Settings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [locations, setLocations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [modalTasksType, setModalTasksType] = useState("");
  const [modalTasks, setModalTasks] = useState([]);
  const [showAddTechnician, setShowAddTechnician] = useState(false);
  const [showTechniciansModal, setShowTechniciansModal] = useState(false);
  const [newTechnician, setNewTechnician] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [showSettings, setShowSettings] = useState(false);
  const [newTask, setNewTask] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    issue_description: "",
    assigned_to: ""
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  useEffect(() => {
    fetchData();
    // Check for new notifications every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, techsRes, statsRes, notifRes, unreadRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeaders()),
        axios.get(`${API}/technicians`, getAuthHeaders()),
        axios.get(`${API}/stats`, getAuthHeaders()),
        axios.get(`${API}/notifications`, getAuthHeaders()),
        axios.get(`${API}/notifications/unread/count`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setTechnicians(techsRes.data);
      setStats(statsRes.data);
      
      // Check for new notifications and play sound
      if (notifRes.data.length > notifications.length && notifications.length > 0) {
        const audio = new Audio('data:audio/wav;base64,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');
        audio.play().catch(() => {});
      }
      
      setNotifications(notifRes.data);
      setUnreadCount(unreadRes.data.count);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // التحقق من اختيار موظف
    if (!newTask.assigned_to) {
      toast.error("⚠️ يرجى اختيار موظف لتعيين المهمة له");
      return;
    }
    
    try {
      await axios.post(`${API}/tasks`, newTask, getAuthHeaders());
      const assignedTech = technicians.find(t => t.id === newTask.assigned_to);
      toast.success(`✓ تم إنشاء المهمة وإرسالها إلى ${assignedTech?.name || 'الموظف'}`);
      setShowCreateTask(false);
      setNewTask({
        customer_name: "",
        customer_phone: "",
        customer_address: "",
        issue_description: "",
        assigned_to: ""
      });
      fetchData();
    } catch (error) {
      toast.error("فشل إنشاء المهمة");
    }
  };

  const viewTaskLocation = async (task) => {
    try {
      const response = await axios.get(`${API}/locations/${task.id}`, getAuthHeaders());
      setLocations(response.data);
      setSelectedTask(task);
      
      // Aggressive auto-refresh location every 2 seconds when modal is open
      const locationInterval = setInterval(async () => {
        try {
          const updatedResponse = await axios.get(`${API}/locations/${task.id}`, getAuthHeaders());
          setLocations(updatedResponse.data);
        } catch (error) {
          console.error("Error updating location:", error);
        }
      }, 2000); // Update every 2 seconds for real-time tracking
      
      // Store interval ID to clear it when modal closes
      setSelectedTask({ ...task, locationInterval });
    } catch (error) {
      toast.error("فشل جلب الموقع");
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, getAuthHeaders());
      fetchData();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
      try {
        await axios.delete(`${API}/tasks/${taskId}`, getAuthHeaders());
        toast.success("تم حذف المهمة بنجاح");
        fetchData();
      } catch (error) {
        toast.error("فشل حذف المهمة");
      }
    }
  };

  const handleAddTechnician = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/technicians`, newTechnician, getAuthHeaders());
      toast.success("تم إضافة الموظف بنجاح");
      setShowAddTechnician(false);
      setNewTechnician({ name: "", email: "", password: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إضافة الموظف");
    }
  };

  const handleDeleteTechnician = async (techId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) {
      try {
        await axios.delete(`${API}/technicians/${techId}`, getAuthHeaders());
        toast.success("تم حذف الموظف بنجاح");
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "فشل حذف الموظف");
      }
    }
  };

  const showTasksByStatus = (status, title) => {
    let filteredTasks = [];
    if (status === "all") {
      filteredTasks = tasks;
    } else {
      filteredTasks = tasks.filter(task => task.status === status);
    }
    setModalTasks(filteredTasks);
    setModalTasksType(title);
    setShowTasksModal(true);
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "قيد الانتظار",
      accepted: "تم القبول",
      in_progress: "قيد التنفيذ",
      completed: "مكتملة"
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen p-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#667eea' }}>لوحة تحكم المدير</h1>
            <p className="text-gray-600">مرحباً، {user.name}</p>
          </div>
          <div className="flex gap-3">
            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(true)} 
              className="secondary-button"
              data-testid="settings-button"
            >
              <SettingsIcon className="inline ml-2" size={20} />
              الإعدادات
            </button>
            
            {/* Notifications Button */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="secondary-button relative"
              data-testid="notifications-button"
            >
              <Bell className="inline ml-2" size={20} />
              الإشعارات
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={onLogout} className="secondary-button" data-testid="logout-button">
              <LogOut className="inline ml-2" size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="max-w-7xl mx-auto mb-6" data-testid="notifications-panel">
          <div className="card" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">الإشعارات</h3>
              <button onClick={() => setShowNotifications(false)}>
                <X size={20} />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد إشعارات</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-3 rounded-lg cursor-pointer ${
                      notif.read ? 'bg-gray-100' : 'bg-blue-50'
                    }`}
                    onClick={() => markNotificationRead(notif.id)}
                    data-testid={`notification-${notif.id}`}
                  >
                    <p className="font-medium">{notif.message}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(notif.created_at).toLocaleString('ar-IQ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="stat-card cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showTasksByStatus("all", "إجمالي المهام")}
            data-testid="stat-total-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">إجمالي المهام</p>
                <p className="text-3xl font-bold">{stats.total_tasks}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("pending", "المهام قيد الانتظار")}
            data-testid="stat-pending-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد الانتظار</p>
                <p className="text-3xl font-bold">{stats.pending_tasks}</p>
              </div>
              <AlertCircle size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("in_progress", "المهام قيد التنفيذ")}
            data-testid="stat-in-progress-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد التنفيذ</p>
                <p className="text-3xl font-bold">{stats.in_progress_tasks}</p>
              </div>
              <MapPin size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("completed", "المهام المكتملة")}
            data-testid="stat-completed-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مكتملة</p>
                <p className="text-3xl font-bold">{stats.completed_tasks}</p>
              </div>
              <CheckCircle size={40} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Create Task Button */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <button
          onClick={() => setShowCreateTask(true)}
          className="primary-button"
          data-testid="create-task-button"
        >
          <Plus className="inline ml-2" size={20} />
          إنشاء مهمة جديدة
        </button>
        
        <button
          onClick={() => setShowAddTechnician(true)}
          className="success-button"
          data-testid="add-technician-button"
        >
          <UserPlus className="inline ml-2" size={20} />
          إضافة موظف جديد
        </button>
        
        <button
          onClick={() => setShowTechniciansModal(true)}
          className="secondary-button"
          data-testid="view-technicians-button"
        >
          <Users className="inline ml-2" size={20} />
          إدارة الموظفين ({technicians.length})
        </button>
      </div>

      {/* Add Technician Modal */}
      {showAddTechnician && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>إضافة موظف جديد</h2>
            <form onSubmit={handleAddTechnician} className="space-y-4">
              <div>
                <label className="label">الاسم الكامل</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTechnician.name}
                  onChange={(e) => setNewTechnician({ ...newTechnician, name: e.target.value })}
                  required
                  placeholder="أحمد محمد"
                />
              </div>

              <div>
                <label className="label">البريد الإلكتروني (اليوزر)</label>
                <input
                  type="email"
                  className="input-field"
                  value={newTechnician.email}
                  onChange={(e) => setNewTechnician({ ...newTechnician, email: e.target.value })}
                  required
                  placeholder="ahmed@example.com"
                />
              </div>

              <div>
                <label className="label">كلمة المرور</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTechnician.password}
                  onChange={(e) => setNewTechnician({ ...newTechnician, password: e.target.value })}
                  required
                  placeholder="اكتب كلمة مرور قوية"
                />
                <p className="text-xs text-gray-500 mt-1">⚠️ احفظ كلمة المرور وأرسلها للموظف</p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">📋 بيانات الدخول:</p>
                <p className="text-xs text-blue-600 mt-1">اليوزر: {newTechnician.email || "..."}</p>
                <p className="text-xs text-blue-600">الباسورد: {newTechnician.password || "..."}</p>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1">
                  إضافة الموظف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTechnician(false);
                    setNewTechnician({ name: "", email: "", password: "" });
                  }}
                  className="secondary-button flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technicians Management Modal */}
      {showTechniciansModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                إدارة الموظفين ({technicians.length})
              </h2>
              <button onClick={() => setShowTechniciansModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            {technicians.length === 0 ? (
              <div className="text-center py-12">
                <Users size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا يوجد موظفين</p>
                <button
                  onClick={() => {
                    setShowTechniciansModal(false);
                    setShowAddTechnician(true);
                  }}
                  className="primary-button mt-4"
                >
                  <UserPlus className="inline ml-2" size={18} />
                  إضافة أول موظف
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {technicians.map((tech) => (
                  <div key={tech.id} className="card bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                          {tech.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{tech.name}</h3>
                          <p className="text-sm text-gray-600">{tech.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        <p>انضم: {new Date(tech.created_at).toLocaleDateString('ar-IQ')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteTechnician(tech.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        <Trash2 size={16} className="inline ml-1" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-task-modal">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>إنشاء مهمة جديدة</h2>
            
            {technicians.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
                <div className="text-center">
                  <p className="text-yellow-800 font-bold text-lg mb-2">⚠️ لا يوجد موظفين متاحين</p>
                  <p className="text-yellow-700 text-sm mb-4">يجب إضافة موظف أولاً قبل إنشاء المهام</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTask(false);
                      setShowAddTechnician(true);
                    }}
                    className="success-button"
                  >
                    <UserPlus className="inline ml-2" size={18} />
                    إضافة موظف جديد
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">اسم المشترك</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTask.customer_name}
                  onChange={(e) => setNewTask({ ...newTask, customer_name: e.target.value })}
                  required
                  data-testid="customer-name-input"
                />
              </div>

              <div>
                <label className="label">رقم الهاتف</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTask.customer_phone}
                  onChange={(e) => setNewTask({ ...newTask, customer_phone: e.target.value })}
                  required
                  data-testid="customer-phone-input"
                />
              </div>

              <div>
                <label className="label">العنوان</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTask.customer_address}
                  onChange={(e) => setNewTask({ ...newTask, customer_address: e.target.value })}
                  required
                  data-testid="customer-address-input"
                />
              </div>

              <div>
                <label className="label">وصف العطل</label>
                <textarea
                  className="input-field"
                  rows="4"
                  value={newTask.issue_description}
                  onChange={(e) => setNewTask({ ...newTask, issue_description: e.target.value })}
                  required
                  data-testid="issue-description-input"
                />
              </div>

              <div>
                <label className="label">اختر الموظف لإرسال المهمة له *</label>
                
                {/* Visual selection of technicians */}
                <div className="grid grid-cols-1 gap-3 mb-3">
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      onClick={() => setNewTask({ ...newTask, assigned_to: tech.id })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        newTask.assigned_to === tech.id
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          newTask.assigned_to === tech.id
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {tech.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold ${newTask.assigned_to === tech.id ? 'text-purple-700' : 'text-gray-800'}`}>
                            {tech.name}
                          </p>
                          <p className="text-sm text-gray-600">{tech.email}</p>
                        </div>
                        {newTask.assigned_to === tech.id && (
                          <div className="text-purple-600">
                            <CheckCircle size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {!newTask.assigned_to && (
                  <p className="text-sm text-red-500 font-medium">
                    ⚠️ يرجى اختيار موظف من القائمة أعلاه
                  </p>
                )}
                
                {newTask.assigned_to && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ سيتم إرسال المهمة إلى: {technicians.find(t => t.id === newTask.assigned_to)?.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1" data-testid="submit-task-button">
                  ✓ إنشاء المهمة وإرسالها
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="secondary-button flex-1"
                  data-testid="cancel-task-button"
                >
                  إلغاء
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Tasks Details Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="tasks-details-modal">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>{modalTasksType}</h2>
              <button onClick={() => setShowTasksModal(false)} data-testid="close-tasks-modal">
                <X size={24} />
              </button>
            </div>
            {modalTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد مهام</p>
            ) : (
              <div className="space-y-4">
                {modalTasks.map((task) => (
                  <div key={task.id} className="card bg-gray-50" data-testid={`modal-task-${task.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">{task.customer_name}</h3>
                        <div className="space-y-1 text-gray-600 text-sm">
                          <p><strong>الهاتف:</strong> {task.customer_phone}</p>
                          <p><strong>العنوان:</strong> {task.customer_address}</p>
                          <p><strong>العطل:</strong> {task.issue_description}</p>
                          {task.assigned_to_name && (
                            <p><strong>الموظف:</strong> {task.assigned_to_name}</p>
                          )}
                        </div>
                      </div>
                      <span className={`status-badge status-${task.status}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">المهام</h2>
        <div className="space-y-4" data-testid="tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className="card" data-testid={`task-card-${task.id}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{task.customer_name}</h3>
                  <div className="space-y-1 text-gray-600">
                    <p><strong>الهاتف:</strong> {task.customer_phone}</p>
                    <p><strong>العنوان:</strong> {task.customer_address}</p>
                    <p><strong>العطل:</strong> {task.issue_description}</p>
                    {task.assigned_to_name && (
                      <p><strong>الموظف:</strong> {task.assigned_to_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <span className={`status-badge status-${task.status}`} data-testid={`task-status-${task.id}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {task.status === "in_progress" && (
                  <button
                    onClick={() => viewTaskLocation(task)}
                    className="secondary-button"
                    data-testid={`view-location-button-${task.id}`}
                  >
                    <MapPin className="inline ml-2" size={18} />
                    عرض الموقع
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="danger-button"
                  data-testid={`delete-task-button-${task.id}`}
                >
                  <Trash2 className="inline ml-2" size={18} />
                  حذف
                </button>
              </div>

              {task.report && (
                <div 
                  className={`mt-4 p-4 rounded-lg ${task.success !== false ? 'bg-green-50' : 'bg-red-50'}`}
                  data-testid={`task-report-${task.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {task.success !== false ? (
                        <>
                          <CheckCircle size={24} className="text-green-600" />
                          <h4 className="font-bold text-green-800 text-lg">✓ المهمة تمت بنجاح</h4>
                        </>
                      ) : (
                        <>
                          <span className="text-red-600 text-2xl">✗</span>
                          <h4 className="font-bold text-red-800 text-lg">✗ المهمة لم تكتمل</h4>
                        </>
                      )}
                    </div>
                    {task.duration_minutes && (
                      <div className="bg-white px-3 py-1 rounded-full">
                        <p className="text-sm font-medium text-gray-700">
                          ⏱️ المدة: {task.duration_minutes} دقيقة
                        </p>
                      </div>
                    )}
                  </div>
                  <p className={`${task.success !== false ? 'text-gray-700' : 'text-red-700'} mb-2`}>
                    {task.report}
                  </p>
                  {task.completed_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      📅 تاريخ الإنهاء: {new Date(task.completed_at).toLocaleString('ar-IQ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location Modal - Live Tracking */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="location-modal">
          <div className="card max-w-6xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                📍 تتبع مباشر - {selectedTask.customer_name}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full shadow-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-bold">مباشر • تحديث تلقائي</span>
                </div>
                <button 
                  onClick={() => {
                    if (selectedTask.locationInterval) {
                      clearInterval(selectedTask.locationInterval);
                    }
                    setSelectedTask(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={28} />
                </button>
              </div>
            </div>
            {locations.length > 0 ? (
              <div>
                {/* Live Map Component */}
                <div style={{ height: '500px' }} className="mb-4">
                  <LiveMap 
                    locations={locations} 
                    technicianName={selectedTask.assigned_to_name || "الموظف"}
                  />
                </div>
                
                {/* Location Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={20} className="text-blue-600" />
                      <h3 className="font-bold text-blue-800">آخر تحديث</h3>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {new Date(locations[0].timestamp).toLocaleString('ar-IQ', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(locations[0].timestamp).toLocaleDateString('ar-IQ')}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={20} className="text-green-600" />
                      <h3 className="font-bold text-green-800">عدد التحديثات</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{locations.length}</p>
                    <p className="text-xs text-gray-500 mt-1">نقطة GPS</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Play size={20} className="text-purple-600" />
                      <h3 className="font-bold text-purple-800">الحالة</h3>
                    </div>
                    <p className="text-lg font-bold text-purple-700">قيد التنفيذ</p>
                    <p className="text-xs text-gray-500 mt-1">الموظف في الطريق</p>
                  </div>
                </div>
                
                {/* Location History Timeline */}
                {locations.length > 1 && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Clock size={18} />
                      سجل الحركة ({locations.length} موقع)
                    </h3>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {locations.slice(0, 10).map((loc, index) => (
                        <div key={loc.id} className="flex items-center gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className="text-gray-600 font-mono text-xs">
                            {new Date(loc.timestamp).toLocaleTimeString('ar-IQ')}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <MapPin size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا توجد بيانات موقع متاحة</p>
                <p className="text-gray-400 text-sm mt-2">سيتم عرض الموقع عند بدء الموظف بالتحرك</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <Settings user={user} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
