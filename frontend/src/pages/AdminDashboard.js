import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, Users, CheckCircle, Clock, AlertCircle, Plus, LogOut, Bell, X } from "lucide-react";

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
    try {
      await axios.post(`${API}/tasks`, newTask, getAuthHeaders());
      toast.success("تم إنشاء المهمة بنجاح");
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
      
      // Auto-refresh location every 10 seconds when modal is open
      const locationInterval = setInterval(async () => {
        try {
          const updatedResponse = await axios.get(`${API}/locations/${task.id}`, getAuthHeaders());
          setLocations(updatedResponse.data);
        } catch (error) {
          console.error("Error updating location:", error);
        }
      }, 10000);
      
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
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => setShowCreateTask(true)}
          className="primary-button"
          data-testid="create-task-button"
        >
          <Plus className="inline ml-2" size={20} />
          إنشاء مهمة جديدة
        </button>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-task-modal">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>إنشاء مهمة جديدة</h2>
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
                <label className="label">تعيين لموظف</label>
                <select
                  className="input-field"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  data-testid="assigned-to-select"
                >
                  <option value="">اختر موظف...</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1" data-testid="submit-task-button">
                  إنشاء المهمة
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

              {task.report && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg" data-testid={`task-report-${task.id}`}>
                  <h4 className="font-bold mb-2 text-green-800">التقرير النهائي:</h4>
                  <p className="text-gray-700">{task.report}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="location-modal">
          <div className="card max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>موقع الموظف - {selectedTask.customer_name}</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700 font-medium">مباشر</span>
              </div>
            </div>
            {locations.length > 0 ? (
              <div>
                <div className="map-container mb-4">
                  <iframe
                    title="map"
                    width="100%"
                    height="400"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${locations[0].longitude - 0.01},${locations[0].latitude - 0.01},${locations[0].longitude + 0.01},${locations[0].latitude + 0.01}&layer=mapnik&marker=${locations[0].latitude},${locations[0].longitude}`}
                    key={locations[0].timestamp}
                  />
                </div>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700 font-medium mb-2" data-testid="location-info">
                    📍 آخر تحديث: {new Date(locations[0].timestamp).toLocaleString('ar-IQ')}
                  </p>
                  <p className="text-gray-600 text-sm">
                    الإحداثيات: {locations[0].latitude.toFixed(6)}, {locations[0].longitude.toFixed(6)}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    عدد التحديثات: {locations.length}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">لا توجد بيانات موقع متاحة</p>
            )}
            <button
              onClick={() => {
                if (selectedTask.locationInterval) {
                  clearInterval(selectedTask.locationInterval);
                }
                setSelectedTask(null);
              }}
              className="secondary-button w-full"
              data-testid="close-location-button"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
