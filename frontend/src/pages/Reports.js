import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Globe,
  PieChart,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1F2833]/95 backdrop-blur-md border border-white/10 rounded-sm p-3">
        <p className="text-xs text-[#C5C6C7] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? `$${entry.value.toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [analytics, setAnalytics] = useState({ kyc_distribution: [], country_distribution: [] });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes, analyticsRes] = await Promise.all([
          fetch(`${API_URL}/api/reports/dashboard`, { headers: getAuthHeaders(), credentials: 'include' }),
          fetch(`${API_URL}/api/reports/transactions-summary?days=${period}`, { headers: getAuthHeaders(), credentials: 'include' }),
          fetch(`${API_URL}/api/reports/client-analytics`, { headers: getAuthHeaders(), credentials: 'include' }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (chartRes.ok) setChartData(await chartRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const COLORS = ['#66FCF1', '#00C853', '#FFD600', '#FF3B30', '#45A29E', '#9333EA'];

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp, color = 'cyan' }) => (
    <Card className="bg-[#1F2833] border-white/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-white font-mono">{value}</p>
            {subtitle && <p className="text-xs text-[#C5C6C7] mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="text-xs font-mono">{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-sm ${color === 'cyan' ? 'bg-[#66FCF1]/10' : color === 'green' ? 'bg-green-500/10' : color === 'yellow' ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
            <Icon className={`w-5 h-5 ${color === 'cyan' ? 'text-[#66FCF1]' : color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-red-400'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const netFlow = (stats?.transactions?.total_deposits || 0) - (stats?.transactions?.total_withdrawals || 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Reports & Analytics
          </h1>
          <p className="text-[#C5C6C7]">Financial reports and client analytics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 bg-[#1F2833] border-white/10 text-white" data-testid="period-select">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-[#1F2833] border-white/10">
            <SelectItem value="7" className="text-white hover:bg-white/5">Last 7 days</SelectItem>
            <SelectItem value="30" className="text-white hover:bg-white/5">Last 30 days</SelectItem>
            <SelectItem value="90" className="text-white hover:bg-white/5">Last 90 days</SelectItem>
            <SelectItem value="365" className="text-white hover:bg-white/5">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Deposits"
          value={`$${(stats?.transactions?.total_deposits || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Withdrawals"
          value={`$${(stats?.transactions?.total_withdrawals || 0).toLocaleString()}`}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Net Cash Flow"
          value={`$${Math.abs(netFlow).toLocaleString()}`}
          subtitle={netFlow >= 0 ? 'Positive' : 'Negative'}
          icon={DollarSign}
          color={netFlow >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Total AUM"
          value={`$${(stats?.accounts?.total_balance || 0).toLocaleString()}`}
          subtitle="Assets Under Management"
          icon={Activity}
          color="cyan"
        />
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-[#1F2833] border border-white/5">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#66FCF1]/10 data-[state=active]:text-[#66FCF1]">
            <BarChart3 className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-[#66FCF1]/10 data-[state=active]:text-[#66FCF1]">
            <Users className="w-4 h-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="geography" className="data-[state=active]:bg-[#66FCF1]/10 data-[state=active]:text-[#66FCF1]">
            <Globe className="w-4 h-4 mr-2" />
            Geography
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Transaction Volume Chart */}
            <Card className="bg-[#1F2833] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#66FCF1]" />
                  Transaction Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00C853" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00C853" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="withdrawalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#C5C6C7" 
                        tick={{ fill: '#C5C6C7', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#C5C6C7" 
                        tick={{ fill: '#C5C6C7', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        tickFormatter={(v) => `$${v/1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="deposits"
                        name="Deposits"
                        stroke="#00C853"
                        fillOpacity={1}
                        fill="url(#depositGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="withdrawals"
                        name="Withdrawals"
                        stroke="#FF3B30"
                        fillOpacity={1}
                        fill="url(#withdrawalGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily Comparison */}
            <Card className="bg-[#1F2833] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#66FCF1]" />
                  Daily Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="date" 
                        stroke="#C5C6C7" 
                        tick={{ fill: '#C5C6C7', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#C5C6C7" 
                        tick={{ fill: '#C5C6C7', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        tickFormatter={(v) => `$${v/1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="deposits" name="Deposits" fill="#00C853" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="withdrawals" name="Withdrawals" fill="#FF3B30" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* P&L Summary */}
          <Card className="bg-[#1F2833] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#66FCF1]" />
                P&L Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Gross Revenue</p>
                  <p className="text-2xl font-mono text-green-400">+${(stats?.transactions?.total_deposits || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Total Payouts</p>
                  <p className="text-2xl font-mono text-red-400">-${(stats?.transactions?.total_withdrawals || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Net Position</p>
                  <p className={`text-2xl font-mono ${netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {netFlow >= 0 ? '+' : '-'}${Math.abs(netFlow).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* KYC Distribution */}
            <Card className="bg-[#1F2833] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#66FCF1]" />
                  KYC Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analytics.kyc_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                        label={({ status, count }) => `${status}: ${count}`}
                        labelLine={{ stroke: '#C5C6C7' }}
                      >
                        {analytics.kyc_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#1F2833',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '2px',
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Client Stats */}
            <Card className="bg-[#1F2833] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#66FCF1]" />
                  Client Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#C5C6C7]">Total Clients</span>
                      <span className="text-2xl font-mono text-white">{stats?.clients?.total || 0}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#C5C6C7]">Approved (KYC)</span>
                      <span className="text-2xl font-mono text-green-400">{stats?.clients?.approved || 0}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#C5C6C7]">Pending (KYC)</span>
                      <span className="text-2xl font-mono text-yellow-400">{stats?.clients?.pending || 0}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#C5C6C7]">Active Accounts</span>
                      <span className="text-2xl font-mono text-[#66FCF1]">{stats?.accounts?.active || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-4">
          <Card className="bg-[#1F2833] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#66FCF1]" />
                Client Distribution by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.country_distribution} layout="vertical">
                    <XAxis 
                      type="number"
                      stroke="#C5C6C7" 
                      tick={{ fill: '#C5C6C7', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="country"
                      stroke="#C5C6C7" 
                      tick={{ fill: '#C5C6C7', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1F2833',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" name="Clients" fill="#66FCF1" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {(!analytics.country_distribution || analytics.country_distribution.length === 0) && (
                <p className="text-center text-[#C5C6C7] py-8">No geographic data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
