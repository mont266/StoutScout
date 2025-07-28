import React from 'react';

const TimeSeriesChart = ({ data, dataKey, title, loading, error, timePeriod, lineColor = '#F59E0B', tooltipLabel = 'items' }) => {
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
        return <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-md h-96">No data available for the chart.</div>;
    }

    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxY = Math.ceil(Math.max(...data.map(d => d[dataKey]), 1) * 1.15); // Add 15% headroom
    
    const xScale = (index) => {
        // Handle the edge case of a single data point to avoid division by zero.
        if (data.length <= 1) return chartWidth / 2;
        return (index / (data.length - 1)) * chartWidth;
    };
    const yScale = (value) => chartHeight - (value / maxY) * chartHeight;

    const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(d[dataKey])}`).join(' ');
    const areaPathData = `${pathData} L ${xScale(data.length - 1)},${chartHeight} L ${xScale(0)},${chartHeight} Z`;

    const formatDate = (dateStr) => {
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
    
    const labelInterval = Math.max(1, Math.floor(data.length / 8));

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md h-96">
            <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h5>
            <div className="w-full h-full pb-8 pr-4">
                 <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                    <defs>
                        <linearGradient id={`area-gradient-${dataKey}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <g transform={`translate(${padding.left}, ${padding.top})`}>
                        {/* Y Axis Grid Lines & Labels */}
                        {[...Array(5)].map((_, i) => {
                            const y = (i / 4) * chartHeight;
                            const value = Math.round(maxY * (1 - i / 4));
                            return (
                                <g key={i}>
                                    <line x1="0" x2={chartWidth} y1={y} y2={y} className="stroke-current text-gray-200 dark:text-gray-700" strokeDasharray="2,2" />
                                    <text x="-10" y={y + 3} className="text-xs fill-current text-gray-500 dark:text-gray-400" textAnchor="end">{value}</text>
                                </g>
                            );
                        })}

                        {/* X Axis Labels */}
                        {data.map((d, i) => (
                            (i % labelInterval === 0 || i === data.length - 1) && (
                                <text key={d.time_bucket} x={xScale(i)} y={chartHeight + 20} className="text-xs fill-current text-gray-500 dark:text-gray-400" textAnchor="middle">
                                    {formatDate(d.time_bucket)}
                                </text>
                            )
                        ))}

                        <path d={areaPathData} fill={`url(#area-gradient-${dataKey})`} />
                        <path d={pathData} stroke={lineColor} strokeWidth="2" fill="none" />
                        
                        {/* Interactive Points with Tooltips */}
                        {data.map((d, i) => (
                            <g key={`point-${d.time_bucket}`} className="group">
                                <circle cx={xScale(i)} cy={yScale(d[dataKey])} r="10" className="fill-transparent" />
                                <circle cx={xScale(i)} cy={yScale(d[dataKey])} r="6" style={{fill: lineColor}} className="fill-opacity-30 opacity-0 group-hover:opacity-100 group-hover:animate-pulse-halo origin-center" />
                                <circle cx={xScale(i)} cy={yScale(d[dataKey])} r="3" style={{fill: lineColor}} className="stroke-white dark:stroke-gray-800" strokeWidth="2" />
                                <g className="opacity-0 group-hover:opacity-100 transition-all pointer-events-none" transform={`translate(${xScale(i)}, ${yScale(d[dataKey])})`}>
                                    {/* Tooltip positioned ABOVE the point */}
                                    <g transform="translate(0, -10)">
                                        <rect x="-40" y="-28" width="80" height="24" rx="4" className="fill-gray-900/80" />
                                        <text x="0" y="-12" className="text-xs fill-white font-semibold" textAnchor="middle">{`${d[dataKey]} ${tooltipLabel}`}</text>
                                        <path d="M 0 -4 L 6 0 L -6 0 Z" className="fill-gray-900/80" />
                                    </g>
                                </g>
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default TimeSeriesChart;