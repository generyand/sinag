'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { ProfileForm, ProfileSkeleton } from '@/components/features/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck } from 'lucide-react';

/**
 * Katuparan Center Profile Page
 *
 * User Settings - Basic user management with organization info
 */
export default function KatuparanProfilePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Organization Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Organization</CardTitle>
              </div>
              <CardDescription>Your associated organization and access level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">Katuparan Center</p>
                  <p className="text-sm text-muted-foreground">
                    Research and Capacity Development Partner
                  </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Read-Only Access
                </Badge>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>
                  As an external stakeholder, you have read-only access to aggregated, anonymized
                  SGLGB analytics data for research purposes. Individual barangay data is not
                  accessible to protect privacy.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form */}
          <ProfileForm user={user} />
        </div>
      </div>
    </div>
  );
}
