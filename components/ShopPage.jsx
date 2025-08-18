import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import ShopItemCard from './ShopItemCard.jsx';

const ShopPage = ({ userProfile }) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('guinness'); // 'guinness' or 'stoutly'

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            setError(null);
            trackEvent('view_shop', { category: activeTab });

            try {
                const { data, error: dbError } = await supabase
                    .from('shop_items')
                    .select('*')
                    .eq('is_active', true)
                    .eq('category', activeTab)
                    .order('sort_order', { ascending: true });

                if (dbError) throw dbError;

                setItems(data || []);
            } catch (err) {
                console.error("Error fetching shop items:", err);
                setError("Could not load shop items. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchItems();
    }, [activeTab]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 animate-pulse">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-square"></div>
                    ))}
                </div>
            );
        }
        if (error) {
            return <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg m-4">{error}</div>;
        }
        if (items.length === 0) {
            return <div className="text-center text-gray-500 p-8">No items available right now. Check back soon!</div>;
        }
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
                {items.map(item => <ShopItemCard key={item.id} item={item} userProfile={userProfile} />)}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                <div className="flex items-center space-x-3">
                     <i className="fas fa-shopping-bag text-2xl text-amber-500"></i>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stoutly Shop</h1>
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 rounded-r-lg">
                    <p className="font-semibold text-sm">Disclaimer:</p>
                    <p className="text-xs mt-1">
                        This shop features official Guinness merchandise from Amazon. As an Amazon Associate, Stoutly earns from qualifying purchases. Clicking these links is a great way to support the app and help us keep it free for everyone. Stoutly is an independent app and is not affiliated with, endorsed by, or sponsored by Guinness or Diageo.
                    </p>
                </div>
            </header>
            <div className="flex-grow overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default ShopPage;