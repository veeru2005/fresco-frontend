import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { CheckCircle2, Clock, Trash2 } from 'lucide-react';

const AdminFeedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const orderedFeedbacks = useMemo(() => {
      return [...feedbacks].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.date || 0).getTime();
        const bTime = new Date(b.createdAt || b.date || 0).getTime();
        return bTime - aTime;
      });
    }, [feedbacks]);

  const [pendingDeleteFeedbackId, setPendingDeleteFeedbackId] = useState<string | null>(null);
  const isSuperAdmin = user?.isSuperAdmin;

  const loadFeedback = async () => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/admin/feedback`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      } else {
        console.error('Failed to load feedback from backend');
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/admin/feedback/${id}/read`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, isRead: true, readAt: new Date().toISOString() }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error marking feedback as read:', error);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!isSuperAdmin) return;

    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/super-admin/feedback/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setFeedbacks((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 lg:pb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Customer Feedback</h1>
        <p className="text-muted-foreground">Feedback from customers</p>
      </div>

      <div className="grid gap-4">
        {orderedFeedbacks.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-muted-foreground">No feedback submitted yet</div>
          </Card>
        ) : (
          orderedFeedbacks.map(f => {
            const dateTime = formatDateTime(f.date || f.createdAt || new Date().toISOString());
            return (
              <Card key={f.id} className={f.isRead ? 'opacity-70 border-slate-200' : 'border-emerald-200'}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{f.name || f.username || 'Anonymous'}</h3>
                      <p className="text-sm mt-1"><strong>Subject:</strong> {f.subject || '—'}</p>
                      <p className="text-sm"><strong>Email:</strong> {f.email || '—'}</p>
                      <p className="text-xs mt-1 font-medium text-emerald-700">
                        {f.isRead ? 'Read' : 'Unread'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span>{dateTime.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dateTime.date}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm"><strong>Message:</strong> {f.message || f.description || f.review || 'No feedback provided'}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
                      {!f.isRead && (
                        <Button
                          type="button"
                          onClick={() => markAsRead(f.id)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark as Read
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <Button
                          type="button"
                          variant="destructive"
                          className="w-full sm:w-auto"
                          onClick={() => setPendingDeleteFeedbackId(f.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ConfirmActionDialog
        open={!!pendingDeleteFeedbackId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFeedbackId(null);
        }}
        title="Delete feedback?"
        description="This feedback entry will be permanently deleted. Do you want to continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!pendingDeleteFeedbackId) return;
          deleteFeedback(pendingDeleteFeedbackId);
          setPendingDeleteFeedbackId(null);
        }}
      />
    </div>
  );
};

export default AdminFeedback;
