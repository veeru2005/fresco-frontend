import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { Search, Trash2, Users } from 'lucide-react';

const formatDetailValue = (value?: string) => {
  const normalized = String(value || '').trim();
  return normalized || '-';
};

const AdminCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeleteCustomerId, setPendingDeleteCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const isSuperAdmin = user?.isSuperAdmin;

  const isAdminLikeUser = (customer: any) => {
    const role = String(customer?.role || '').toLowerCase();
    return role === 'admin' || role === 'super-admin' || customer?.isAdmin === true || customer?.isSuperAdmin === true;
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return [...customers]
      .filter((customer) => !isAdminLikeUser(customer))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .filter((customer) => {
        if (!q) return true;
        return (
          String(customer.username || '').toLowerCase().includes(q) ||
          String(customer.email || '').toLowerCase().includes(q)
        );
      });
  }, [customers, searchQuery]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const token = localStorage.getItem('fresco_token');
        const res = await fetch(`${VITE_API_BASE_URL}/api/admin/customers`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (res.ok) {
          const data = await res.json();
          setCustomers(data);
        } else {
          console.error('Failed to load customers from backend');
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadCustomers();
  }, []);

  const deleteCustomer = async (customerId: string) => {
    if (!isSuperAdmin) return;

    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/super-admin/customers/${customerId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      } else {
        console.error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:pb-20">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Registered Customers</h1>
            <p className="text-muted-foreground">Manage customers</p>
          </div>
          <div className="relative w-full md:w-80 rounded-2xl border-2 border-[#255c45] overflow-hidden">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredCustomers.length === 0 ? (
          <Card className="w-full p-6 sm:p-8 text-center border-2 border-[#255c45]">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-2xl font-bold mb-2">{searchQuery ? 'No matching customers' : 'No customers registered yet'}</h3>
            <p className="text-muted-foreground">{searchQuery ? 'Try another search query.' : 'There are currently no registered customers.'}</p>
          </Card>
        ) : (
          filteredCustomers.map((c) => (
            <Card key={c.id} className="border-2 border-[#255c45]">
              <div className="p-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 md:items-center">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold shrink-0">{c.username?.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.username}</p>
                    <p className="text-sm text-muted-foreground break-all sm:break-normal">{c.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-2.5 md:gap-3 pt-1 md:pt-0">
                  {isSuperAdmin && (
                    <Button
                      type="button"
                      className="h-11 min-w-[120px] rounded-md bg-[#255c45] hover:bg-[#214f3b] text-white px-4"
                      onClick={() => setSelectedCustomer(c)}
                    >
                      Details
                    </Button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteCustomerId(c.id)}
                      className="inline-flex h-11 min-w-[120px] w-auto justify-center items-center rounded-md bg-red-600 px-4 text-white hover:bg-red-700 whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomer(null);
        }}
      >
        <DialogContent className="w-[92vw] max-w-2xl max-h-[82vh] overflow-hidden rounded-2xl border-2 border-[#255c45] p-0 flex flex-col gap-0 [&>button:last-child]:hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3.5 border-b border-[#255c45]/20 bg-slate-100/95 text-center sm:text-center">
            <DialogTitle className="w-full text-center text-2xl sm:text-[1.6rem] leading-tight">Customer Details</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-1 pb-3.5 sm:px-6 sm:pt-2 sm:pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.fullName || selectedCustomer.username)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Email</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm break-all">
                      {formatDetailValue(selectedCustomer.email)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Mobile</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.mobileNumber)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.gender)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Country</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.country)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>State</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.state)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>City</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.city)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Pincode</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.pincode)}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label>Address</Label>
                    <div className="rounded-xl border-2 border-[#255c45] bg-white px-3 py-2 text-sm">
                      {formatDetailValue(selectedCustomer.address)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-[#255c45]/20 bg-slate-100/95 px-4 py-3 sm:px-6 sm:py-3.5">
                <Button
                  type="button"
                  className="h-11 w-full bg-[#255c45] hover:bg-[#214f3b] text-white"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!pendingDeleteCustomerId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCustomerId(null);
        }}
        title="Delete customer?"
        description="This customer record will be permanently removed. Do you want to continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!pendingDeleteCustomerId) return;
          deleteCustomer(pendingDeleteCustomerId);
          setPendingDeleteCustomerId(null);
        }}
      />
    </div>
  );
};

export default AdminCustomers;
