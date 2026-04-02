import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { CheckCircle2, Clock, Trash2, MessageSquare } from 'lucide-react';

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
        window.dispatchEvent(new Event('fresco:feedbackUpdated'));
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
        window.dispatchEvent(new Event('fresco:feedbackUpdated'));
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
    <div className="container mx-auto px-5 py-8 sm:px-4 lg:pb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Customer Feedback</h1>
        <p className="text-muted-foreground">Feedback from customers</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {orderedFeedbacks.length === 0 ? (
          <Card className="mx-0.5 w-full col-span-full p-6 text-center border-2 border-[#255c45] sm:mx-0 sm:p-8">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-2xl font-bold mb-2">No feedback submitted yet</h3>
            <p className="text-muted-foreground">Feedback from customers will appear here.</p>
          </Card>
        ) : (
          orderedFeedbacks.map(f => {
            const dateTime = formatDateTime(f.date || f.createdAt || new Date().toISOString());
            return (
              <Card key={f.id} className={`mx-0.5 border-2 border-[#255c45] transition-colors sm:mx-0 ${f.isRead ? 'opacity-70' : ''}`}>
                <div className="relative p-4 sm:p-5">
                  {/* Mobile: Read/Unread badge at top-right corner */}
                  <span
                    className={`absolute right-3 top-3 rounded-full border px-1.5 py-px text-[9px] font-semibold whitespace-nowrap sm:hidden ${
                      f.isRead
                        ? 'border-[#255c45] bg-[#255c45]/10 text-[#255c45]'
                        : 'border-amber-700 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {f.isRead ? 'Read' : 'Unread'}
                  </span>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold pr-14 sm:pr-0">{f.name || f.username || 'Anonymous'}</h3>
                      <div className="mt-1 sm:hidden">
                        <div className="inline-flex items-center gap-0.5 rounded-full bg-[#255c45] px-1.5 py-px text-[9px] font-semibold text-white">
                          <Clock className="h-2 w-2 shrink-0" />
                          <span>{dateTime.time} | {dateTime.date}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm"><strong>Subject:</strong> {f.subject || '—'}</p>
                      <p className="text-sm"><strong>Email:</strong> {f.email || '—'}</p>
                    </div>

                    <div className="hidden sm:flex sm:flex-row sm:items-center gap-2 shrink-0">
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#255c45] px-2.5 py-0.5 text-xs font-semibold text-white">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{dateTime.time} | {dateTime.date}</span>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                          f.isRead
                            ? 'border-[#255c45] bg-[#255c45]/10 text-[#255c45]'
                            : 'border-amber-700 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {f.isRead ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm"><strong>Message:</strong> {f.message || f.description || f.review || 'No feedback provided'}</p>

                  {isSuperAdmin && (
                    <div className="mt-4 border-t border-border pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-h-10">
                          {!f.isRead && (
                            <Button
                              type="button"
                              onClick={() => markAsRead(f.id)}
                              className="h-10 bg-[#255c45] px-4 text-white hover:bg-[#1a4030]"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Mark as Read
                            </Button>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          className="h-10 px-4"
                          onClick={() => setPendingDeleteFeedbackId(f.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
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
