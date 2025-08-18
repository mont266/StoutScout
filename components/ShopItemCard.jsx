import React from 'react';
import { formatCurrency } from '../utils.js';
import { trackEvent } from '../analytics.js';

const ShopItemCard = ({ item, userProfile }) => {
    const handleClick = () => {
        trackEvent('click_shop_item', { item_name: item.name, item_id: item.id });
    };

    const isDeveloper = userProfile?.is_developer;
    const commissionAmount = item.price && item.commission_rate ? item.price * item.commission_rate : 0;

    return (
        <a
            href={item.affiliate_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleClick}
            className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105"
            aria-label={`View ${item.name} on Amazon`}
        >
            {isDeveloper && item.commission_rate > 0 && (
                <div className="absolute top-2 left-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm z-10">
                    <span>COMM: {formatCurrency(commissionAmount, item.currency_code)}</span>
                </div>
            )}
            <div className="aspect-square overflow-hidden">
                <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" 
                    loading="lazy"
                />
            </div>
            <div className="p-3 md:p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.name}</h3>
                {item.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex-grow">{item.description}</p>}
                <div className="mt-3 flex justify-between items-center">
                    <span className="text-base md:text-lg font-extrabold text-green-600 dark:text-green-400">
                        {formatCurrency(item.price, item.currency_code)}
                    </span>
                    <span className="bg-amber-500 text-black text-xs font-bold py-1 px-3 rounded-full group-hover:bg-amber-400 transition-colors">
                        View
                    </span>
                </div>
            </div>
        </a>
    );
};

export default ShopItemCard;