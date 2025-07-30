
import React from 'react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Area } from 'recharts';

const TimeSeriesChart = ({ data, dataKey, title, loading, error, timePeriod, lineColor = '#F59E0B', tooltipLabel = 'items' }) => {
    
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        switch (timePeriod) {
            case '1d':
                return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            case '6m':
            case '1y':
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            default:
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/80 text-white p-2 rounded-md shadow-lg text-sm border border-gray-700">
                    <p className="font-bold">{`${payload[0].value} ${tooltipLabel}`}</p>
                    <p className="text-xs text-gray-300">{formatDate(label)}</p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md h-96 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
            </div>
        );
    }
    if (error) {
        return <div className="text-center p-8 text-red-500 bg-white dark:bg-gray-800 rounded-xl shadow-md h-96">{error}</div>;
    }
    if (!data || data.length === 0) {
        return <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-md h-96">No data available for this period.</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md h-96">
            <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h5>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                    <defs>
                        <linearGradient id={`area-gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={lineColor} stopOpacity={0.6}/>
                            <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200 dark:text-gray-700" strokeOpacity={0.5} />
                    <XAxis
                        dataKey="time_bucket"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-gray-500 dark:text-gray-400"
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={20}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-gray-500 dark:text-gray-400"
                        axisLine={false}
                        tickLine={false}
                        width={35}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={lineColor}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#area-gradient-${dataKey})`}
                        dot={false}
                        activeDot={{ r: 6, stroke: 'currentColor', strokeWidth: 2, fill: lineColor, className: 'stroke-white dark:stroke-gray-800' }}
                        animationDuration={400}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TimeSeriesChart;