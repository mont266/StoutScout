import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const useExchangeRates = () => {
    const [rates, setRates] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRates = async () => {
            // 1. Check local storage for cached rates
            try {
                const cachedData = localStorage.getItem('stoutly-exchange-rates');
                if (cachedData) {
                    const { timestamp, rates: cachedRates } = JSON.parse(cachedData);
                    // Use cache if it's less than 24 hours old
                    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                        setRates(cachedRates);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.error("Failed to read cached exchange rates", e);
            }

            // 2. Fetch from proxy if no valid cache
            try {
                const { data: responseData, error: proxyError } = await supabase.functions.invoke('get-exchange-rates');
                
                if (proxyError) {
                   throw new Error(proxyError.message || 'Error fetching exchange rates');
                }

                if (responseData && responseData.result === 'success' && responseData.conversion_rates) {
                    const fetchedRates = responseData.conversion_rates;
                    setRates(fetchedRates);
                    localStorage.setItem('stoutly-exchange-rates', JSON.stringify({ timestamp: Date.now(), rates: fetchedRates }));
                } else {
                    throw new Error(responseData?.['error-type'] || 'Invalid API response structure');
                }
            } catch (fetchError) {
                console.error("Failed to fetch live exchange rates:", fetchError.message);
                setError(fetchError.message);
                setRates(null); // On error, ensure we use fallbacks where needed
            } finally {
                setIsLoading(false);
            }
        };

        fetchRates();
    }, []);

    return { rates, isLoading, error };
};

export default useExchangeRates;
