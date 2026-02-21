import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Users,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  TrendingUp,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp, color = 'cyan' }) => (
  <Card className="bg-[#1F2833] border-white/5 card-hover">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          {subtitle && <p className="text-xs text-[#C5C6C7] mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1F2833]/95 backdrop-blur-md border border-white/10 rounded-sm p-3">
        <p className="text-xs text-[#C5C6C7] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState({ recent_transactions: [], recent_clients: [] });
  const [kycData, setKycData] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes, activityRes, analyticsRes] = await Promise.all([
          fetch(`${API_URL}/api/reports/dashboard`, { headers: getAuthHeaders(), credentials: 'include' }),
          fetch(`${API_URL}/api/reports/transactions-summary?days=30`, { headers: getAuthHeaders(), credentials: 'include' }),
          fetch(`${API_URL}/api/reports/recent-activity?limit=5`, { headers: getAuthHeaders(), credentials: 'include' }),
          fetch(`${API_URL}/api/reports/client-analytics`, { headers: getAuthHeaders(), credentials: 'include' }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (chartRes.ok) setChartData(await chartRes.json());
        if (activityRes.ok) setRecentActivity(await activityRes.json());
        if (analyticsRes.ok) {
          const analytics = await analyticsRes.json();
          setKycData(analytics.kyc_distribution || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'status-approved',
      approved: 'status-approved',
      pending: 'status-pending',
      cancelled: 'status-rejected',
      rejected: 'status-rejected',
      failed: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const COLORS = ['#66FCF1', '#00C853', '#FFD600', '#FF3B30'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
          Dashboard
        </h1>
        <p className="text-[#C5C6C7]">Overview of your FX brokerage operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats?.clients?.total || 0}
          subtitle={`${stats?.clients?.approved || 0} approved`}
          icon={Users}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Treasury Balance"
          value={`$${(stats?.treasury?.total_balance || 0).toLocaleString()}`}
          subtitle={`${stats?.treasury?.active || 0} active accounts`}
          icon={Landmark}
          color="green"
        />
        <StatCard
          title="Total Deposits"
          value={`$${(stats?.transactions?.total_deposits || 0).toLocaleString()}`}
          subtitle="Approved transactions"
          icon={DollarSign}
          trend="+8.5%"
          trendUp
          color="cyan"
        />
        <StatCard
          title="Pending Actions"
          value={stats?.transactions?.pending || 0}
          subtitle={`${stats?.clients?.pending || 0} KYC pending`}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transaction Chart */}
        <Card className="bg-[#1F2833] border-white/5 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#66FCF1]" />
              Transaction Volume (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#66FCF1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#66FCF1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="withdrawalGradient" x1="0" y1="0" x2="0" y2="1">
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
                    stroke="#66FCF1"
                    fillOpacity={1}
                    fill="url(#depositGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke="#FF3B30"
                    fillOpacity={1}
                    fill="url(#withdrawalGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KYC Distribution */}
        <Card className="bg-[#1F2833] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#66FCF1]" />
              KYC Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kycData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {kycData.map((entry, index) => (
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
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {kycData.map((item, index) => (
                <div key={item.status} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-[#C5C6C7] capitalize">{item.status}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card className="bg-[#1F2833] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-white">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {recentActivity.recent_transactions?.map((tx) => (
                  <div
                    key={tx.transaction_id}
                    className="flex items-center justify-between p-3 bg-[#0B0C10] rounded-sm border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-sm ${tx.transaction_type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {tx.transaction_type === 'deposit' ? (
                          <ArrowDownRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white font-mono">{tx.reference}</p>
                        <p className="text-xs text-[#C5C6C7]">{tx.client_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.transaction_type === 'deposit' ? '+' : '-'}${tx.amount?.toLocaleString()}
                      </p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                ))}
                {(!recentActivity.recent_transactions || recentActivity.recent_transactions.length === 0) && (
                  <p className="text-center text-[#C5C6C7] py-8">No recent transactions</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="bg-[#1F2833] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-white">Recent Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {recentActivity.recent_clients?.map((client) => (
                  <div
                    key={client.client_id}
                    className="flex items-center justify-between p-3 bg-[#0B0C10] rounded-sm border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#66FCF1]/10 rounded-full flex items-center justify-center">
                        <span className="text-[#66FCF1] font-bold">
                          {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white">{client.first_name} {client.last_name}</p>
                        <p className="text-xs text-[#C5C6C7]">{client.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(client.kyc_status)}
                  </div>
                ))}
                {(!recentActivity.recent_clients || recentActivity.recent_clients.length === 0) && (
                  <p className="text-center text-[#C5C6C7] py-8">No recent clients</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
