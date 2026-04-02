import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { Search, Trash2, Users } from 'lucide-react';

const AdminCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeleteCustomerId, setPendingDeleteCustomerId] = useState<string | null>(null);
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
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteCustomerId(c.id)}
                    className="inline-flex w-full md:w-auto justify-center items-center rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

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
