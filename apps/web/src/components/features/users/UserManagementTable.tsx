import React from 'react';
import type { User } from '@sinag/shared/src/generated/schemas/users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Building, Users, Phone, Shield, KeyRound } from 'lucide-react';
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

// Memoized UserCard to prevent unnecessary re-renders
const UserCard = React.memo(({
  user,
  onEditUser,
  barangayMap,
  governanceAreaMap
}: {
  user: User;
  onEditUser?: (user: User) => void;
  barangayMap: Map<number, string>;
  governanceAreaMap: Map<number, string>;
}) => {
  return (
    <article
      className="group bg-[var(--card)] border border-[var(--border)] rounded-sm px-4 py-3 hover:border-[var(--cityscape-yellow)] hover:shadow-md transition-all duration-300 relative overflow-hidden"
      aria-label={`User: ${user.name}`}
    >
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--cityscape-yellow)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* User Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(to bottom right, var(--kpi-blue-from), var(--kpi-blue-to))'
              }}
            >
              <span
                className="text-base font-bold"
                style={{ color: 'var(--kpi-blue-text)' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--foreground)] truncate">{user.name}</h3>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="px-2 py-0.5 rounded-sm text-xs font-medium"
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
              className="px-2 py-0.5 rounded-sm text-xs font-medium"
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
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
                style={{ backgroundColor: 'var(--analytics-neutral-bg)' }}
              >
                <Building className="h-3 w-3" style={{ color: 'var(--analytics-neutral-text)' }} aria-hidden="true" />
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
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
                style={{ backgroundColor: 'var(--analytics-warning-bg)' }}
              >
                <Users className="h-3 w-3" style={{ color: 'var(--analytics-warning-text)' }} aria-hidden="true" />
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--analytics-warning-text)' }}
                >
                  {governanceAreaMap.get(user.validator_area_id) || `Area #${user.validator_area_id}`}
                </span>
              </div>
            )}

            {/* Inline additional info */}
            {user.phone_number && (
              <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {user.phone_number}
              </span>
            )}
            {user.is_superuser && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium"
                style={{
                  backgroundColor: 'var(--analytics-danger-bg)',
                  color: 'var(--analytics-danger-text)'
                }}
              >
                <Shield className="h-3 w-3" aria-hidden="true" />
                Superuser
              </span>
            )}
            {user.must_change_password && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium"
                style={{
                  backgroundColor: 'var(--analytics-warning-bg)',
                  color: 'var(--analytics-warning-text)'
                }}
              >
                <KeyRound className="h-3 w-3" aria-hidden="true" />
                Must Change Password
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditUser?.(user)}
            className="bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 border-[var(--border)] hover:border-[var(--cityscape-yellow)] text-[var(--foreground)] rounded-sm text-xs font-medium transition-all duration-200 h-8 px-3"
            aria-label={`Edit user ${user.name}`}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </div>
    </article>
  );
});

UserCard.displayName = 'UserCard';

const UserManagementTable = React.memo(function UserManagementTable({ users, onEditUser }: UserManagementTableProps) {
  // Fetch barangays and governance areas data
  const { data: barangaysData } = useBarangays();
  const { data: governanceAreasData } = useGovernanceAreas();

  // Type assertions and create lookup maps (memoized to prevent recreation on every render)
  const barangays = barangaysData as Barangay[] | undefined;
  const governanceAreas = governanceAreasData as GovernanceArea[] | undefined;

  const barangayMap = React.useMemo(
    () => new Map(barangays?.map(b => [b.id, b.name]) || []),
    [barangays]
  );

  const governanceAreaMap = React.useMemo(
    () => new Map(governanceAreas?.map(g => [g.id, g.name]) || []),
    [governanceAreas]
  );

  return (
    <div className="space-y-2" role="list" aria-label="User accounts">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onEditUser={onEditUser}
          barangayMap={barangayMap}
          governanceAreaMap={governanceAreaMap}
        />
      ))}

      {users.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[var(--muted)]/20 rounded-sm flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-[var(--muted-foreground)]" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No users found</h3>
          <p className="text-[var(--muted-foreground)]">Get started by adding your first user account.</p>
        </div>
      )}
    </div>
  );
});

export default UserManagementTable; 