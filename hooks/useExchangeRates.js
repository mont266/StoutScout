import { useState, useEffect } from 'react';

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

            // 2. Fetch from API if no valid cache
            try {
                const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
                if (!apiKey) {
                    throw new Error("ExchangeRate-API key is not configured.");
                }
                const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/GBP`);
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                const data = await response.json();
                if (data.result === 'success' && data.conversion_rates) {
                    const fetchedRates = data.conversion_rates;
                    setRates(fetchedRates);
                    localStorage.setItem('stoutly-exchange-rates', JSON.stringify({ timestamp: Date.now(), rates: fetchedRates }));
                } else {
                    throw new Error(data['error-type'] || 'Invalid API response structure');
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
