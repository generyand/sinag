import { useQuery } from '@tanstack/react-query';

// Mock data - replace with actual API calls
const mockAnalyticsData = {
  officialPerformance: {
    totalBarangays: 25,
    passed: 18,
    failed: 5,
    notAssessed: 2,
    passedBarangays: [
      { name: 'Barangay Poblacion', score: 95 },
      { name: 'Barangay Balasinon', score: 92 },
      { name: 'Barangay Buguis', score: 88 },
      { name: 'Barangay Carre', score: 85 },
      { name: 'Barangay Clib', score: 82 },
      { name: 'Barangay Harada Butai', score: 80 },
      { name: 'Barangay Katipunan', score: 78 },
      { name: 'Barangay Kiblagon', score: 75 },
      { name: 'Barangay Labon', score: 72 },
      { name: 'Barangay Laperas', score: 70 },
      { name: 'Barangay Lapla', score: 68 },
      { name: 'Barangay Litos', score: 65 },
      { name: 'Barangay Luparan', score: 62 },
      { name: 'Barangay Mckinley', score: 60 },
      { name: 'Barangay New Cebu', score: 58 },
      { name: 'Barangay Osmeña', score: 55 },
      { name: 'Barangay Palili', score: 52 },
      { name: 'Barangay Parame', score: 50 },
    ]
  },
  crossMatching: {
    predictionAccuracy: {
      accuracy: 92,
      falsePositives: 1,
      falseNegatives: 1,
      totalPredictions: 23
    },
    discrepancies: [
      {
        barangay: 'Barangay Luparan',
        sinagPrediction: 'Pass' as const,
        officialResult: 'Fail' as const,
        supervisorRemarks: 'Documentation issues discovered during final validation that were not captured in pre-assessment'
      },
      {
        barangay: 'Barangay Mckinley',
        sinagPrediction: 'Fail' as const,
        officialResult: 'Pass' as const,
        supervisorRemarks: 'Barangay made significant improvements between pre-assessment and final validation'
      }
    ]
  },
  systemicWeakness: {
    weaknesses: [
      {
        indicator: '3.1.5: BADAC Plan',
        failedCount: 12,
        totalBarangays: 25,
        percentage: 48
      },
      {
        indicator: '4.2.3: Environmental Management',
        failedCount: 10,
        totalBarangays: 25,
        percentage: 40
      },
      {
        indicator: '2.1.2: Financial Records',
        failedCount: 8,
        totalBarangays: 25,
        percentage: 32
      },
      {
        indicator: '5.3.1: Youth Development',
        failedCount: 7,
        totalBarangays: 25,
        percentage: 28
      },
      {
        indicator: '1.4.1: Digital Governance',
        failedCount: 6,
        totalBarangays: 25,
        percentage: 24
      }
    ]
  },
  barangays: [
    { value: 'poblacion', label: 'Barangay Poblacion' },
    { value: 'balasinon', label: 'Barangay Balasinon' },
    { value: 'buguis', label: 'Barangay Buguis' },
    { value: 'carre', label: 'Barangay Carre' },
    { value: 'clib', label: 'Barangay Clib' },
    { value: 'harada-butai', label: 'Barangay Harada Butai' },
    { value: 'katipunan', label: 'Barangay Katipunan' },
    { value: 'kiblagon', label: 'Barangay Kiblagon' },
    { value: 'labon', label: 'Barangay Labon' },
    { value: 'laperas', label: 'Barangay Laperas' },
    { value: 'lapla', label: 'Barangay Lapla' },
    { value: 'litos', label: 'Barangay Litos' },
    { value: 'luparan', label: 'Barangay Luparan' },
    { value: 'mckinley', label: 'Barangay Mckinley' },
    { value: 'new-cebu', label: 'Barangay New Cebu' },
    { value: 'osmena', label: 'Barangay Osmeña' },
    { value: 'palili', label: 'Barangay Palili' },
    { value: 'parame', label: 'Barangay Parame' },
    { value: 'roxas', label: 'Barangay Roxas' },
    { value: 'solongvale', label: 'Barangay Solongvale' },
    { value: 'tagolilong', label: 'Barangay Tagolilong' },
    { value: 'tala-o', label: 'Barangay Tala-o' },
    { value: 'talas', label: 'Barangay Talas' },
    { value: 'tanwalang', label: 'Barangay Tanwalang' },
    { value: 'waterfall', label: 'Barangay Waterfall' }
  ]
};

const analyticsKeys = {
  all: ['analytics'] as const,
  officialPerformance: (period: string) => [...analyticsKeys.all, 'official-performance', period] as const,
  crossMatching: (period: string) => [...analyticsKeys.all, 'cross-matching', period] as const,
  systemicWeakness: (period: string) => [...analyticsKeys.all, 'systemic-weakness', period] as const,
  barangays: () => [...analyticsKeys.all, 'barangays'] as const,
};

export function useOfficialPerformance(period: string) {
  return useQuery({
    queryKey: analyticsKeys.officialPerformance(period),
    queryFn: () => Promise.resolve(mockAnalyticsData.officialPerformance),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCrossMatching(period: string) {
  return useQuery({
    queryKey: analyticsKeys.crossMatching(period),
    queryFn: () => Promise.resolve(mockAnalyticsData.crossMatching),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSystemicWeakness(period: string) {
  return useQuery({
    queryKey: analyticsKeys.systemicWeakness(period),
    queryFn: () => Promise.resolve(mockAnalyticsData.systemicWeakness),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBarangays() {
  return useQuery({
    queryKey: analyticsKeys.barangays(),
    queryFn: () => Promise.resolve(mockAnalyticsData.barangays),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
} 