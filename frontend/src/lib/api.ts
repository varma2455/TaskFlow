const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'member';
  reminder_preference?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  creator_id: string;
  assignee_id?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
  creator?: UserProfile;
  assignee?: UserProfile | null;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  user?: UserProfile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  task_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_tasks: number;
  completed: number;
  in_progress: number;
  todo: number;
  overdue: number;
  due_soon: number;
  completion_rate: number;
}

export class ApiClient {
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('taskflow_auth_token');
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expired or invalid
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
          // If in protected app page, handle expired session
          console.warn('Session expired or unauthorized');
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.details || data.error || `HTTP error ${response.status}`);
      }

      return data as T;
    } catch (err: any) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // Health
  static async checkHealth() {
    return this.request<{ status: string; service: string; database: string }>('/health');
  }

  // Auth & Profile
  static async getProfile(): Promise<{ profile: UserProfile }> {
    return this.request<{ profile: UserProfile }>('/auth/profile');
  }

  static async syncUser(data: { full_name?: string; avatar_url?: string }): Promise<{ profile: UserProfile }> {
    return this.request<{ profile: UserProfile }>('/auth/sync-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updatePreferences(reminder_preference: boolean): Promise<any> {
    return this.request('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify({ reminder_preference }),
    });
  }

  // Users / Teammates
  static async getUsers(): Promise<{ users: UserProfile[] }> {
    return this.request<{ users: UserProfile[] }>('/users');
  }

  // Tasks
  static async getTasks(params: Record<string, any> = {}): Promise<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/tasks${qs}`);
  }

  static async getTask(taskId: string): Promise<{ task: Task }> {
    return this.request<{ task: Task }>(`/tasks/${taskId}`);
  }

  static async createTask(data: {
    title: string;
    description?: string;
    priority?: string;
    assignee_id?: string | null;
    due_date?: string | null;
  }): Promise<{ task: Task; message: string }> {
    return this.request<{ task: Task; message: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateTask(taskId: string, data: Partial<Task>): Promise<{ task: Task; message: string }> {
    return this.request<{ task: Task; message: string }>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async updateTaskStatus(taskId: string, status: string): Promise<{ task: Task }> {
    return this.request<{ task: Task }>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  static async deleteTask(taskId: string): Promise<{ message: string; details: any }> {
    return this.request<{ message: string; details: any }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  static async getTaskActivity(taskId: string): Promise<{ activity: ActivityLog[] }> {
    return this.request<{ activity: ActivityLog[] }>(`/tasks/${taskId}/activity`);
  }

  // Notifications
  static async getNotifications(): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    return this.request<{ notifications: NotificationItem[]; unread_count: number }>('/notifications');
  }

  static async markNotificationRead(notificationId: string): Promise<{ notification: NotificationItem }> {
    return this.request<{ notification: NotificationItem }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  static async markAllNotificationsRead(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  // Dashboard Stats
  static async getDashboardStats(): Promise<{ stats: DashboardStats }> {
    return this.request<{ stats: DashboardStats }>('/dashboard/stats');
  }
}
