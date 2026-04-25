import { useState, useEffect } from 'react';
import { api } from '../../api/admin.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { Search, Download, Shield, ShieldAlert, UserCheck, UserX } from 'lucide-react';

interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  isTherapistVerified: boolean;
  createdAt: string;
}

export default function AllUsers() {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<BackendUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/admin/users?limit=100');
      const userData = res.data.data || [];
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/v1/admin/users/${id}/status`, { status: newStatus });
      toast.success(`User ${newStatus.toLowerCase()} successfully`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const exportUsers = () => {
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'],
      ...filteredUsers.map(u => [u.firstName, u.lastName, u.email, u.phone, u.role, u.status, u.createdAt])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manas360-users-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    toast.success('Users exported to CSV');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="success" className="bg-green-500/10 text-green-500 border-none">ACTIVE</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-none">SUSPENDED</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage platform access and monitor user accounts</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-80 bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-xl"
            />
          </div>
          <Button onClick={exportUsers} variant="secondary" size="sm" className="hidden md:flex">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="glass-card overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-center">Role</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Verification</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-white group-hover:text-primary transition-colors">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{user.id.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm">
                      <span className="text-white/80">{user.email}</span>
                      <span className="text-xs text-muted-foreground">{user.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center uppercase">
                    <Badge variant="soft" className="bg-primary/10 text-primary border-none text-[10px] px-2 py-0.5">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.isTherapistVerified ? (
                      <div className="flex items-center justify-center text-green-500 gap-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-bold">VERIFIED</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-muted-foreground gap-1">
                        <ShieldAlert className="w-4 h-4 opacity-30" />
                        <span className="text-[10px]">PENDING</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="soft"
                      size="sm"
                      className={`min-w-[100px] border transition-all ${
                        user.status.toLowerCase() === 'active' 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' 
                          : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                      }`}
                      onClick={() => toggleStatus(user.id, user.status)}
                    >
                      {user.status.toLowerCase() === 'active' ? (
                        <div className="flex items-center gap-2">
                          <UserX className="w-3 h-3" />
                          Suspend
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3 h-3" />
                          Activate
                        </div>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p>No users found matching your search</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Showing {filteredUsers.length} of {users.length} users</p>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" disabled>Previous</Button>
           <Button variant="ghost" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
