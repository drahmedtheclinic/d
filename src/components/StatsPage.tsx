import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchClinicStatistics,
  ClinicStatistics,
} from '../lib/statsService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Users,
  UserPlus,
  History,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Activity,
} from 'lucide-react';

interface StatsPageProps {
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({ onBack, showToast }) => {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<ClinicStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchClinicStatistics();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load clinic statistics:', err);
      showToast(t('تعذر تحميل إحصائيات العيادة'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Custom Arabic Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900/95 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-stone-700">
          <p className="font-bold text-stone-200 border-b border-stone-700 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{t(entry.name)}:</span>
              </span>
              <span className="font-bold font-mono">{entry.value} {t('حالة')}</span>
            </div>
          ))}
          <div className="pt-1 border-t border-stone-700 flex justify-between font-bold text-teal-300">
            <span>{t("الإجمالي:")}</span>
            <span className="font-mono">
              {payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0)} {t('حالة')}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Arabic Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-stone-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs border border-stone-700">
          <p className="font-bold" style={{ color: data.payload.color }}>
            {t(data.name)}
          </p>
          <p className="text-stone-300 mt-0.5">
            {t("العدد:")} <span className="font-bold font-mono text-white">{data.value}</span> (
            <span className="font-bold">{data.payload.percentage || Math.round((data.value / (stats?.totalPatients || 1)) * 100)}%</span>)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-stone-500">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 className="font-bold text-stone-800 text-base">{t("جاري تجميع إحصائيات وسجلات العيادة...")}</h3>
        <p className="text-xs text-stone-400 mt-1">{t("يتم استخراج أعداد المرضى والمراجعات والنسب البيانية")}</p>
      </div>
    );
  }

  const rawTrendData = timeframe === 'daily' ? stats?.dailyData : stats?.weeklyData;
  const trendData = rawTrendData?.map((point) => ({
    ...point,
    label: language === 'en' ? point.label.replace(/^[^ ]+/, (day) => t(day)) : point.label,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>{t("رجوع للسجلات")}</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-700 text-white rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                {t("إحصائيات العيادة")}
              </h2>
            </div>
          </div>
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors border border-stone-300 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>{t("تحديث الإحصائيات")}</span>
        </button>
      </div>

      {/* METRIC CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Patients */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">{t("إجمالي سجلات المرضى")}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900">
              {stats?.totalPatients || 0}
            </span>
            <span className="text-[11px] text-teal-700 font-bold block mt-0.5">{t("ملفات نشطة")}</span>
          </div>
        </div>

        {/* New Cases */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">{t("حالات جديدة (أول كشف)")}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900">
              {stats?.totalNewCases || 0}
            </span>
            <span className="text-[11px] text-sky-700 font-bold block mt-0.5">
              {stats?.caseClassification[0]?.percentage || 0}% {t('من الإقبال')}
            </span>
          </div>
        </div>

        {/* Follow-up Reviews */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">{t("مراجعات واستشارات")}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900">
              {stats?.totalFollowups || 0}
            </span>
            <span className="text-[11px] text-amber-700 font-bold block mt-0.5">
              {stats?.caseClassification[1]?.percentage || 0}% {t('من الإقبال')}
            </span>
          </div>
        </div>

        {/* Current Waiting Queue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">{t("في الانتظار حالياً")}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-stone-900">
              {stats?.waitingCount || 0}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              {language === 'en' ? `Examined ${stats?.seenCount || 0} cases` : `تم فحص ${stats?.seenCount || 0} حالة`}
            </span>
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: Daily or Weekly Patient Registrations (2 Cols) */}
        <div className="lg:col-span-2 min-w-0 bg-white p-3 sm:p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-700" />
                  <span>
                    {t('معدل تسجيل المرضى')} ({timeframe === 'daily' ? t('يومياً خلال الأسبوع') : t('أسبوعياً خلال الشهر')})
                  </span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t("توزيع عدد المرضى بين الحالات الجديدة والمراجعات الدورية")}
                </p>
              </div>

              {/* Timeframe switch */}
              <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
                <button
                  onClick={() => setTimeframe('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    timeframe === 'daily'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t("عرض يومي")}
                </button>
                <button
                  onClick={() => setTimeframe('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    timeframe === 'weekly'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t("عرض أسبوعي")}
                </button>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-72 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    formatter={(val) => (
                      <span className="text-stone-700 font-semibold px-1">{val}</span>
                    )}
                  />
                  <Bar
                    dataKey="newPatients"
                    name={t('حالات جديدة')}
                    fill="#0d9488"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="followups"
                    name={t('مراجعات واستشارات')}
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 mt-2 flex flex-wrap gap-2 items-center justify-between text-xs text-stone-500">
            <span>{t("اللون الأخضر: حالات كشف جديدة")}</span>
            <span>{t("اللون البرتقالي: مراجعات ومتابعات")}</span>
          </div>
        </div>

        {/* CHART 2: Case Classification (New Cases vs Reviews/Followups) */}
        <div className="min-w-0 bg-white p-3 sm:p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-amber-600" />
                  <span>{t("تصنيف الحالات")}</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t("مراجعات مقابل حالات جديدة")}
                </p>
              </div>

              {/* Chart Style Toggle: Pie vs Bar */}
              <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
                <button
                  onClick={() => setChartType('pie')}
                  title={t("مخطط دائري")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    chartType === 'pie'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <PieChartIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  title={t("مخطط عمودي")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recharts Pie or Bar Chart */}
            <div className="h-60 w-full flex items-center justify-center" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={stats?.caseClassification}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {stats?.caseClassification.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                ) : (
                  <BarChart
                    data={stats?.caseClassification}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomPieTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {stats?.caseClassification.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Legend & Breakdown Cards */}
            <div className="space-y-2 mt-2">
              {stats?.caseClassification.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-stone-800">{t(item.name)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-stone-900">{item.count} {t('حالة')}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-stone-300 font-bold text-[11px] text-stone-600">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Clinic Workflow Stage Breakdown */}
      <div className="min-w-0 bg-white p-3 sm:p-6 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="font-bold text-stone-900 text-base mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-700" />
          <span>{t("مراحل الكشف")}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-600 block">{t("تم الكشف")}</span>
                <span className="text-lg font-black text-stone-900 font-mono">
                  {stats?.seenCount || 0}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg">
              {t("منتهي")}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-600 text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-600 block">{t("في الانتظار")}</span>
                <span className="text-lg font-black text-stone-900 font-mono">
                  {stats?.waitingCount || 0}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg">
              {t("انتظار")}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-stone-700 text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-600 block">{t("ملفات مسجلة")}</span>
                <span className="text-lg font-black text-stone-900 font-mono">
                  {stats?.withSecretaryCount || 0}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-stone-700 bg-stone-200 px-2 py-1 rounded-lg">
              {t("مسجل")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
