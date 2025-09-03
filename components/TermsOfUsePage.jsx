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

const TermsOfUsePage = ({ onBack }) => {
    return (
        <LegalPageWrapper title="Terms of Use" onBack={onBack}>
            <p className="text-gray-500 dark:text-gray-400">Last Updated: September 3, 2025</p>
            <p>Welcome to Stoutly! These Terms of Use ("Terms") govern your access to and use of the Stoutly web application and any related services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.</p>
            
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">1. Description of Service</h2>
            <p>Stoutly is a platform that allows users to find, rate, and review pints of Guinness based on factors like price and quality. The Service uses location data to display nearby pubs and aggregates user ratings to provide community-driven insights.</p>
            
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">2. Eligibility and User Accounts</h2>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Age Requirement:</strong> You must be of legal drinking age in your jurisdiction (e.g., 18 or 21 years or older) to create an account and use the Service. By creating an account, you represent and warrant that you meet this age requirement. We collect your date of birth and country during signup to verify this.</li>
                <li><strong>Account Creation:</strong> To access certain features, you must create an account. You agree to provide accurate, current, and complete information during the registration process.</li>
                <li><strong>Account Responsibility:</strong> You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</li>
                <li><strong>One Account per User:</strong> You may not maintain more than one account.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">3. User Conduct</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Post ratings that are not made in good faith, are intentionally misleading, or are based on anything other than your own personal experience.</li>
                <li>Post, upload, or share any content (including your bio, comments, and photos) that is illegal, defamatory, obscene, pornographic, harassing, hateful, graphically violent, infringing on third-party intellectual property rights, or invasive of another's privacy.</li>
                <li>Upload a profile picture that is not your own likeness or an appropriate avatar, or that contains nudity, violence, hate speech, or infringes on third-party copyrights (e.g., a cartoon character you do not have rights to use).</li>
                <li>Upload photographs that are not of the pint of Guinness you are rating, or that contain inappropriate subject matter.</li>
                <li>Engage in "review bombing," spamming, or other malicious activities intended to manipulate ratings or harass other users.</li>
                <li>Attempt to gain unauthorized access to the Service, other users' accounts, or our backend systems.</li>
                <li>Violate any applicable laws or regulations.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">4. User-Generated Content</h2>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Your Content:</strong> You retain ownership of the content you submit to the Service, including your ratings, comments, reviews, bio, profile pictures, photographs, and other materials (collectively, "User Content").</li>
                <li><strong>License to Us:</strong> By submitting User Content, you grant Stoutly a worldwide, non-exclusive, royalty-free, perpetual license to use, display, reproduce, modify (for formatting), and distribute your User Content in connection with operating and promoting the Service. This allows us to, for example, show your rating, comments, and photograph on the Service, include you on the leaderboard, and feature your content in promotional materials for Stoutly (such as on our social media channels or website). We will always credit your username when doing so.</li>
                <li><strong>Public Display:</strong> You understand and agree that your username, avatar, rank, ratings, and comments will be publicly visible to other users of the Service.</li>
                <li><strong>Content Warranty:</strong> You represent and warrant that you own or have the necessary licenses, rights, consents, and permissions to publish the User Content you submit. You further agree that the User Content you submit will not contain third-party copyrighted material, or material that is subject to other third-party proprietary rights, unless you have permission from the rightful owner of the material.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">5. Donations</h2>
            <p>Stoutly is a free service supported by its community. If you choose to make a donation to support the app's development, your payment will be processed by our third-party payment processor, Stripe. Donations are voluntary and non-refundable. We do not store your credit card information.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">6. Stoutly Intellectual Property</h2>
            <p>Excluding your User Content, all aspects of the Service, including its "look and feel," branding, code, and content created by Stoutly, are the exclusive property of Stoutly and its licensors. You may not copy, modify, or distribute any part of the Service without our prior written consent.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">7. Moderation and Termination</h2>
            <p>We are committed to maintaining a high-quality and trustworthy platform. We reserve the right, but do not have the obligation, to:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Monitor, screen, or remove any User Content at our sole discretion, including comments, profile pictures, or photographs that we deem inappropriate or in violation of these Terms.</li>
                <li>Suspend or permanently terminate your account for any reason, without notice, especially for violations of these Terms. Our decisions on moderation and termination are final.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">8. Disclaimers</h2>
            <p>The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not warrant that the information provided (including pub locations or average ratings) is accurate, complete, or reliable. You rely on any information available through the Service at your own risk.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Stoutly and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the Service.</p>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">10. Changes to Terms</h2>
            <p>We may modify these Terms at any time. We will post the revised Terms and update the "Last Updated" date. Your continued use of the Service after any modification constitutes your acceptance of the new Terms.</p>
            
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white pt-4">11. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at <a href="mailto:admin@stoutly.co.uk" className="text-amber-600 dark:text-amber-400 hover:underline">admin@stoutly.co.uk</a> or through the "Contact Us" form in the app's settings.</p>
        </LegalPageWrapper>
    );
};

export default TermsOfUsePage;