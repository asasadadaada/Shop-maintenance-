import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, CheckCircle, Clock, LogOut, Play } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TechnicianDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [report, setReport] = useState("");

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  const sendLocation = useCallback(async (taskId, position) => {
    try {
      await axios.post(
        `${API}/locations`,
        {
          task_id: taskId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        getAuthHeaders()
      );
    } catch (error) {
      console.error("Error sending location:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let watchId;
    if (locationTracking && activeTask) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => sendLocation(activeTask.id, position),
          (error) => console.error("Geolocation error:", error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [locationTracking, activeTask, sendLocation]);

  const fetchData = async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeaders()),
        axios.get(`${API}/stats`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);

      const inProgress = tasksRes.data.find(t => t.status === "in_progress");
      if (inProgress && !activeTask) {
        setActiveTask(inProgress);
        setLocationTracking(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleAcceptTask = async (task) => {
    try {
      await axios.patch(`${API}/tasks/${task.id}/accept`, {}, getAuthHeaders());
      toast.success("تم قبول المهمة");
      fetchData();
    } catch (error) {
      toast.error("فشل قبول المهمة");
    }
  };

  const handleStartTask = async (task) => {
    try {
      await axios.patch(`${API}/tasks/${task.id}/start`, {}, getAuthHeaders());
      setActiveTask(task);
      setLocationTracking(true);
      toast.success("تم بدء المهمة - جاري تتبع موقعك");
      fetchData();
    } catch (error) {
      toast.error("فشل بدء المهمة");
    }
  };

  const handleCompleteTask = async () => {
    if (!report.trim()) {
      toast.error("يرجى كتابة التقرير");
      return;
    }

    try {
      await axios.post(
        `${API}/tasks/${activeTask.id}/complete`,
        { task_id: activeTask.id, report_text: report, images: [] },
        getAuthHeaders()
      );
      toast.success("تم إنهاء المهمة بنجاح");
      setActiveTask(null);
      setLocationTracking(false);
      setShowReportModal(false);
      setReport("");
      fetchData();
    } catch (error) {
      toast.error("فشل إنهاء المهمة");
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
    <div className="min-h-screen p-6" data-testid="technician-dashboard">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#667eea' }}>لوحة موظف الصيانة</h1>
            <p className="text-gray-600">مرحباً، {user.name}</p>
          </div>
          <button onClick={onLogout} className="secondary-button" data-testid="logout-button">
            <LogOut className="inline ml-2" size={20} />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Location Tracking Status */}
      {locationTracking && activeTask && (
        <div className="max-w-7xl mx-auto mb-6" data-testid="location-tracking-status">
          <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
            <div className="flex items-center gap-3">
              <MapPin size={24} className="animate-pulse" />
              <div>
                <p className="font-bold">جاري تتبع موقعك</p>
                <p className="text-sm text-white/80">المهمة النشطة: {activeTask.customer_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card" data-testid="stat-my-tasks">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مهامي</p>
                <p className="text-3xl font-bold">{stats.my_tasks}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }} data-testid="stat-my-pending">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد الانتظار</p>
                <p className="text-3xl font-bold">{stats.my_pending}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }} data-testid="stat-my-in-progress">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد التنفيذ</p>
                <p className="text-3xl font-bold">{stats.my_in_progress}</p>
              </div>
              <Play size={40} className="opacity-80" />
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }} data-testid="stat-my-completed">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مكتملة</p>
                <p className="text-3xl font-bold">{stats.my_completed}</p>
              </div>
              <CheckCircle size={40} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">مهامي</h2>
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
                  </div>
                </div>
                <div className="text-left">
                  <span className={`status-badge status-${task.status}`} data-testid={`task-status-${task.id}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {task.status === "pending" && (
                  <button
                    onClick={() => handleAcceptTask(task)}
                    className="success-button"
                    data-testid={`accept-task-button-${task.id}`}
                  >
                    قبول المهمة
                  </button>
                )}

                {task.status === "accepted" && (
                  <button
                    onClick={() => handleStartTask(task)}
                    className="primary-button"
                    data-testid={`start-task-button-${task.id}`}
                  >
                    <Play className="inline ml-2" size={18} />
                    بدء المهمة
                  </button>
                )}

                {task.status === "in_progress" && task.id === activeTask?.id && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="success-button"
                    data-testid={`complete-task-button-${task.id}`}
                  >
                    <CheckCircle className="inline ml-2" size={18} />
                    إنهاء المهمة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="report-modal">
          <div className="card max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>تقرير إنهاء المهمة</h2>
            <div className="space-y-4">
              <div>
                <label className="label">تفاصيل العمل المنجز</label>
                <textarea
                  className="input-field"
                  rows="6"
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  placeholder="اكتب تفاصيل العمل المنجز، الأعطال التي تم إصلاحها، وأي ملاحظات أخرى..."
                  data-testid="report-text-input"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCompleteTask}
                  className="success-button flex-1"
                  data-testid="submit-report-button"
                >
                  إرسال التقرير وإنهاء المهمة
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="secondary-button flex-1"
                  data-testid="cancel-report-button"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;
