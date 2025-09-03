import React, { useState, useMemo, useRef } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../supabase.js';
import { getCurrencyInfo } from '../utils.js';
import { trackEvent } from '../analytics.js';

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4',
            },
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
        },
    },
};

const DonationForm = ({ userProfile, setAlertInfo, onSuccess, userTrophies, allTrophies }) => {
    const stripe = useStripe();
    const elements = useElements();
    
    const [amount, setAmount] = useState(300); // Default to 3.00 in smallest currency unit
    const [customAmount, setCustomAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [succeeded, setSucceeded] = useState(false);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const hasTrackedCustomInput = useRef(false);

    const currencyInfo = getCurrencyInfo(userProfile) || { symbol: '£', code: 'GBP' };
    const presetAmounts = currencyInfo.code === 'EUR' ? [100, 300, 500] : [100, 300, 500];

    const handleAmountChange = (newAmount) => {
        if (!showPaymentDetails) {
            trackEvent('engage_donation_form', { engagement_type: 'payment_details_shown' });
        }
        setAmount(newAmount);
        setCustomAmount(''); // Clear custom input when a preset is selected
        setShowPaymentDetails(true);
        trackEvent('select_content', {
            content_type: 'donation_amount',
            item_id: `preset_${newAmount}`,
            value: newAmount / 100,
            currency: currencyInfo.code,
        });
    };

    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        setCustomAmount(value);
        if (value && !isNaN(value)) {
            if (!showPaymentDetails) {
                trackEvent('engage_donation_form', { engagement_type: 'payment_details_shown' });
            }
            if (!hasTrackedCustomInput.current) {
                trackEvent('engage_donation_form', { engagement_type: 'custom_amount_input' });
                hasTrackedCustomInput.current = true;
            }
            setAmount(Math.round(parseFloat(value) * 100)); // Convert to smallest currency unit
            setShowPaymentDetails(true);
        } else if (!value) {
            // Keep payment details visible even if custom amount is cleared,
            // as a preset might still be logically active.
            // The submit button's disabled state will handle invalid amounts.
        }
    };
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements || isLoading || succeeded) {
            return;
        }

        setIsLoading(true);
        setError(null);
        trackEvent('begin_checkout', { value: amount / 100, currency: currencyInfo.code });

        try {
            // Manually get the session to ensure the Authorization header is set.
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('You must be signed in to make a donation.');
            }

            const functionOptions = {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            };

            // 1. Create a Payment Intent on the server
            const { data, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
                ...functionOptions,
                body: {
                    amount,
                    currency: currencyInfo.code.toLowerCase(),
                    userId: userProfile.id
                },
            });

            if (intentError) throw new Error(intentError.message);
            const clientSecret = data.clientSecret;

            // 2. Confirm the payment on the client
            const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: userProfile.username,
                    },
                },
            });
            
            if (paymentError) {
                // Check for specific decline codes if needed
                if (paymentError.code === 'card_declined') {
                     throw new Error(`Your card was declined. Reason: ${paymentError.decline_code}`);
                }
                throw new Error(paymentError.message);
            }

            // 3. Verify on the server and award the trophy
            const { error: verifyError } = await supabase.functions.invoke('verify-donation-and-award-trophy', {
                ...functionOptions,
                body: { 
                    paymentIntentId: paymentIntent.id
                }
            });

            if (verifyError) throw new Error(verifyError.message);

            // 4. Success!
            setSucceeded(true);
            trackEvent('purchase', { transaction_id: paymentIntent.id, value: amount / 100, currency: currencyInfo.code });
            
            const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';
            const alreadyHasPatronTrophy = userTrophies && userTrophies.some(t => t.trophy_id === PATRON_TROPHY_ID);
            
            onSuccess(); // Trigger confetti and data refresh

            if (alreadyHasPatronTrophy) {
                setAlertInfo({
                    isOpen: true,
                    title: 'Thank You!',
                    message: "Your continued support means the world. Thank you for your donation and for helping us keep Stoutly running and ad-free. Cheers!",
                    theme: 'success',
                });
            } else {
                setAlertInfo({
                    isOpen: true,
                    title: 'Trophy Unlocked!',
                    message: "You've unlocked the 'Stoutly Patron' trophy! Thank you so much for your donation and for supporting the development of Stoutly.",
                    theme: 'success',
                    customIcon: 'fa-hand-holding-heart',
                });
            }

        } catch (err) {
            setError(err.message);
            trackEvent('checkout_failed', { error_message: err.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const formattedPresetAmounts = useMemo(() => {
        return presetAmounts.map(p => ({
            value: p,
            label: `${currencyInfo.symbol}${(p / 100).toFixed(2)}`
        }));
    }, [presetAmounts, currencyInfo.symbol]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Choose an amount
                </label>
                <div className="flex gap-2">
                    {formattedPresetAmounts.map(p => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => handleAmountChange(p.value)}
                            className={`w-1/3 py-2 text-sm rounded-lg font-bold transition-all ${
                                amount === p.value && !customAmount
                                    ? 'bg-amber-500 text-black ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-amber-500'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                 <div className="relative mt-3">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">
                        {currencyInfo.symbol}
                    </span>
                    <input
                        type="number"
                        step="0.01"
                        min="1.00"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="Or enter a custom amount"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            {showPaymentDetails && (
                <div className="space-y-4 animate-fade-in-down pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Payment Details
                        </label>
                        <div className="p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md">
                            <CardElement options={CARD_ELEMENT_OPTIONS} />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm text-center p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
                            <i className="fas fa-exclamation-circle mr-2"></i>{error}
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={!stripe || isLoading || succeeded || amount < 100}
                        className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading 
                            ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                            : succeeded
                                ? <><i className="fas fa-check-circle mr-2"></i>Success!</>
                                : `Donate ${(amount / 100).toFixed(2)} ${currencyInfo.code}`
                        }
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-lock mr-1"></i>Secure payment powered by Stripe.
                    </p>
                </div>
            )}
        </form>
    );
};

export default DonationForm;
