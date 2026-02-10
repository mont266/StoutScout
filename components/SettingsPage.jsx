import React, { useState, useEffect } from 'react';
import { MILES_TO_METERS, MIN_RADIUS_MI, MAX_RADIUS_MI } from '../constants.js';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import { getMobileOS } from '../utils.js';
import useIsDesktop from '../hooks/useIsDesktop.js';
import ContactModal from './ContactModal.jsx';
import FeedbackModal from './FeedbackModal.jsx';
import DonationForm from './DonationForm.jsx';
import { Capacitor } from '@capacitor/core';
import ConfirmationModal from './ConfirmationModal.jsx';

// Reusable components for the new settings layout
const SettingsSection = ({ title, children, id, titleColor = 'text-gray-800 dark:text-white' }) => (
    <div id={id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {title && (
            <h3 className={`text-lg font-bold ${titleColor} p-4 border-b border-gray-200 dark:border-gray-700`}>
                {title}
            </h3>
        )}
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

const SettingsItem = ({ icon, label, children, onClick, notification = false }) => {
    const Wrapper = onClick ? 'button' : 'div';
    return (
        <Wrapper
            onClick={onClick}
            className={`flex items-center justify-between w-full text-left ${onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-4 px-4 py-3 first:-mt-4 last:-mb-4' : ''} ${onClick && 'transition-colors'}`}
        >
            <div className="flex items-center space-x-4">
                <i className={`fas ${icon} w-5 text-center text-gray-500 dark:text-gray-400 text-lg`}></i>
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
            </div>
            <div className="flex items-center space-x-3">
                {children}
                {notification && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" aria-label="New updates available"></span>}
                {onClick && <i className="fas fa-chevron-right text-gray-400"></i>}
            </div>
        </Wrapper>
    );
};

const DevSubheading = ({ children }) => (
    <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider pt-4 pb-2 first:pt-0 border-t border-gray-200 dark:border-gray-700 first:border-t-0">
        {children}
    </h4>
);


const SettingsPage = ({ settings, handleSettingsChange, userProfile, session, onLogout, handleViewLegal, onViewSocialHub, onDataRefresh, installPromptEvent, setInstallPromptEvent, onShowIosInstall, setAlertInfo, onMarketingConsentChange, showAllDbPubs, onToggleShowAllDbPubs, setConfettiState, onLoginRequest, handleChangePassword, isChangingPassword, scrollToSection, onScrollComplete, userTrophies, allTrophies, systemFlags, localStPaddysOverride, onToggleGlobalStPaddysMode, onToggleLocalStPaddysMode, onViewModeration, isPubCrawlPlannerEnabled, onTogglePubCrawlPlanner, onTestTrophyPopup, onViewChangelog, onManageChangelog, hasUnreadChangelog, handleDonationSuccess, onTestDonationPopup, onDeleteAccountRequest }) => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState({ isOpen: false });
  const isDesktop = useIsDesktop();
  
  const isNativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const handleThemeChange = (theme) => {
    handleSettingsChange({ ...settings, theme });
    trackEvent('change_setting', { setting_name: 'theme', value: theme });
  };
  
  const handleRadiusChange = (e) => {
    const radiusInMiles = parseFloat(e.target.value);
    handleSettingsChange({ ...settings, radius: radiusInMiles * MILES_TO_METERS });
  };
  
  useEffect(() => {
    if (scrollToSection) {
        const element = document.getElementById(`${scrollToSection}-section`);
        if (element) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-rating');
                setTimeout(() => {
                    element.classList.remove('highlight-rating');
                }, 2500);
            }, 100);
        }
        onScrollComplete();
    }
  }, [scrollToSection, onScrollComplete]);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    trackEvent('pwa_install_prompt_triggered');
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    trackEvent('pwa_install_prompt_result', { outcome });
    setInstallPromptEvent(null);
  };
  
  const handleIosInstallClick = () => {
    trackEvent('share', { method: 'Add to Home Screen', content_type: 'app' });
    onShowIosInstall();
  };

  const confirmToggleGlobalMode = (isActive) => {
    setConfirmation({
        isOpen: true,
        title: `Confirm Global Change`,
        message: `Are you sure you want to ${isActive ? 'ENABLE' : 'DISABLE'} St. Paddy's Mode for all users? This will change the app theme immediately.`,
        onConfirm: () => {
            onToggleGlobalStPaddysMode(isActive);
            setConfirmation({ isOpen: false });
        },
        confirmText: isActive ? 'Enable Globally' : 'Disable Globally',
        theme: isActive ? 'green' : 'red',
    });
  };

  const isKm = settings.unit === 'km';
  const radiusInMilesRaw = settings.radius / MILES_TO_METERS;

  const displayRadius = isKm ? (radiusInMilesRaw * 1.60934).toFixed(1) : radiusInMilesRaw.toFixed(1);
  const minDisplayRadius = isKm ? (MIN_RADIUS_MI * 1.60934).toFixed(1) : MIN_RADIUS_MI.toFixed(1);
  const maxDisplayRadius = isKm ? (MAX_RADIUS_MI * 1.60934).toFixed(1) : MAX_RADIUS_MI.toFixed(1);
  const displayUnit = isKm ? 'km' : 'mi';
  
  const mobileOS = getMobileOS();
  const isAndroidWebApp = mobileOS === 'Android' && !Capacitor.isNativePlatform();
  const isIosWebApp = mobileOS === 'iOS' && !Capacitor.isNativePlatform();

  return (
    <>
      {isContactModalOpen && <ContactModal userProfile={userProfile} session={session} onClose={() => setIsContactModalOpen(false)} />}
      {isFeedbackModalOpen && <FeedbackModal userProfile={userProfile} onClose={() => setIsFeedbackModalOpen(false)} />}
      {confirmation.isOpen && <ConfirmationModal {...confirmation} onClose={() => setConfirmation({ isOpen: false })} />}
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">

          {/* Install App Section */}
          {(installPromptEvent || isAndroidWebApp || isIosWebApp) && (
            <SettingsSection title="Get the App">
              {installPromptEvent && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <i className="fas fa-download"></i>
                  <span>Install Stoutly</span>
                </button>
              )}
              {isIosWebApp && (
                  <button
                    onClick={handleIosInstallClick}
                    className="w-full flex items-center justify-center space-x-2 bg-black dark:bg-gray-200 text-white dark:text-black font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    <i className="fab fa-apple"></i>
                    <span>Add to Home Screen</span>
                  </button>
              )}
              {isAndroidWebApp && (
                  <a
                    href="https://play.google.com/store/apps/details?id=uk.co.stoutly.twa"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('click_play_store_badge')}
                    className="block"
                    aria-label="Get it on Google Play"
                  >
                    <img
                        src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                        alt="Get it on Google Play"
                        className="w-48 mx-auto"
                    />
                  </a>
              )}
            </SettingsSection>
          )}

          {/* Appearance Section */}
          <SettingsSection title="Appearance">
            <SettingsItem icon="fa-palette" label="Theme">
              <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`w-20 py-1 rounded-md font-bold text-sm transition-colors ${settings.theme === 'light' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300'}`}
                  aria-pressed={settings.theme === 'light'}
                >Light</button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`w-20 py-1 rounded-md font-bold text-sm transition-colors ${settings.theme === 'dark' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300'}`}
                  aria-pressed={settings.theme === 'dark'}
                >Dark</button>
              </div>
            </SettingsItem>

            <SettingsItem icon="fa-ruler-horizontal" label="Distance Unit">
              <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group">
                <button
                  onClick={() => handleSettingsChange({ ...settings, unit: 'mi' })}
                  className={`w-20 py-1 rounded-md font-bold text-sm transition-colors ${settings.unit === 'mi' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300'}`}
                  aria-pressed={settings.unit === 'mi'}
                >Miles</button>
                <button
                  onClick={() => handleSettingsChange({ ...settings, unit: 'km' })}
                  className={`w-20 py-1 rounded-md font-bold text-sm transition-colors ${settings.unit === 'km' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300'}`}
                  aria-pressed={settings.unit === 'km'}
                >Km</button>
              </div>
            </SettingsItem>

            <div className="pt-4">
              <label htmlFor="radius-slider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Radius: <span className="font-bold text-amber-500 dark:text-amber-400">{displayRadius} {displayUnit}</span>
              </label>
              <input
                id="radius-slider" type="range" min={MIN_RADIUS_MI} max={MAX_RADIUS_MI} step="0.1" value={radiusInMilesRaw}
                onChange={handleRadiusChange}
                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                aria-valuetext={`${displayRadius} ${displayUnit}`}
              />
            </div>
            
             <SettingsItem icon="fa-map" label="Show Search Radius on Map">
                <label htmlFor="show-radius-toggle" className="relative cursor-pointer">
                    <input
                        id="show-radius-toggle" type="checkbox" className="sr-only peer"
                        checked={settings.showSearchRadius}
                        onChange={(e) => {
                            handleSettingsChange({ ...settings, showSearchRadius: e.target.checked });
                            trackEvent('change_setting', { setting_name: 'show_search_radius', value: e.target.checked });
                        }}
                    />
                    <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                </label>
            </SettingsItem>
          </SettingsSection>

          {/* Account Section */}
          <SettingsSection title="Account">
            {session ? (
              <>
                <SettingsItem icon="fa-key" label="Change Password">
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {isChangingPassword ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </SettingsItem>
                 <SettingsItem icon="fa-envelope" label="Marketing Emails">
                    <label className="relative cursor-pointer">
                        <input
                            type="checkbox" className="sr-only peer"
                            checked={userProfile.accepts_marketing}
                            onChange={(e) => onMarketingConsentChange(e.target.checked)}
                        />
                        <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                </SettingsItem>
                <SettingsItem icon="fa-sign-out-alt" label="Sign Out" onClick={onLogout} />
              </>
            ) : (
                <button
                    onClick={onLoginRequest}
                    className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
                >
                    Sign In or Create Account
                </button>
            )}
          </SettingsSection>

          {/* Support Section */}
          {!isNativeIos && (
            <SettingsSection title="Support Stoutly" id="support-section">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                  Stoutly is a passion project, and every donation helps cover server costs and fuels future development. Thank you for your support!
              </p>
              <DonationForm 
                  userProfile={userProfile} 
                  onSuccess={handleDonationSuccess}
                  userTrophies={userTrophies}
                  allTrophies={allTrophies}
                  onLoginRequest={onLoginRequest}
              />
            </SettingsSection>
          )}

          {/* About Stoutly Section */}
          <SettingsSection title="About Stoutly">
            <SettingsItem icon="fa-newspaper" label="What's New" onClick={onViewChangelog} notification={hasUnreadChangelog} />
            <SettingsItem icon="fa-question-circle" label="Contact Us" onClick={() => setIsContactModalOpen(true)} />
            <SettingsItem icon="fa-comment-alt" label="Give Feedback / Report a Bug" onClick={() => setIsFeedbackModalOpen(true)} />
          </SettingsSection>

          {/* Legal Section */}
          <SettingsSection title="Legal">
            <SettingsItem icon="fa-file-alt" label="Terms of Use" onClick={() => handleViewLegal('terms')} />
            <SettingsItem icon="fa-shield-alt" label="Privacy Policy" onClick={() => handleViewLegal('privacy')} />
          </SettingsSection>

          {/* Developer Section */}
          {userProfile?.is_developer && (
            <SettingsSection title="Developer Tools" titleColor="text-amber-500 dark:text-amber-400">
                <DevSubheading>Admin Panels</DevSubheading>
                <SettingsItem icon="fa-shield-alt" label="Moderation Center" onClick={onViewModeration} />
                <SettingsItem icon="fa-feather-alt" label="Social Content Hub" onClick={onViewSocialHub} />
                <SettingsItem icon="fa-list-alt" label="Manage Changelog" onClick={onManageChangelog} />

                <DevSubheading>Global Feature Flags</DevSubheading>
                <SettingsItem icon="fa-clover" label="St. Paddy's Mode (Global)">
                    <label htmlFor="global-st-paddy-toggle" className="relative cursor-pointer">
                        <input
                            id="global-st-paddy-toggle" type="checkbox" className="sr-only peer"
                            checked={systemFlags.st_paddys_mode || false}
                            onChange={(e) => confirmToggleGlobalMode(e.target.checked)}
                        />
                        <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                </SettingsItem>
                <SettingsItem icon="fa-route" label="Enable Pub Crawl Planner">
                     <label htmlFor="pub-crawl-toggle" className="relative cursor-pointer">
                        <input
                            id="pub-crawl-toggle" type="checkbox" className="sr-only peer"
                            checked={isPubCrawlPlannerEnabled}
                            onChange={(e) => onTogglePubCrawlPlanner(e.target.checked)}
                        />
                        <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                </SettingsItem>

                <DevSubheading>Debugging & Testing</DevSubheading>
                <SettingsItem icon="fa-map-marked-alt" label="Show All DB Pubs">
                    <label htmlFor="show-all-toggle" className="relative cursor-pointer">
                        <input
                            id="show-all-toggle" type="checkbox" className="sr-only peer"
                            checked={showAllDbPubs}
                            onChange={onToggleShowAllDbPubs}
                        />
                        <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                </SettingsItem>
                <SettingsItem icon="fa-map-pin" label="Show Search Origin">
                    <label htmlFor="show-origin-toggle" className="relative cursor-pointer">
                        <input
                            id="show-origin-toggle" type="checkbox" className="sr-only peer"
                            checked={settings.showSearchOrigin}
                            onChange={(e) => handleSettingsChange({ ...settings, showSearchOrigin: e.target.checked })}
                        />
                        <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                </SettingsItem>
                <SettingsItem icon="fa-clover" label="St. Paddy's Mode (Local)">
                     <label htmlFor="local-st-paddy-toggle" className="relative cursor-pointer">
                        <input
                            id="local-st-paddy-toggle" type="checkbox" className="sr-only peer"
                            checked={localStPaddysOverride}
                            onChange={(e) => onToggleLocalStPaddysMode(e.target.checked)}
                        />
                        <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                </SettingsItem>
                 <SettingsItem icon="fa-trophy" label="Test Trophy Popup">
                    <button onClick={onTestTrophyPopup} className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                        Trigger
                    </button>
                </SettingsItem>
                <SettingsItem icon="fa-hand-holding-heart" label="Test Donation Popup">
                    <div className="flex gap-2">
                        <button onClick={() => onTestDonationPopup('new_trophy')} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                            New Donor
                        </button>
                        <button onClick={() => onTestDonationPopup('repeat_donation')} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                            Repeat Donor
                        </button>
                    </div>
                </SettingsItem>
            </SettingsSection>
          )}

          {/* Danger Zone */}
          {session && (
            <div id="danger-zone-section" className="border-2 border-red-500 rounded-xl p-4 space-y-2">
                <h3 className="text-lg font-bold text-red-500 dark:text-red-400">Danger Zone</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-white">Delete My Account</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Permanently erase all your data.</p>
                    </div>
                    <button
                        onClick={onDeleteAccountRequest}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                        Delete Account
                    </button>
                </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default SettingsPage;