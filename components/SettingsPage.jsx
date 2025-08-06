import React, { useState, useEffect, useMemo } from 'react';
import { MILES_TO_METERS, MIN_RADIUS_MI, MAX_RADIUS_MI } from '../constants.js';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import ModerationPage from './ModerationPage.jsx';
import StatsPage from './StatsPage.jsx';
import { trackEvent } from '../analytics.js';
import { getMobileOS } from '../utils.js';
import useIsDesktop from '../hooks/useIsDesktop.js';
import ContactModal from './ContactModal.jsx';
import FeedbackModal from './FeedbackModal.jsx';
import KofiModal from './KofiModal.jsx';


// This component is no longer a modal, but a full page for settings
// that appears in its own tab.
const SettingsPage = ({ settings, onSettingsChange, onSetSimulatedLocation, userProfile, session, onLogout, onViewProfile, onViewLegal, onViewStats, onViewModeration, onDataRefresh, installPromptEvent, setInstallPromptEvent, onShowIosInstall, onMarketingConsentChange }) => {
  const [locationInput, setLocationInput] = useState(settings.simulatedLocation?.name || '');
  const [isLocating, setIsLocating] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isKofiModalOpen, setIsKofiModalOpen] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [refreshStatsSuccess, setRefreshStatsSuccess] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildSuccess, setRebuildSuccess] = useState(false);
  
  const handleUnitChange = (unit) => onSettingsChange({ ...settings, unit });
  const handleThemeChange = (theme) => onSettingsChange({ ...settings, theme });
  const handleDeveloperModeChange = (enabled) => onSettingsChange({ ...settings, developerMode: enabled });

  const handleRadiusChange = (e) => {
    const radiusInMiles = parseFloat(e.target.value);
    onSettingsChange({ ...settings, radius: radiusInMiles * MILES_TO_METERS });
  };

  const handleSetLocation = async () => {
    if (!locationInput) return;
    setIsLocating(true);
    try {
      await onSetSimulatedLocation(locationInput);
    } catch (error) {
      alert(error.message || 'Could not find location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleClearLocation = () => {
    setLocationInput('');
    onSetSimulatedLocation(null);
  };
  
  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    trackEvent('pwa_install_prompt_triggered');
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    trackEvent('pwa_install_prompt_result', { outcome });
    // The prompt can only be used once.
    setInstallPromptEvent(null);
  };
  
  const handleIosInstallClick = () => {
    trackEvent('share', { method: 'Add to Home Screen', content_type: 'app' });
    onShowIosInstall();
  };

  const handleDonateClick = () => {
    trackEvent('click_donate_kofi');
    setIsKofiModalOpen(true);
  };

  const handleManualPriceStatRefresh = async () => {
    setIsRefreshingStats(true);
    setRefreshStatsSuccess(false);
    trackEvent('manual_refresh_area_prices');
    try {
        const { error } = await supabase.rpc('refresh_area_price_stats');
        if (error) throw error;
        
        setRefreshStatsSuccess(true);
        setTimeout(() => setRefreshStatsSuccess(false), 3000);

        await onDataRefresh();
    } catch (error) {
        console.error("Error refreshing area price stats:", error);
        alert(`Could not refresh stats: ${error.message}`);
    } finally {
        setIsRefreshingStats(false);
    }
  };

  const handleRebuildDynamicPricing = async () => {
    if (!window.confirm("This will re-assign all pubs to a pricing area and then recalculate all area stats. This is a heavy operation. Continue?")) {
        return;
    }
    setIsRebuilding(true);
    setRebuildSuccess(false);
    trackEvent('manual_rebuild_dynamic_pricing');
    try {
        // Step 1: Re-assign all area identifiers
        const { error: assignError } = await supabase.rpc('assign_area_identifiers');
        if (assignError) throw new Error(`Area assignment failed: ${assignError.message}`);

        // Step 2: Refresh the stats based on the new assignments
        const { error: refreshError } = await supabase.rpc('refresh_area_price_stats');
        if (refreshError) throw new Error(`Stat refresh failed: ${refreshError.message}`);
        
        setRebuildSuccess(true);
        setTimeout(() => setRebuildSuccess(false), 3000);

        // Step 3: Refresh all app data
        await onDataRefresh();

    } catch (error) {
        console.error("Error rebuilding dynamic pricing:", error);
        alert(`Could not rebuild dynamic pricing: ${error.message}`);
    } finally {
        setIsRebuilding(false);
    }
  };

  const isKm = settings.unit === 'km';
  const radiusInMilesRaw = settings.radius / MILES_TO_METERS;

  // Values for the slider labels
  const displayRadius = isKm ? (radiusInMilesRaw * 1.60934).toFixed(1) : radiusInMilesRaw.toFixed(1);
  const minDisplayRadius = isKm ? (MIN_RADIUS_MI * 1.60934).toFixed(1) : MIN_RADIUS_MI.toFixed(1);
  const maxDisplayRadius = isKm ? (MAX_RADIUS_MI * 1.60934).toFixed(1) : MAX_RADIUS_MI.toFixed(1);
  const displayUnit = isKm ? 'km' : 'mi';
  
  const mobileOS = getMobileOS();

  const renderInstallButton = () => {
    const isDesktop = useIsDesktop();
    if (isDesktop) return null;

    if (mobileOS === 'Android' && installPromptEvent) {
      return (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
        >
          <i className="fas fa-download"></i>
          <span>Install App</span>
        </button>
      );
    }

    if (mobileOS === 'iOS') {
      return (
        <button
          onClick={handleIosInstallClick}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <i className="fas fa-arrow-up-from-square"></i>
          <span>Add to Home Screen</span>
        </button>
      );
    }
    return null;
  };
  
  const installButton = renderInstallButton();

  return (
    <>
      <KofiModal isOpen={isKofiModalOpen} onClose={() => setIsKofiModalOpen(false)} />
      {isContactModalOpen && <ContactModal userProfile={userProfile} session={session} onClose={() => setIsContactModalOpen(false)} />}
      {isFeedbackModalOpen && <FeedbackModal userProfile={userProfile} onClose={() => setIsFeedbackModalOpen(false)} />}
      <div className="p-4 sm:p-6 space-y-8">
          {installButton && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              {installButton}
            </div>
          )}

          {/* Theme Setting */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="theme-label">Theme</label>
            <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="theme-label">
              <button
                onClick={() => handleThemeChange('light')}
                className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.theme === 'light' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                aria-pressed={settings.theme === 'light'}
              >
                <i className="fas fa-sun"></i><span>Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.theme === 'dark' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                aria-pressed={settings.theme === 'dark'}
              >
                <i className="fas fa-moon"></i><span>Dark</span>
              </button>
            </div>
          </div>
          
          {/* Distance Unit Setting */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="distance-unit-label">Distance Unit</label>
            <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="distance-unit-label">
              <button
                onClick={() => handleUnitChange('mi')}
                className={`w-1/2 py-2 rounded-md font-bold transition-colors ${settings.unit === 'mi' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                aria-pressed={settings.unit === 'mi'}
              >
                Miles
              </button>
              <button
                onClick={() => handleUnitChange('km')}
                className={`w-1/2 py-2 rounded-md font-bold transition-colors ${settings.unit === 'km' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                aria-pressed={settings.unit === 'km'}
              >
                Kilometers
              </button>
            </div>
          </div>

          {/* Search Radius Setting */}
          <div>
            <label htmlFor="radius-slider" className="block text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Search Radius
            </label>
            <div className="space-y-2">
              <input
                id="radius-slider"
                type="range"
                min={MIN_RADIUS_MI}
                max={MAX_RADIUS_MI}
                step="0.1"
                value={radiusInMilesRaw}
                onChange={handleRadiusChange}
                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                aria-valuemin={MIN_RADIUS_MI}
                aria-valuemax={MAX_RADIUS_MI}
                aria-valuenow={radiusInMilesRaw}
                aria-valuetext={`${displayRadius} ${displayUnit}`}
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{minDisplayRadius} {displayUnit}</span>
                  <span className="text-base font-bold text-amber-500 dark:text-amber-400">{displayRadius} {displayUnit}</span>
                  <span>{maxDisplayRadius} {displayUnit}</span>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          {userProfile && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white px-2">Notification Preferences</h3>
                 <label htmlFor="marketing-toggle" className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="flex flex-col pr-4">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Marketing Emails</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Receive news, offers, and updates from Stoutly.</span>
                    </span>
                    <div className="relative flex-shrink-0">
                        <input
                            id="marketing-toggle"
                            type="checkbox"
                            className="sr-only peer"
                            checked={userProfile.accepts_marketing || false}
                            onChange={(e) => onMarketingConsentChange(e.target.checked)}
                        />
                        <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </div>
                </label>
            </div>
          )}

          {/* Admin Tools Section */}
          {(userProfile?.is_developer || userProfile?.is_team_member) && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                   <h3 className="text-xl font-bold text-red-500 dark:text-red-400 text-center">Admin Tools</h3>
                   <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {userProfile?.is_developer && (
                            <button
                                onClick={() => { onViewModeration(); trackEvent('view_moderation_center'); }}
                                className="flex-1 flex items-center justify-center space-x-2 bg-red-500/10 text-red-500 dark:text-red-400 font-bold py-3 px-4 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                                <i className="fas fa-shield-alt"></i>
                                <span>Moderation</span>
                            </button>
                          )}
                          <button
                              onClick={() => { onViewStats(); trackEvent('view_stats_page'); }}
                              className="flex-1 flex items-center justify-center space-x-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold py-3 px-4 rounded-lg hover:bg-blue-500/20 transition-colors"
                          >
                              <i className="fas fa-chart-bar"></i>
                              <span>Stats</span>
                          </button>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg space-y-3">
                          <p className="text-xs text-center text-gray-500 dark:text-gray-400">Use these tools to fix data inconsistencies for the dynamic pricing feature.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                onClick={handleRebuildDynamicPricing}
                                disabled={isRebuilding}
                                className="flex-1 flex items-center justify-center space-x-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold py-3 px-4 rounded-lg hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                              >
                                  {isRebuilding 
                                      ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> 
                                      : rebuildSuccess 
                                          ? <i className="fas fa-check"></i> 
                                          : <i className="fas fa-cogs"></i>}
                                  <span>
                                      {isRebuilding 
                                          ? 'Rebuilding...' 
                                          : rebuildSuccess 
                                              ? 'Rebuilt!' 
                                              : 'Rebuild Dynamic Pricing'}
                                  </span>
                              </button>
                              <button
                                onClick={handleManualPriceStatRefresh}
                                disabled={isRefreshingStats}
                                className="flex-1 flex items-center justify-center space-x-2 bg-green-500/10 text-green-600 dark:text-green-400 font-bold py-3 px-4 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              >
                                  {isRefreshingStats 
                                      ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> 
                                      : refreshStatsSuccess 
                                          ? <i className="fas fa-check"></i> 
                                          : <i className="fas fa-calculator"></i>}
                                  <span>
                                      {isRefreshingStats 
                                          ? 'Refreshing...' 
                                          : refreshStatsSuccess 
                                              ? 'Refreshed!' 
                                              : 'Refresh Area Prices'}
                                  </span>
                              </button>
                          </div>
                      </div>
                   </div>
              </div>
          )}

          {/* Developer Section */}
          {userProfile?.is_developer && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
              <h3 className="text-xl font-bold text-red-500 dark:text-red-400 text-center">Developer Tools</h3>
              <div>
                <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="dev-mode-label">Developer Mode</label>
                <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="dev-mode-label">
                  <button
                    onClick={() => handleDeveloperModeChange(true)}
                    className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.developerMode ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                    aria-pressed={settings.developerMode}
                  ><i className="fas fa-bug"></i><span>On</span></button>
                  <button
                    onClick={() => handleDeveloperModeChange(false)}
                    className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${!settings.developerMode ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                    aria-pressed={!settings.developerMode}
                  ><i className="fas fa-toggle-off"></i><span>Off</span></button>
                </div>
              </div>
              {settings.developerMode && (
                <>
                  <div>
                    <label htmlFor="location-input" className="block text-lg font-semibold text-gray-800 dark:text-white mb-2">Simulate Location</label>
                    {settings.simulatedLocation && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            Currently viewing: <span className="font-bold">{settings.simulatedLocation.name}</span>
                        </p>
                    )}
                    <div className="flex space-x-2">
                      <input
                        id="location-input"
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="e.g., Eiffel Tower, Paris"
                        className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={handleSetLocation}
                        disabled={isLocating || !locationInput}
                        className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-400/50 flex items-center justify-center w-20"
                      >
                        {isLocating ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Set'}
                      </button>
                    </div>
                      {settings.simulatedLocation && (
                        <button onClick={handleClearLocation} className="text-sm text-center w-full mt-2 text-gray-500 dark:text-gray-400 hover:underline">Clear simulated location</button>
                      )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Support Us Section */}
           <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white px-2">Support Stoutly</h3>
              <div className="px-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      If you enjoy using Stoutly, please consider supporting its development. Every contribution helps keep the app running and ad-free!
                  </p>
                  <button
                      onClick={handleDonateClick}
                      className="w-full flex items-center justify-center space-x-3 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
                  >
                      <i className="fas fa-heart"></i>
                      <span>Buy me a pint</span>
                  </button>
              </div>
          </div>

          {/* Support & Feedback Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white px-2">Support &amp; Feedback</h3>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center text-left text-gray-700 dark:text-gray-200"
              >
                <span>Contact Us</span>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center text-left text-gray-700 dark:text-gray-200"
              >
                <span>Report a Bug / Request a Feature</span>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
          </div>

          {/* Follow Us Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white px-2">Follow Us</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                  <a
                      href="https://www.facebook.com/people/Stoutly-App/61578687216972/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('click_social', { social_platform: 'facebook' })}
                      className="flex-1 flex items-center justify-center space-x-3 bg-[#1877F2] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#166fe5] transition-colors"
                  >
                      <i className="fab fa-facebook-f text-xl"></i>
                      <span>Facebook</span>
                  </a>
                  <a
                      href="https://www.instagram.com/stoutlyapp/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('click_social', { social_platform: 'instagram' })}
                      className="flex-1 flex items-center justify-center space-x-3 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                  >
                      <i className="fab fa-instagram text-xl"></i>
                      <span>Instagram</span>
                  </a>
              </div>
          </div>

          {/* Legal Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white px-2">Legal</h3>
              <button
                onClick={() => onViewLegal('terms')}
                className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center text-left text-gray-700 dark:text-gray-200"
              >
                <span>Terms of Use</span>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
              <button
                onClick={() => onViewLegal('privacy')}
                className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center text-left text-gray-700 dark:text-gray-200"
              >
                <span>Privacy Policy</span>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
          </div>


          {/* Footer section with Disclaimers and Sign Out */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
                  <p>
                      Stoutly is an independent, unofficial app created by fans. It is not affiliated with, endorsed by, or sponsored by Guinness or its parent company, Diageo.
                  </p>
                  <p className="font-semibold">
                      Please drink responsibly. This app is intended for users of legal drinking age.
                  </p>
              </div>
              
              {userProfile && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-red-500/80 hover:text-white dark:hover:bg-red-600/80 transition-colors"
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Sign Out</span>
                </button>
              )}
          </div>
      </div>
    </>
  );
};

export default SettingsPage;