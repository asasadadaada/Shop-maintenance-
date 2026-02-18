import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, CheckCircle, Clock, LogOut, Play, Bell, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TechnicianDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [report, setReport] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [modalTasksType, setModalTasksType] = useState("");
  const [modalTasks, setModalTasks] = useState([]);

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
    // Check for new notifications every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let watchId;
    let intervalId;
    if (locationTracking && activeTask) {
      if (navigator.geolocation) {
        // Continuous tracking with watchPosition
        watchId = navigator.geolocation.watchPosition(
          (position) => sendLocation(activeTask.id, position),
          (error) => {
            console.error("Geolocation error:", error);
            toast.error("فشل تحديث الموقع. يرجى التحقق من إعدادات الموقع.");
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 10000,
            distanceFilter: 10 // Send update every 10 meters
          }
        );
        
        // Additional polling every 10 seconds for better tracking
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (position) => sendLocation(activeTask.id, position),
            (error) => console.error("Geolocation polling error:", error),
            { enableHighAccuracy: true, maximumAge: 0 }
          );
        }, 10000);
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [locationTracking, activeTask, sendLocation]);

  const fetchData = async () => {
    try {
      const [tasksRes, statsRes, notifRes, unreadRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeaders()),
        axios.get(`${API}/stats`, getAuthHeaders()),
        axios.get(`${API}/notifications`, getAuthHeaders()),
        axios.get(`${API}/notifications/unread/count`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
      
      // Check for new notifications and play sound
      if (notifRes.data.length > notifications.length && notifications.length > 0) {
        const audio = new Audio('data:audio/wav;base64,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');
        audio.play().catch(() => {});
      }
      
      setNotifications(notifRes.data);
      setUnreadCount(unreadRes.data.count);

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
    // Request location permission
    if (navigator.geolocation) {
      const permissionGranted = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            toast.success("تم السماح بالوصول للموقع");
            resolve(true);
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              toast.error("تم رفض الوصول للموقع. يرجى السماح بالوصول للموقع لتتبع المهمة.");
              resolve(false);
            } else {
              toast.error("فشل الحصول على الموقع");
              resolve(false);
            }
          },
          { enableHighAccuracy: true }
        );
      });

      if (!permissionGranted) {
        return;
      }
    } else {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }

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

  const markNotificationRead = async (notificationId, taskId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, getAuthHeaders());
      fetchData();
      // Optionally, scroll to the task or highlight it
      const taskElement = document.querySelector(`[data-testid="task-card-${taskId}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.style.border = '2px solid #667eea';
        setTimeout(() => {
          taskElement.style.border = '';
        }, 3000);
      }
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
    <div className="min-h-screen p-6" data-testid="technician-dashboard">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#667eea' }}>لوحة موظف الصيانة</h1>
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
                    onClick={() => markNotificationRead(notif.id, notif.task_id)}
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
          <div 
            className="stat-card cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showTasksByStatus("all", "مهامي")}
            data-testid="stat-my-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مهامي</p>
                <p className="text-3xl font-bold">{stats.my_tasks}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("pending", "المهام قيد الانتظار")}
            data-testid="stat-my-pending"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد الانتظار</p>
                <p className="text-3xl font-bold">{stats.my_pending}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("in_progress", "المهام قيد التنفيذ")}
            data-testid="stat-my-in-progress"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد التنفيذ</p>
                <p className="text-3xl font-bold">{stats.my_in_progress}</p>
              </div>
              <Play size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("completed", "المهام المكتملة")}
            data-testid="stat-my-completed"
          >
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
