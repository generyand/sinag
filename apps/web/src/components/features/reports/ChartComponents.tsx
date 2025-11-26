import { BarChartData, PieChartData, TrendData } from "@sinag/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

// Color constants for consistent theming
const COLORS = {
  passed: "#10b981", // green-500
  failed: "#ef4444", // red-500
  inProgress: "#f59e0b", // amber-500
};

interface AreaBreakdownBarChartProps {
  data: BarChartData[];
}

// Custom tooltip component for better formatting
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string> & { payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    const passedData = payload.find((p) => p.dataKey === "passed");
    const failedData = payload.find((p) => p.dataKey === "failed");

    const passed = passedData?.value || 0;
    const failed = failedData?.value || 0;
    const total = passed + failed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return (
      <div className="bg-card rounded p-3 shadow-lg border border-gray-200">
        <p className="font-semibold text-sm mb-2">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.passed }}
            />
            <span>Passed: {passed}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.failed }}
            />
            <span>Failed: {failed}</span>
          </div>
          <div className="pt-1 mt-1">
            <span>Pass Rate: {passRate}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function AreaBreakdownBarChart({ data }: AreaBreakdownBarChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No data available for chart</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        aria-label="Bar chart showing assessment results by governance area"
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="area_name"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          aria-label="Governance areas"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          label={{
            value: "Count",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 12 },
          }}
          aria-label="Number of barangays"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="square"
        />
        <Bar
          dataKey="passed"
          name="Passed"
          fill={COLORS.passed}
          radius={[4, 4, 0, 0]}
          aria-label="Passed assessments"
        />
        <Bar
          dataKey="failed"
          name="Failed"
          fill={COLORS.failed}
          radius={[4, 4, 0, 0]}
          aria-label="Failed assessments"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ComplianceStatusPieChartProps {
  data: PieChartData[];
}

// Helper function to get color based on status
const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("pass")) return COLORS.passed;
  if (normalizedStatus.includes("fail")) return COLORS.failed;
  if (normalizedStatus.includes("progress")) return COLORS.inProgress;
  return "#94a3b8"; // slate-400 for unknown status
};

// Custom label for pie chart slices
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percentage is significant (> 5%)
  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Custom tooltip for pie chart
const PieTooltip = ({ active, payload }: TooltipProps<number, string> & { payload?: Array<{ payload?: PieChartData }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PieChartData;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-1">{data.status}</p>
        <div className="space-y-1 text-xs">
          <p>Count: {data.count}</p>
          <p>Percentage: {data.percentage?.toFixed(1)}%</p>
        </div>
      </div>
    );
  }
  return null;
};

export function ComplianceStatusPieChart({ data }: ComplianceStatusPieChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No data available for chart</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart aria-label="Pie chart showing compliance status distribution">
        <Pie
          data={data as any}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel as any}
          outerRadius={100}
          fill="#8884d8"
          dataKey="count"
          aria-label="Status distribution"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getStatusColor(entry.status)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value, entry) => {
            const data = entry.payload as PieChartData;
            return `${data.status} (${data.count})`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface TrendLineChartProps {
  data: TrendData[];
}

// Custom tooltip for line chart
const TrendTooltip = ({ active, payload }: TooltipProps<number, string> & { payload?: Array<{ payload?: TrendData; value?: number }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TrendData;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-1">{data.cycle_name}</p>
        <div className="space-y-1 text-xs">
          <p>Pass Rate: {data.pass_rate.toFixed(1)}%</p>
          <p className="text-muted-foreground">
            {new Date(data.date).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function TrendLineChart({ data }: TrendLineChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No trend data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        aria-label="Line chart showing pass rate trends over time"
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="cycle_name"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          aria-label="Assessment cycles"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          domain={[0, 100]}
          label={{
            value: "Pass Rate (%)",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 12 },
          }}
          aria-label="Pass rate percentage"
        />
        <Tooltip content={<TrendTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="pass_rate"
          name="Pass Rate"
          stroke={COLORS.passed}
          strokeWidth={2}
          dot={{
            fill: COLORS.passed,
            strokeWidth: 2,
            r: 4,
          }}
          activeDot={{ r: 6 }}
          aria-label="Pass rate trend line"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
