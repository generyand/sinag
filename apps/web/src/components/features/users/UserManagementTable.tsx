import type { User } from '@sinag/shared/src/generated/schemas/users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Building, Users } from 'lucide-react';
import { useBarangays } from '@/hooks/useBarangays';
import { useGovernanceAreas } from '@/hooks/useGovernanceAreas';
import type { Barangay, GovernanceArea } from '@sinag/shared';

interface UserManagementTableProps {
  users: User[];
  onEditUser?: (user: User) => void;
}

function humanizeRole(role: string) {
  switch (role) {
    case 'MLGOO_DILG':
      return 'MLGOO DILG (Admin)';
    case 'ASSESSOR':
      return 'Assessor';
    case 'VALIDATOR':
      return 'Validator';
    case 'BLGU_USER':
      return 'BLGU User';
    default:
      // Capitalize and replace underscores with spaces for any other roles
      return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

export default function UserManagementTable({ users, onEditUser }: UserManagementTableProps) {
  // Fetch barangays and governance areas data
  const { data: barangaysData } = useBarangays();
  const { data: governanceAreasData } = useGovernanceAreas();
  
  // Type assertions and create lookup maps
  const barangays = barangaysData as Barangay[] | undefined;
  const governanceAreas = governanceAreasData as GovernanceArea[] | undefined;
  
  const barangayMap = new Map(barangays?.map(b => [b.id, b.name]) || []);
  const governanceAreaMap = new Map(governanceAreas?.map(g => [g.id, g.name]) || []);

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="group bg-[var(--card)] border-2 border-[var(--border)] rounded-sm p-6 hover:border-[var(--cityscape-yellow)] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
        >
          {/* Hover gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--cityscape-yellow)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-sm flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(to bottom right, var(--kpi-blue-from), var(--kpi-blue-to))'
                  }}
                >
                  <span 
                    className="text-lg font-bold"
                    style={{ color: 'var(--kpi-blue-text)' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{user.name}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <Badge
                  variant="outline"
                  className="px-3 py-1 rounded-sm font-medium"
                  style={{
                    backgroundColor: user.role === 'MLGOO_DILG' ? 'var(--kpi-purple-from)' :
                                   user.role === 'VALIDATOR' ? 'var(--analytics-warning-bg)' :
                                   user.role === 'ASSESSOR' ? 'var(--analytics-info-bg)' :
                                   'var(--kpi-blue-from)',
                    color: user.role === 'MLGOO_DILG' ? 'var(--kpi-purple-text)' :
                          user.role === 'VALIDATOR' ? 'var(--analytics-warning-text)' :
                          user.role === 'ASSESSOR' ? 'var(--analytics-info-text)' :
                          'var(--kpi-blue-text)',
                    borderColor: user.role === 'MLGOO_DILG' ? 'var(--kpi-purple-border, var(--border))' :
                               user.role === 'VALIDATOR' ? 'var(--analytics-warning-border)' :
                               user.role === 'ASSESSOR' ? 'var(--analytics-info-border)' :
                               'var(--kpi-blue-border, var(--border))'
                  }}
                >
                  {humanizeRole(user.role)}
                </Badge>
                
                <Badge 
                  variant="outline"
                  className="px-3 py-1 rounded-sm font-medium"
                  style={{
                    backgroundColor: user.is_active ? 'var(--analytics-success-bg)' : 'var(--analytics-neutral-bg)',
                    color: user.is_active ? 'var(--analytics-success-text)' : 'var(--analytics-neutral-text)',
                    borderColor: user.is_active ? 'var(--analytics-success-border)' : 'var(--analytics-neutral-border)'
                  }}
                >
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
                
                {user.role === 'BLGU_USER' && user.barangay_id && (
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded-sm"
                    style={{ backgroundColor: 'var(--analytics-neutral-bg)' }}
                  >
                    <Building className="h-3 w-3" style={{ color: 'var(--analytics-neutral-text)' }} />
                    <span 
                      className="text-xs font-medium"
                      style={{ color: 'var(--analytics-neutral-text)' }}
                    >
                      {barangayMap.get(user.barangay_id) || `Barangay #${user.barangay_id}`}
                    </span>
                  </div>
                )}
                
                {user.role === 'VALIDATOR' && user.validator_area_id && (
                  <div
                    className="flex items-center gap-2 px-3 py-1 rounded-sm"
                    style={{ backgroundColor: 'var(--analytics-warning-bg)' }}
                  >
                    <Users className="h-3 w-3" style={{ color: 'var(--analytics-warning-text)' }} />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--analytics-warning-text)' }}
                    >
                      {governanceAreaMap.get(user.validator_area_id) || `Area #${user.validator_area_id}`}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Additional Info */}
              <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                {user.phone_number && (
                  <span>📞 {user.phone_number}</span>
                )}
                {user.is_superuser && (
                  <span 
                    className="px-2 py-1 rounded-sm font-medium"
                    style={{
                      backgroundColor: 'var(--analytics-danger-bg)',
                      color: 'var(--analytics-danger-text)'
                    }}
                  >
                    🔐 Superuser
                  </span>
                )}
                {user.must_change_password && (
                  <span 
                    className="px-2 py-1 rounded-sm font-medium"
                    style={{
                      backgroundColor: 'var(--analytics-warning-bg)',
                      color: 'var(--analytics-warning-text)'
                    }}
                  >
                    🔄 Must Change Password
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditUser?.(user)}
                className="bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 border-[var(--border)] hover:border-[var(--cityscape-yellow)] text-[var(--foreground)] rounded-sm font-medium transition-all duration-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </Button>
            </div>
          </div>
        </div>
      ))}
      
      {users.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[var(--muted)]/20 rounded-sm flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No users found</h3>
          <p className="text-[var(--text-secondary)]">Get started by adding your first user account.</p>
        </div>
      )}
    </div>
  );
} 