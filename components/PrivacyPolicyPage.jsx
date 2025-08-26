import React from 'react';

const LegalPageWrapper = ({ title, children, onBack }) => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span className="font-semibold">Back to Settings</span>
            </button>
        </div>
        <div className="flex-grow p-4 sm:p-6 overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
                {children}
            </div>
        </div>
    </div>
);


const PrivacyPolicyPage = ({ onBack }) => {
    return (
        <LegalPageWrapper title="Privacy Policy" onBack={onBack}>
            <p className="text-gray-500 dark:text-gray-400">Last Updated: August 25, 2025</p>
            <p>Your privacy is important to us. This Privacy Policy explains how Stoutly ("we," "us," or "our") collects, uses, and shares information about you when you use our Service.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">1. Information We Collect</h2>
            <p className="font-bold">Information You Provide to Us:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Account Information:</strong> When you create an account, we collect your email address, username, date of birth, and country of residence. Your password is encrypted and managed by our backend provider, Supabase; we never see it in plain text.</li>
                <li><strong>Profile Information:</strong> We collect information you add to your profile, such as your selected or uploaded avatar/profile picture and your bio.</li>
                <li><strong>Ratings and Reviews:</strong> We collect the ratings you submit, which include your scores for price and quality, and optionally, the exact price paid.</li>
                <li><strong>Photographs:</strong> If you choose to add a photo to your rating, we collect and store the image file you upload. This image will be associated with your rating and profile.</li>
                <li><strong>Comments:</strong> We collect any comments you post on ratings, which are linked to your account.</li>
                <li><strong>Marketing Preferences:</strong> We collect your preference for receiving marketing communications from us.</li>
            </ul>
            
            <p className="font-bold mt-4">Information We Collect Automatically:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Location Information:</strong> With your permission (granted via your browser or device settings), we access your device's geolocation to center the map, search for nearby pubs, and calculate distances. <strong>We do not store a historical log of your location.</strong> The location is used in real-time for core app functionality.</li>
                <li><strong>Usage Information (Analytics):</strong> If you consent, we use Google Analytics to collect information about your interactions with the Service, such as the pages or features you access and other actions you take. This data helps us understand how the app is used and how to improve it. This may include your IP address, browser type, and operating system.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Provide, maintain, and improve the Service.</li>
                <li>Verify you are of legal drinking age in your country of residence.</li>
                <li>Authenticate users and allow you to sign in to your account.</li>
                <li>Display your ratings, comments, profile picture, and other profile information to the community (e.g., on leaderboards and pub detail pages).</li>
                <li>Display the photographs you've submitted alongside your ratings to the community.</li>
                <li>Personalize your experience (e.g., by saving your theme and distance unit preferences).</li>
                <li>Communicate with you for password recovery and other essential service notifications.</li>
                <li>Send you marketing emails about new features, news, offers, and community events, but only if you have given us your explicit consent to do so.</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our Service using aggregated and anonymized data (e.g., "what is the average age of users in Ireland?").</li>
                <li>Moderate the platform and prevent malicious activity.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">3. How We Share Your Information</h2>
            <p>We do not sell your personal data. We may share your information in the following limited circumstances:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Publicly on the Service:</strong> Your username, avatar, level, rank, individual ratings, comments, and any photographs you have uploaded are publicly visible to other users. Your specific age is never made public.</li>
                <li><strong>With Service Providers:</strong> We use third-party vendors to help us operate our Service. These include:
                    <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                        <li><strong>Supabase:</strong> Our backend and database provider. They store your account information, profiles, ratings, comments, and uploaded images.</li>
                        <li><strong>OpenStreetMap & Nominatim:</strong> We use map data from OpenStreetMap contributors and the Nominatim search service for geocoding (e.g., finding addresses). This allows us to display maps and find pubs. Their privacy policy can be found on their respective websites.</li>
                        <li><strong>Google Analytics:</strong> If you provide consent, we use Google Analytics to analyze usage trends and improve the app.</li>
                    </ul>
                    These providers have access to your information only to perform services on our behalf and are obligated not to disclose or use it for any other purpose.
                </li>
                <li><strong>For Legal Reasons:</strong> We may disclose your information if we believe that it is reasonably necessary to comply with a law, regulation, legal process, or governmental request.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">4. Your Rights and Choices</h2>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Account Information:</strong> You can see, review, and update your profile information, including your avatar and bio, at any time within the "Profile" section of the app. Your date of birth and country cannot be changed after signup.</li>
                <li><strong>Managing Your Content:</strong> You can delete a comment you've posted or remove a photograph you've uploaded at any time. This will remove it from our servers.</li>
                <li><strong>Marketing Preferences:</strong> You can opt-in or opt-out of receiving marketing emails from us at any time. You can manage your preference via the toggle in the "Settings" section of the app.</li>
                <li><strong>Location Information:</strong> You can prevent us from collecting location information by changing the permissions on your device or browser. If you do, the map and distance-based features may not function correctly.</li>
                <li><strong>Account Deletion:</strong> If you wish to delete your account, please contact us through the form in the app's settings. Please note that upon deletion, we may retain certain anonymized or aggregated data that does not identify you.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">5. Data Security</h2>
            <p>We take reasonable measures to protect your information from loss, theft, misuse, and unauthorized access. We use Supabase's built-in security features, including Row-Level Security (RLS), to ensure that users can only access and modify data they are permitted to.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">6. Age Restriction</h2>
            <p>This Service is strictly intended for users who are of legal drinking age in their respective jurisdiction (e.g., 18 or 21 years or older). We do not knowingly collect personal information from individuals under the legal drinking age. If you are not of legal drinking age, you are not permitted to use this Service or create an account.</p>
            <p>If we become aware that we have collected personal data from an individual under the legal drinking age, we will take steps to delete that information from our servers. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">7. Changes to this Policy</h2>
            <p>We may update this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">8. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:admin@stoutly.co.uk" className="text-amber-600 dark:text-amber-400 hover:underline">admin@stoutly.co.uk</a> or through the "Contact Us" form in the app's settings.</p>
        </LegalPageWrapper>
    );
};

export default PrivacyPolicyPage;
