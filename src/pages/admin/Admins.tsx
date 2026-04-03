import { useCallback, useEffect, useMemo, useState } from 'react';
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
  fullName?: string;
  mobileNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gender?: string;
  country?: string;
  lastLoginAt?: string | null;
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
  const [selectedAdmin, setSelectedAdmin] = useState<AdminActivity | null>(null);
  const [pendingDeleteAdminId, setPendingDeleteAdminId] = useState<string | null>(null);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const isSuperAdmin = user?.isSuperAdmin;

  const loadAdmins = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setIsLoadingAdmins(true);
      }

      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/super-admin/admins`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load admin activity');
      }

      const data = await res.json();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading admin activity:', error);
      if (!silent) {
        toast({
          title: 'Could not load admins',
          description: 'Please try again after refreshing.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) {
        setIsLoadingAdmins(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    loadAdmins();

    const refreshOnFocus = () => {
      loadAdmins({ silent: true });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadAdmins({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      loadAdmins({ silent: true });
    }, 15000);

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [isSuperAdmin, loadAdmins]);

  useEffect(() => {
    if (!selectedAdmin) return;

    const latestAdmin = admins.find((item) => item.id === selectedAdmin.id);
    if (!latestAdmin) {
      setSelectedAdmin(null);
      return;
    }

    setSelectedAdmin(latestAdmin);
  }, [admins, selectedAdmin]);

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

  const formatDateTime = (value?: string | null) => {
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

  const formatDetailValue = (value?: string | null) => {
    const cleaned = String(value || '').trim();
    return cleaned || 'Not provided';
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
      await loadAdmins({ silent: true });
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
      if (selectedAdmin?.id === adminId) {
        setSelectedAdmin(null);
      }
      toast({ title: 'Deleted', description: 'Admin deleted successfully' });
      loadAdmins({ silent: true });
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Management</h1>
            <p className="text-muted-foreground">Add new admins and manage admin accounts</p>
            {isLoadingAdmins ? <p className="text-xs text-muted-foreground mt-1">Loading latest admin details...</p> : null}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-[300px] h-10 rounded-xl border-2 border-[#255c45]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search admins by name/email"
                className="pl-10 h-full rounded-xl border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
              />
            </div>

            <Button
              type="button"
              className="bg-[#255c45] hover:bg-[#214f3b] text-white whitespace-nowrap h-10 px-4 rounded-xl border border-[#255c45]"
              onClick={() => setIsAddAdminOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="w-[92vw] sm:w-[95vw] max-w-lg rounded-2xl sm:rounded-[28px] border-2 border-[#255c45] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Super admin needs only name and email. The admin can fill remaining profile details later.
            </p>
            <div className="space-y-2">
              <Label htmlFor="adminName">Name</Label>
              <Input
                id="adminName"
                placeholder="Admin name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 rounded-xl sm:rounded-2xl border-2 border-[#255c45] px-4 focus-visible:ring-0 focus-visible:border-[#255c45]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input
                id="adminEmail"
                placeholder="admin@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="h-12 rounded-xl sm:rounded-2xl border-2 border-[#255c45] px-4 focus-visible:ring-0 focus-visible:border-[#255c45]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                className="h-11 rounded-xl sm:rounded-2xl border border-amber-300 bg-amber-400 px-6 text-slate-900 hover:bg-amber-500"
                onClick={() => setIsAddAdminOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateAdmin}
                disabled={isSubmitting}
                className="h-11 rounded-xl sm:rounded-2xl bg-[#255c45] px-6 text-white hover:bg-[#214f3b]"
              >
                {isSubmitting ? 'Saving...' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedAdmin}
        onOpenChange={(open) => {
          if (!open) setSelectedAdmin(null);
        }}
      >
        <DialogContent className="w-[92vw] max-w-2xl max-h-[82vh] overflow-hidden rounded-2xl border-2 border-[#255c45] p-0 flex flex-col gap-0 [&>button:last-child]:hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3.5 border-b border-[#255c45]/20 bg-slate-100/95 text-center sm:text-center">
            <DialogTitle className="w-full text-center text-2xl sm:text-[1.6rem] leading-tight">Admin Details</DialogTitle>
          </DialogHeader>

          {selectedAdmin && (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-1 pb-3.5 sm:px-6 sm:pt-2 sm:pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedAdmin.fullName || selectedAdmin.name)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm break-all">{formatDetailValue(selectedAdmin.email)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Mobile</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.mobileNumber)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.gender)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.country)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>State</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.state)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>City</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.city)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Pincode</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.pincode)}</div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Address</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">{formatDetailValue(selectedAdmin.address)}</div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-[#255c45]/20 bg-slate-100/95 px-4 py-3 sm:px-6 sm:py-3.5">
                <Button
                  type="button"
                  className="h-11 w-full bg-[#255c45] hover:bg-[#214f3b] text-white"
                  onClick={() => setSelectedAdmin(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {filteredAdmins.length === 0 ? (
          <Card className="w-full p-6 sm:p-8 text-center border-2 border-[#255c45]">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-2xl font-bold mb-2">No admins found</h3>
            <p className="text-muted-foreground">There are currently no administrators matching your criteria.</p>
          </Card>
        ) : (
          filteredAdmins.map((item) => (
            <Card key={item.id} className="border-2 border-[#255c45] border-l-4 border-l-[#255c45]">
              <div className="relative p-3.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-1">
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
                  <p className="text-sm md:hidden">Last login: {formatDateTime(item.lastLoginAt)}</p>
                </div>

                <p className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm whitespace-nowrap">
                  Last login: {formatDateTime(item.lastLoginAt)}
                </p>

                <div className="flex items-center justify-between md:justify-end gap-2.5 md:gap-3 pt-1 md:pt-0">
                  <Button
                    type="button"
                    className="h-11 min-w-[120px] rounded-md bg-[#255c45] hover:bg-[#214f3b] text-white px-4"
                    onClick={() => setSelectedAdmin(item)}
                  >
                    Details
                  </Button>
                  {canDeleteAdminRow(item) ? (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteAdminId(item.id)}
                      className="inline-flex h-11 min-w-[120px] w-auto justify-center items-center rounded-md bg-red-600 px-4 text-white hover:bg-red-700 whitespace-nowrap"
                      title="Delete admin"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  ) : (
                    <span className="inline-flex w-auto justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Protected
                    </span>
                  )}
                </div>
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
