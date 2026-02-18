import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, Users, CheckCircle, Clock, AlertCircle, Plus, LogOut } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [locations, setLocations] = useState([]);
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, techsRes, statsRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeaders()),
        axios.get(`${API}/technicians`, getAuthHeaders()),
        axios.get(`${API}/stats`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setTechnicians(techsRes.data);
      setStats(statsRes.data);
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
    } catch (error) {
      toast.error("فشل جلب الموقع");
    }
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
          <button onClick={onLogout} className="secondary-button" data-testid="logout-button">
            <LogOut className="inline ml-2" size={20} />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card" data-testid="stat-total-tasks">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">إجمالي المهام</p>
                <p className="text-3xl font-bold">{stats.total_tasks}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }} data-testid="stat-pending-tasks">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد الانتظار</p>
                <p className="text-3xl font-bold">{stats.pending_tasks}</p>
              </div>
              <AlertCircle size={40} className="opacity-80" />
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }} data-testid="stat-in-progress-tasks">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد التنفيذ</p>
                <p className="text-3xl font-bold">{stats.in_progress_tasks}</p>
              </div>
              <MapPin size={40} className="opacity-80" />
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }} data-testid="stat-completed-tasks">
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
            <h2 className="text-2xl font-bold mb-4">موقع الموظف - {selectedTask.customer_name}</h2>
            {locations.length > 0 ? (
              <div>
                <div className="map-container mb-4">
                  <iframe
                    title="map"
                    width="100%"
                    height="400"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${locations[0].longitude - 0.01},${locations[0].latitude - 0.01},${locations[0].longitude + 0.01},${locations[0].latitude + 0.01}&layer=mapnik&marker=${locations[0].latitude},${locations[0].longitude}`}
                  />
                </div>
                <p className="text-gray-600" data-testid="location-info">
                  آخر تحديث: {new Date(locations[0].timestamp).toLocaleString('ar-IQ')}
                </p>
                <p className="text-gray-600">
                  الإحداثيات: {locations[0].latitude.toFixed(6)}, {locations[0].longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">لا توجد بيانات موقع متاحة</p>
            )}
            <button
              onClick={() => setSelectedTask(null)}
              className="secondary-button mt-4"
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
