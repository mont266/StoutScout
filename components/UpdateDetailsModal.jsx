import React, { useState, useEffect, useMemo, useRef } from 'react';

const countries = [
    { code: 'GB', name: 'United Kingdom' }, { code: 'IE', name: 'Ireland' },
    { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
    { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' },
    { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' },
    { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' },
    { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' },
    { code: 'PT', name: 'Portugal' }, { code: 'PL', name: 'Poland' },
    { code: 'ZA', name: 'South Africa' }, { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' }, { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' }, { code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' }, { code: 'AW', name: 'Aruba' },
    { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
    { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' },
    { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Belarus' },
    { code: 'BZ', name: 'Belize' }, { code: 'BJ', name: 'Benin' },
    { code: 'BM', name: 'Bermuda' }, { code: 'BT', name: 'Bhutan' },
    { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
    { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' }, { code: 'KH', name: 'Cambodia' },
    { code: 'CM', name: 'Cameroon' }, { code: 'CV', name: 'Cape Verde' },
    { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
    { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' },
    { code: 'CG', name: 'Congo' }, { code: 'CR', name: 'Costa Rica' },
    { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
    { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech Republic' },
    { code: 'CI', name: 'Côte d\'Ivoire' }, { code: 'DJ', name: 'Djibouti' },
    { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
    { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
    { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' },
    { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
    { code: 'GE', name: 'Georgia' }, { code: 'GH', name: 'Ghana' },
    { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' },
    { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
    { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
    { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' },
    { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
    { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
    { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
    { code: 'IL', name: 'Israel' }, { code: 'JM', name: 'Jamaica' },
    { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KE', name: 'Kenya' }, { code: 'KW', name: 'Kuwait' },
    { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
    { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
    { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' },
    { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
    { code: 'MK', name: 'Macedonia' }, { code: 'MG', name: 'Madagascar' },
    { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' },
    { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' },
    { code: 'MT', name: 'Malta' }, { code: 'MR', name: 'Mauritania' },
    { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
    { code: 'MD', name: 'Moldova' }, { code: 'MC', name: 'Monaco' },
    { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
    { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' },
    { code: 'NP', name: 'Nepal' }, { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
    { code: 'KP', name: 'North Korea' }, { code: 'OM', name: 'Oman' },
    { code: 'PK', name: 'Pakistan' }, { code: 'PA', name: 'Panama' },
    { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' },
    { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
    { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
    { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'SM', name: 'San Marino' },
    { code: 'ST', name: 'Sao Tome and Principe' }, { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
    { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' },
    { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
    { code: 'SO', name: 'Somalia' }, { code: 'KR', name: 'South Korea' },
    { code: 'SS', name: 'South Sudan' }, { code: 'LK', name: 'Sri Lanka' },
    { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
    { code: 'SZ', name: 'Swaziland' }, { code: 'SY', name: 'Syria' },
    { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
    { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
    { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' },
    { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
    { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
    { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
    { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' },
];

const UpdateDetailsModal = ({ onClose, onSubmit }) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [dob, setDob] = useState('');
    
    const [ageValidationError, setAgeValidationError] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const monthRef = useRef(null);
    const yearRef = useRef(null);

    useEffect(() => {
        if (year && month && day && year.length === 4 && month.length >= 1 && day.length >= 1) {
            const paddedDay = day.toString().padStart(2, '0');
            const paddedMonth = month.toString().padStart(2, '0');
            setDob(`${year}-${paddedMonth}-${paddedDay}`);
        } else {
            setDob('');
        }
    }, [day, month, year]);

    useEffect(() => {
        if (!dob || !countryCode) {
            setAgeValidationError('');
            return;
        }

        const birthDate = new Date(dob);
        const today = new Date();
        
        birthDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (isNaN(birthDate.getTime()) || birthDate >= today) {
            setAgeValidationError('Please enter a valid date of birth.');
            return;
        }
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        const requiredAge = countryCode === 'US' ? 21 : 18;

        if (age < requiredAge) {
            setAgeValidationError(`You must be at least ${requiredAge} to use this app.`);
        } else {
            setAgeValidationError('');
        }
    }, [dob, countryCode]);

    const handleDobChange = (field, value) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        if (field === 'day') {
            setDay(numericValue);
            if (numericValue.length === 2 && monthRef.current) {
                monthRef.current.focus();
            }
        } else if (field === 'month') {
            setMonth(numericValue);
            if (numericValue.length === 2 && yearRef.current) {
                yearRef.current.focus();
            }
        } else if (field === 'year') {
            setYear(numericValue);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (ageValidationError) {
            setError(ageValidationError);
            return;
        }
        if (!dob || !countryCode) {
            setError("Please complete all fields.");
            return;
        }

        setLoading(true);
        const submissionError = await onSubmit({ dob, country_code: countryCode });
        setLoading(false);
        
        if (submissionError) {
            setError(submissionError);
        }
    };
    
    const isButtonDisabled = loading || !dob || !countryCode || !!ageValidationError;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-details-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="update-details-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Complete Your Profile
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                    Please provide your date of birth and country to continue.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="country">Country</label>
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-gray-400"><i className="fas fa-globe-americas"></i></div>
                            <select id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} required className="w-full appearance-none pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500">
                                <option value="" disabled>Select your country...</option>
                                {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
                                <i className="fas fa-chevron-down text-xs"></i>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="tel" value={day} onChange={(e) => handleDobChange('day', e.target.value)}
                                placeholder="DD" maxLength="2" required
                                className="w-full px-3 py-2 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-gray-400 dark:text-gray-500">/</span>
                            <input
                                ref={monthRef}
                                type="tel" value={month} onChange={(e) => handleDobChange('month', e.target.value)}
                                placeholder="MM" maxLength="2" required
                                className="w-full px-3 py-2 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-gray-400 dark:text-gray-500">/</span>
                            <input
                                ref={yearRef}
                                type="tel" value={year} onChange={(e) => handleDobChange('year', e.target.value)}
                                placeholder="YYYY" maxLength="4" required
                                className="w-full px-3 py-2 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    {(error || ageValidationError) && (
                        <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/30 p-2 rounded-md">
                            {error || ageValidationError}
                        </p>
                    )}

                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-1/2 mt-2 sm:mt-0 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isButtonDisabled}
                            className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                            ) : 'Save Details'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateDetailsModal;
