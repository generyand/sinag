import { useBarangays } from './useBarangays';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import { Barangay } from '@sinag/shared';

// TODO: Consider creating a dedicated hook for user's barangay data
// Expected endpoint: GET /api/v1/users/me/barangay
// Expected response: { barangay: Barangay, barangay_id: number }
export function useUserBarangay() {
  const { user } = useAuthStore();
  const { data: barangaysData, isLoading, error } = useBarangays();

  // Debug logging
  useEffect(() => {
    console.log('useUserBarangay Debug:');
    console.log('User:', user);
    console.log('User barangay_id:', user?.barangay_id);
    console.log('Barangays data:', barangaysData);
    console.log('Barangays loading:', isLoading);
    console.log('Barangays error:', error);
  }, [user, barangaysData, isLoading, error]);

  const getUserBarangayName = () => {
    if (!user?.barangay_id || !barangaysData) {
      console.log('getUserBarangayName: Missing data', { 
        userBarangayId: user?.barangay_id, 
        barangaysData: !!barangaysData 
      });
      return 'Unknown Barangay';
    }

    const barangay = (barangaysData as Barangay[]).find(
      (b: Barangay) => b.id === user.barangay_id
    );

    console.log('getUserBarangayName: Found barangay', { 
      userBarangayId: user.barangay_id, 
      foundBarangay: barangay 
    });

    return barangay?.name || 'Unknown Barangay';
  };

  return {
    barangayName: getUserBarangayName(),
    isLoading,
    error,
    barangayId: user?.barangay_id
  };
}