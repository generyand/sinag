/**
 * TrendChart Component
 *
 * Visualizes historical trend data across assessment cycles using Recharts.
 *
 * IMPORTANT: This component requires the 'recharts' package to be installed.
 * If not installed, run: pnpm add recharts
 */

import type { TrendData } from "@sinag/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

// Recharts imports - will need to install: pnpm add recharts
// Uncomment when recharts is installed:
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
// } from 'recharts';

interface TrendChartProps {
  data: TrendData[];
}

/**
 * Custom tooltip component for the trend chart
 */
// function CustomTooltip({ active, payload }: any) {
//   if (active && payload && payload.length) {
//     return (
//       <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
//         <p className="text-sm font-medium text-gray-900">{payload[0].payload.cycle_name}</p>
//         <p className="mt-1 text-sm text-gray-600">
//           Pass Rate:{' '}
//           <span className="font-semibold text-green-600">{payload[0].value.toFixed(1)}%</span>
//         </p>
//         <p className="mt-0.5 text-xs text-gray-500">
//           {new Date(payload[0].payload.date).toLocaleDateString()}
//         </p>
//       </div>
//     );
//   }
//   return null;
// }

/**
 * TrendChart - Line chart showing pass rates across cycles
 */
export function TrendChart({ data }: TrendChartProps) {
  // Transform data for Recharts
  const chartData = data.map((item) => ({
    cycle: item.cycle_name,
    passRate: item.pass_rate,
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
  }));

  const hasData = chartData.length > 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Historical Trends
        </CardTitle>
        <CardDescription>Pass rate trends across assessment cycles</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No trend data available. Historical data will appear here as more cycles are completed.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recharts LineChart Component - Uncomment when recharts is installed */}
            {/* <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="cycle"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                  label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  name="Pass Rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer> */}

            {/* Temporary placeholder until recharts is installed */}
            <div className="h-[300px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <div className="text-center p-6">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-2">Trend Chart Placeholder</p>
                <p className="text-xs text-gray-500 mb-3">
                  Install recharts to view the line chart visualization
                </p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">pnpm add recharts</code>
              </div>
            </div>

            {/* Data Table Fallback */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-3 text-left font-medium text-gray-700">Cycle</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-700">Pass Rate</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{item.cycle}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-green-600">
                          {item.passRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendChart;
