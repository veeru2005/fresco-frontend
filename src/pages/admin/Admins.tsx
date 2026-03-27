import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, Search, UserPlus, Trash2 } from 'lucide-react';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type AdminActivity = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super-admin';
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
};

const Admins = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [pendingDeleteAdminId, setPendingDeleteAdminId] = useState<string | null>(null);
  const isSuperAdmin = user?.isSuperAdmin;

  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/super-admin/admins`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Failed to load admin activity');
      }

      const data = await res.json();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading admin activity:', error);
      toast({
        title: 'Could not load admins',
        description: 'Please try again after refreshing.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdmins();
    }
  }, [isSuperAdmin]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...admins]
      .filter((item) => item.role === 'admin')
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .filter((item) => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q)
        );
      });
  }, [admins, searchQuery]);

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Never logged in';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCreateAdmin = async () => {
    const email = formEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: 'Email required', description: 'Please enter admin email', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/super-admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: formName.trim(), email }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to create admin');
      }

      toast({ title: 'Success', description: 'Admin added/updated successfully', variant: 'success' });
      setFormName('');
      setFormEmail('');
      setIsAddAdminOpen(false);
      await loadAdmins();
    } catch (error: any) {
      toast({ title: 'Failed', description: error?.message || 'Could not create admin', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAdmin = async (adminId: string) => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to delete admin');
      }

      setAdmins((prev) => prev.filter((admin) => admin.id !== adminId));
      toast({ title: 'Deleted', description: 'Admin deleted successfully' });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error?.message || 'Could not delete admin', variant: 'destructive' });
    }
  };

  const canDeleteAdminRow = (item: AdminActivity) => {
    return item.role === 'admin';
  };

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="p-8 text-center text-muted-foreground">
            Only super admins can access admin management.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 lg:pb-20">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground">Add new admins and monitor their latest login activity</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <div className="relative flex-1 rounded-2xl border-2 border-[#255c45] overflow-hidden">
            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search admins by name/email"
              className="pl-10 h-10 rounded-xl border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
            />
          </div>

          <Button
            type="button"
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
            onClick={() => setIsAddAdminOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>
      </div>

      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adminName">Name</Label>
              <Input
                id="adminName"
                placeholder="Admin name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input
                id="adminEmail"
                placeholder="admin@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                className="border border-amber-300 bg-amber-400 text-slate-900 hover:bg-amber-500"
                onClick={() => setIsAddAdminOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateAdmin}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {filteredAdmins.length === 0 ? (
          <Card>
            <div className="p-6 text-center text-muted-foreground">No admins found</div>
          </Card>
        ) : (
          filteredAdmins.map((item) => (
            <Card key={item.id} className="border-2 border-[#255c45] border-l-4 border-l-[#255c45]">
              <div className="p-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {item.role === 'super-admin' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Shield className="w-4 h-4 text-slate-600" />
                    )}
                    <p className="font-semibold">{item.name}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#2f7656] text-white uppercase tracking-wide">
                      {item.role}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.email}</p>
                </div>
                <div className="text-xs sm:text-sm md:text-center md:justify-self-center">
                  <p><span className="font-medium">Last login:</span> {formatDateTime(item.lastLoginAt)}</p>
                </div>
                {canDeleteAdminRow(item) ? (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteAdminId(item.id)}
                    className="inline-flex w-full md:w-auto md:justify-self-end justify-center items-center rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                    title="Delete admin"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                ) : (
                  <span className="inline-flex w-full md:w-auto md:justify-self-end justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Protected
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <ConfirmActionDialog
        open={!!pendingDeleteAdminId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteAdminId(null);
        }}
        title="Delete admin?"
        description="This admin account will be removed permanently. Do you want to continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!pendingDeleteAdminId) return;
          deleteAdmin(pendingDeleteAdminId);
          setPendingDeleteAdminId(null);
        }}
      />
    </div>
  );
};

export default Admins;
