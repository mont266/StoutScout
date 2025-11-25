import React, { createContext } from 'react';
import useExchangeRates from '../hooks/useExchangeRates.js';

export const ExchangeRatesContext = createContext({
    rates: null,
    isLoading: true,
    error: null,
});

export const ExchangeRatesProvider = ({ children }) => {
    const exchangeRatesData = useExchangeRates();

    return (
        <ExchangeRatesContext.Provider value={exchangeRatesData}>
            {children}
        </ExchangeRatesContext.Provider>
    );
};
