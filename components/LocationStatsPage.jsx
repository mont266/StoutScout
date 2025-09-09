import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase.js';
import { formatCurrency, getCurrencyInfo } from '../utils.js';
import Icon from './Icon.jsx';
import StarRating from './StarRating.jsx';

const StatCard = ({ label, value, icon, format = v => v }) => (
    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg text-center backdrop-blur-sm">
        <i className={`fas ${icon} text-2xl text-amber-500 mb-2`}></i>
        <p className="text-2xl font-bold">{format(value)}</p>
        <p className="text-xs uppercase text-gray-600 dark:text-gray-400">{label}</p>
    </div>
);

const PubListItem = ({ rank, name, town, score, ratingCount, avgQuality }) => (
    <li className="flex items-center justify-between text-sm py-2 border-b border-black/10 dark:border-white/10 last:border-b-0">
        <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold w-5 text-center flex-shrink-0">{rank}.</span>
            <div className="min-w-0">
                <p className="truncate font-semibold">{name}</p>
                {town && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{town}</p>}
                <div className="mt-1">
                    <StarRating rating={avgQuality} />
                </div>
            </div>
        </div>
        <div className="text-right flex-shrink-0">
            <p className="font-bold text-base">{score} <span className="text-xs font-normal text-gray-500">Score</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</p>
        </div>
    </li>
);

const LocationSelector = ({ activeLocation, onLocationChange }) => {
    const locations = [
        { id: 'ni', label: 'Northern Ireland' },
        { id: 'dublin', label: 'Dublin' },
        { id: 'london', label: 'London' },
    ];
    return (
        <div className="flex-grow bg-gray-200 dark:bg-gray-700/50 rounded-full p-1 flex items-center space-x-1">
            {locations.map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => onLocationChange(id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex-grow text-center ${
                        activeLocation === id 
                            ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

const ThemeSelector = ({ activeTheme, onThemeChange }) => {
    const themes = [
        { id: 'light', label: 'Light', icon: 'fa-sun' },
        { id: 'dark', label: 'Dark', icon: 'fa-moon' },
    ];
    return (
        <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-700/50 rounded-full p-1 flex items-center space-x-1 w-auto">
            {themes.map(({ id, icon }) => (
                <button
                    key={id}
                    onClick={() => onThemeChange(id)}
                    aria-label={`Switch to ${id} theme`}
                    title={`Switch to ${id} theme`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex-grow text-center flex items-center justify-center gap-2 ${
                        activeTheme === id 
                            ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                    }`}
                >
                    <i className={`fas ${icon}`}></i>
                </button>
            ))}
        </div>
    );
};


const LocationStatsPage = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState('ni'); // 'ni', 'dublin', 'london', 'custom', 'none'
    const [customLocationInput, setCustomLocationInput] = useState('');
    const [activeCustomLocation, setActiveCustomLocation] = useState('');
    const [reportTheme, setReportTheme] = useState('dark');

    const handleLocationChange = (newLocation) => {
        setLocation(newLocation);
        setActiveCustomLocation('');
        setCustomLocationInput('');
    };

    const handleCustomSearch = (e) => {
        e.preventDefault();
        if (!customLocationInput.trim()) return;
        setLocation('custom');
        setActiveCustomLocation(customLocationInput.trim());
    };

    const extractTownFromAddress = (address, locationKey) => {
        if (!address) return null;
        const parts = address.split(',').map(p => p.trim());
        let town = null;
    
        if (locationKey === 'ni') {
             if (parts.length > 1) {
                let potentialTown = parts[1];
                potentialTown = potentialTown.replace(/\b(BT\d{1,2}\s?\d[A-Z]{2})\b/gi, '').trim();
                town = potentialTown;
            } else if (parts.length === 1) {
                const addressLine = parts[0];
                const match = addressLine.match(/,\s*([^,]+?)\s+BT\d/i);
                if (match && match[1]) {
                    town = match[1];
                }
            }
            if (town && town.toLowerCase() === 'londonderry') return 'Derry/Londonderry';
            return town;
        }

        if (parts.length > 2) return parts[parts.length - 2];
        if (parts.length > 1) return parts[0];
        return address.split(' ')[0];
    };


    const fetchLocationStats = useCallback(async () => {
        if (location === 'none') {
            setStats(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('pubs')
                .select('id, country_code')
                .eq('is_closed', false);

            switch(location) {
                case 'ni':
                    query = query.or('address.ilike.%BT%,address.ilike.%Northern Ireland%');
                    break;
                case 'dublin':
                    query = query.ilike('address', '%Dublin%').eq('country_code', 'ie');
                    break;
                case 'london':
                    query = query.ilike('address', '%London%').not('address', 'ilike', '%Londonderry%').eq('country_code', 'gb');
                    break;
                case 'custom':
                    if (activeCustomLocation) {
                        query = query.ilike('address', `%${activeCustomLocation}%`);
                    } else {
                        setStats(null); setLoading(false); return;
                    }
                    break;
                default:
                    setStats(null); setLoading(false); return;
            }

            const { data: pubs, error: pubsError } = await query;
            if (pubsError) throw pubsError;

            if (!pubs || pubs.length === 0) {
                setStats({ total_ratings: 0, average_price: 0, average_quality: 0, top_pubs: [], worst_pubs: [], pint_images: [], currencyCodeForReport: 'GBP' });
                setLoading(false);
                return;
            }
            const pubIds = pubs.map(p => p.id);

            const { data: ratings, error: ratingsError } = await supabase.from('ratings').select('pub_id, quality, exact_price, image_url').in('pub_id', pubIds);
            if (ratingsError) throw ratingsError;

            const { data: scoresOnly, error: scoresError } = await supabase
                .from('pub_scores')
                .select('pub_id, pub_score')
                .in('pub_id', pubIds)
                .not('pub_score', 'is', null);
            if (scoresError) throw scoresError;

            const { data: pubDetails, error: pubDetailsError } = await supabase
                .from('pubs')
                .select('id, name, address')
                .in('id', pubIds);
            if (pubDetailsError) throw pubDetailsError;
            
            const pubDetailsMap = new Map(pubDetails.map(p => [p.id, { name: p.name, address: p.address }]));
            const scoresData = scoresOnly.map(score => ({
                ...score,
                pubs: pubDetailsMap.get(score.pub_id)
            })).filter(s => s.pubs);
            
            const pubStatsMap = new Map();
            ratings.forEach(r => {
                if (!pubStatsMap.has(r.pub_id)) pubStatsMap.set(r.pub_id, { qualitySum: 0, ratingCount: 0 });
                const stats = pubStatsMap.get(r.pub_id);
                stats.qualitySum += r.quality;
                stats.ratingCount++;
            });

            pubStatsMap.forEach((stats, pubId) => {
                stats.avgQuality = stats.ratingCount > 0 ? stats.qualitySum / stats.ratingCount : 0;
            });

            const total_ratings = ratings.length;
            const pricedRatings = ratings.filter(r => r.exact_price != null && r.exact_price > 0);
            const average_price = pricedRatings.length > 0 ? pricedRatings.reduce((acc, r) => acc + r.exact_price, 0) / pricedRatings.length : 0;
            const average_quality = ratings.length > 0 ? ratings.reduce((acc, r) => acc + r.quality, 0) / ratings.length : 0;
            
            let currencyCodeForReport = 'GBP';
            if (location === 'dublin') currencyCodeForReport = 'EUR';
            else if (location === 'custom' && pubs.length > 0) {
                const countryCodeCounts = pubs.reduce((acc, pub) => {
                    if (pub.country_code) acc[pub.country_code] = (acc[pub.country_code] || 0) + 1;
                    return acc;
                }, {});
                if (Object.keys(countryCodeCounts).length > 0) {
                    const mostCommonCode = Object.entries(countryCodeCounts).sort((a, b) => b[1] - a[1])[0][0];
                    currencyCodeForReport = getCurrencyInfo({ country_code: mostCommonCode }).code;
                }
            }

            const scores = scoresData.sort((a, b) => b.pub_score - a.pub_score);
            const top_pubs = scores.slice(0, 5).map(s => ({ 
                id: s.pub_id, name: s.pubs.name, town: extractTownFromAddress(s.pubs.address, location), 
                score: s.pub_score, ratingCount: pubStatsMap.get(s.pub_id)?.ratingCount || 0, avgQuality: pubStatsMap.get(s.pub_id)?.avgQuality || 0 
            }));
            const worst_pubs = scores.slice(-5).reverse().map(s => ({ 
                id: s.pub_id, name: s.pubs.name, town: extractTownFromAddress(s.pubs.address, location), 
                score: s.pub_score, ratingCount: pubStatsMap.get(s.pub_id)?.ratingCount || 0, avgQuality: pubStatsMap.get(s.pub_id)?.avgQuality || 0 
            }));
            
            const featuredPubIds = new Set([...top_pubs.map(p => p.id), ...worst_pubs.map(p => p.id)]);
            const pint_images = ratings
                .filter(r => r.image_url && featuredPubIds.has(r.pub_id))
                .map(r => ({ url: r.image_url, pubName: pubDetailsMap.get(r.pub_id)?.name || 'Unknown' }))
                .sort(() => 0.5 - Math.random()).slice(0, 3);
            
            setStats({ total_ratings, average_price, average_quality, top_pubs, worst_pubs, pint_images, currencyCodeForReport });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [location, activeCustomLocation]);

    useEffect(() => {
        fetchLocationStats();
    }, [fetchLocationStats]);
    
    const currentConfig = useMemo(() => {
        const presetConfigs = {
            'ni': { name: 'Northern Ireland', imageLabel: 'Pints of NI' },
            'dublin': { name: 'Dublin', imageLabel: 'Pints of Dublin' },
            'london': { name: 'London', imageLabel: 'Pints of London' },
        };
        if (location === 'custom') {
            return {
                name: activeCustomLocation,
                imageLabel: `Pints of ${activeCustomLocation}`
            };
        }
        return presetConfigs[location] || { name: 'Select Location', imageLabel: 'Pints' };
    }, [location, activeCustomLocation]);

    const renderCard = () => {
        if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>;
        if (error) return <div className="text-red-500 p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</div>;
        if (!stats || stats.total_ratings === 0) return <div className="text-gray-500">No data available for {currentConfig.name} yet.</div>;

        return (
            <div className={`bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 dark:from-black dark:via-gray-900 dark:to-amber-900 text-gray-900 dark:text-white rounded-2xl shadow-2xl p-6 border-4 border-white dark:border-gray-700 w-full max-w-lg mx-auto ${reportTheme}`}>
                <div className="flex justify-between items-center">
                    <Icon className="w-16 h-16" />
                    <div className="text-right">
                        <h2 className="text-2xl font-extrabold">The Pint-Sized Report</h2>
                        <p className="font-semibold text-amber-600 dark:text-amber-400">{currentConfig.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">As of {new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 my-6">
                    <StatCard label="Total Ratings" value={stats.total_ratings.toLocaleString()} icon="fa-users" />
                    <StatCard label="Avg. Quality" value={stats.average_quality.toFixed(2)} icon="fa-beer" />
                    <StatCard label="Avg. Price" value={formatCurrency(stats.average_price, stats.currencyCodeForReport)} icon="fa-tag" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
                        <h3 className="font-bold text-center text-green-600 dark:text-green-400 mb-2">The Cream of the Crop</h3>
                        <ul>{stats.top_pubs.map((p, i) => <PubListItem key={i} rank={i + 1} name={p.name} town={p.town} score={p.score} ratingCount={p.ratingCount} avgQuality={p.avgQuality} />)}</ul>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
                        <div className="text-center mb-2">
                            <h3 className="font-bold text-red-600 dark:text-red-400">Room for Improvement</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">(or needs more ratings)</p>
                        </div>
                        <ul>{stats.worst_pubs.map((p, i) => <PubListItem key={i} rank={i + 1} name={p.name} town={p.town} score={p.score} ratingCount={p.ratingCount} avgQuality={p.avgQuality} />)}</ul>
                    </div>
                </div>
                
                {stats.pint_images.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-bold text-center text-gray-700 dark:text-gray-300 mb-2">{currentConfig.imageLabel}</h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {stats.pint_images.map((image, i) => (
                                <div key={i}>
                                    <img src={image.url} alt={`Pint from ${image.pubName}`} className="w-full aspect-square object-cover rounded-md border-2 border-white/50 dark:border-black/50" />
                                    <p className="text-xs mt-1 font-semibold truncate" title={image.pubName}>{image.pubName}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <p className="text-center font-extrabold text-2xl text-amber-500 dark:text-amber-400 mt-6 tracking-wider">Stoutly.co.uk</p>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 -ml-2 rounded-lg transition-colors">
                            <i className="fas fa-arrow-left"></i>
                            <span className="font-semibold hidden sm:inline">Back to Hub</span>
                        </button>
                    </div>
                    <h3 className="text-xl font-bold text-blue-500 dark:text-blue-400">Location Graphics</h3>
                    <button onClick={() => fetchLocationStats(location, activeCustomLocation)} disabled={loading} className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
                        <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col items-center">
                <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 mb-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <LocationSelector activeLocation={location} onLocationChange={handleLocationChange} />
                        <form onSubmit={handleCustomSearch} className="flex gap-2 flex-grow sm:flex-grow-0">
                            <input
                                type="text"
                                value={customLocationInput}
                                onChange={(e) => setCustomLocationInput(e.target.value)}
                                onFocus={() => setLocation('none')}
                                placeholder="e.g., Galway, New York"
                                className="w-full flex-grow bg-white dark:bg-gray-800 text-sm px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                            <button type="submit" disabled={!customLocationInput.trim() || loading} className="bg-amber-500 text-black font-bold px-5 py-1.5 rounded-full hover:bg-amber-400 disabled:opacity-50">
                                Go
                            </button>
                        </form>
                    </div>
                    <div className="flex justify-center">
                         <ThemeSelector activeTheme={reportTheme} onThemeChange={setReportTheme} />
                    </div>
                </div>
                {renderCard()}
            </main>
        </div>
    );
};

export default LocationStatsPage;