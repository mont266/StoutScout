import React, { useState, useMemo, useCallback, useEffect, useRef, createContext, Suspense } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { FilterType } from './types.js';
import { DEFAULT_LOCATION } from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { supabase } from './supabase.js';
import { getRankData, getCurrencyInfo, normalizeNominatimResult, normalizeReverseGeocodeResult, normalizePubNameForComparison, isLondonPub, getMobileOS } from './utils.js';
import { initializeAnalytics, trackEvent } from './analytics.js';

import MobileLayout from './components/MobileLayout.jsx';
import DesktopLayout from './components/DesktopLayout.jsx';
import useIsDesktop from './hooks/useIsDesktop.js';

import ProfilePage from './components/ProfilePage.jsx';
import BannedPage from './components/BannedPage.jsx';
import AddPubModal from './components/AddPubModal.jsx';
import EditUsernameModal from './components/EditUsernameModal.jsx';
import EditBioModal from './components/EditBioModal.jsx';
import EditSocialsModal from './components/EditSocialsModal.jsx';
import UpdateDetailsModal from './components/UpdateDetailsModal.jsx';
import SuggestEditModal from './components/SuggestEditModal.jsx';
import CommunityPage from './components/CommunityPage.jsx';
import PubScoreExplanationModal from './components/PubScoreExplanationModal.jsx';
import CookieConsentBanner from './components/CookieConsentBanner.jsx';
import { OnlineStatusContext } from './contexts/OnlineStatusContext.jsx';
import { ExchangeRatesProvider } from './contexts/ExchangeRatesContext.jsx';
import AlertModal from './components/AlertModal.jsx';
import ShopPage from './components/ShopPage.jsx';
import CoasterWelcomeModal from './components/CoasterWelcomeModal.jsx';
import Confetti from 'react-confetti';
import ShareRatingModal from './components/ShareRatingModal.jsx';
import ShareModal from './components/ShareModal.jsx';
import ShareProfileModal from './components/ShareProfileModal.jsx';
import SharePostModal from './components/SharePostModal.jsx';
import TrophyUnlockedPopup from './components/TrophyUnlockedPopup.jsx';
import WelcomeModal from './components/WelcomeModal.jsx';
import PubCrawlPage from './components/PubCrawlPage.jsx';
import CrawlModePage from './components/CrawlModePage.jsx';
import ChangelogPage from './components/ChangelogPage.jsx';
import ChangelogManager from './components/ChangelogManager.jsx';
import CreatePostModal from './components/CreatePostModal.jsx';
import ConfirmationModal from './components/ConfirmationModal.jsx';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Geolocation } from '@capacitor/geolocation';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Set the Mapbox token globally. This is a robust way to ensure it's available.
const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (!mapboxToken) {
  throw new Error("VITE_MAPBOX_ACCESS_TOKEN is not set. Please add it to your .env.local file and restart the development server.");
}
mapboxgl.accessToken = mapboxToken;

const COLLAPSED_PANEL_HEIGHT = 56;

const App = () => {
  // --- STATE MANAGEMENT ---

  // Auth state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  // App state
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [pubs, setPubs] = useState([]);
  const [allRatings, setAllRatings] = useState(new Map());
  const [pubScores, setPubScores] = useState(new Map());
  const [selectedPubId, setSelectedPubId] = useState(null);
  const [highlightedRatingId, setHighlightedRatingId] = useState(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const [filter, setFilter] = useState(FilterType.Distance);
  const [filterGuinnessZero, setFilterGuinnessZero] = useState(false);
  const [panelHeight, setPanelHeight] = useState(() => window.innerHeight * 0.35);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [geocodingPubIds, setGeocodingPubIds] = useState(new Set());

  // Location State
  const [realUserLocation, setRealUserLocation] = useState(DEFAULT_LOCATION);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION); // This is for the blue dot on the map
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION); // The visual center of the map
  const [searchOrigin, setSearchOrigin] = useState(DEFAULT_LOCATION); // The center of the last search, used for sorting
  const [locationError, setLocationError] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('checking');
  const [resultsAreCapped, setResultsAreCapped] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);

  // Refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchOnNextMoveEnd, setSearchOnNextMoveEnd] = useState(false);

  const [settings, setSettings] = useState(loadSettings);

  const [activeTab, setActiveTab] = useState('map');
  const [userProfile, setUserProfile] = useState(null);
  const [userRatings, setUserRatings] = useState([]);
  const [communitySubTab, setCommunitySubTab] = useState('community');
  const [scrollToSection, setScrollToSection] = useState(null);

  // State for viewing other user profiles
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedRatings, setViewedRatings] = useState([]);
  const [viewedPosts, setViewedPosts] = useState([]);
  const [viewedTrophies, setViewedTrophies] = useState([]);
  const [isFetchingViewedProfile, setIsFetchingViewedProfile] = useState(false);
  const [profileViewOrigin, setProfileViewOrigin] = useState(null);

  // Popup states
  const [reviewPopupInfo, setReviewPopupInfo] = useState(null);
  const [updateConfirmationInfo, setUpdateConfirmationInfo] = useState(null);
  const [deleteConfirmationInfo, setDeleteConfirmationInfo] = useState(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState(null);
  const [rankUpInfo, setRankUpInfo] = useState(null);
  const [addPubSuccessInfo, setAddPubSuccessInfo] = useState(null);
  const [isPubScoreModalOpen, setIsPubScoreModalOpen] = useState(false);
  const [isEditUsernameModalOpen, setIsEditUsernameModalOpen] = useState(false);
  const [isEditBioModalOpen, setIsEditBioModalOpen] = useState(false);
  const [isEditSocialsModalOpen, setIsEditSocialsModalOpen] = useState(false);
  const [isUpdateDetailsModalOpen, setIsUpdateDetailsModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '', theme: 'info' });
  const [isCoasterWelcomeModalOpen, setIsCoasterWelcomeModalOpen] = useState(false);
  const [shareModalPub, setShareModalPub] = useState(null);
  const [shareProfileModalUser, setShareProfileModalUser] = useState(null);
  const [shareRatingModalRating, setShareRatingModalRating] = useState(null);
  const [sharePostModalPost, setSharePostModalPost] = useState(null);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isProfileStatsModalOpen, setIsProfileStatsModalOpen] = useState(false);
  
  const [levelRequirements, setLevelRequirements] = useState([]);
  
  const [dbPubs, setDbPubs] = useState([]);
  const [closedOsmPubIds, setClosedOsmPubIds] = useState(new Set());
  const [closedStoutlyPubIds, setClosedStoutlyPubIds] = useState(new Set());
  const [osmPubOverrides, setOsmPubOverrides] = useState(new Map());
  
  const [isDbPubsLoaded, setIsDbPubsLoaded] = useState(false);
  const [isClosedOsmPubsLoaded, setIsClosedOsmPubsLoaded] = useState(false);
  const [isClosedStoutlyPubsLoaded, setIsClosedStoutlyPubsLoaded] = useState(false);
  const [isOsmOverridesLoaded, setIsOsmOverridesLoaded] = useState(false);
  const [initialSearchComplete, setInitialSearchComplete] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  
  // State for legal & admin sub-pages
  const [legalPageView, setLegalPageView] = useState(null); // 'terms' or 'privacy'
  const [settingsSubView, setSettingsSubView] = useState(null); // 'moderation' or 'social'

  // PWA Install prompt state
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isIosInstallModalOpen, setIsIosInstallModalOpen] = useState(false);

  // Add Pub feature state
  const [isAddPubModalOpen, setIsAddPubModalOpen] = useState(false);
  const [pubPlacementState, setPubPlacementState] = useState(null);
  const [finalPlacementLocation, setFinalPlacementLocation] = useState(null);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);

  // "Suggest Edit" state
  const [isSuggestEditModalOpen, setIsSuggestEditModalOpen] = useState(false);
  const [pubToEdit, setPubToEdit] = useState(null);

  // Social Features State
  const [friendships, setFriendships] = useState([]);
  const [userLikes, setUserLikes] = useState(new Set());
  const [userZeroVotes, setUserZeroVotes] = useState(new Map());
  const [viewingFriendsOf, setViewingFriendsOf] = useState(null); // The user whose friends list is being viewed
  const [friendsList, setFriendsList] = useState([]); // The actual list of friends
  const [isFetchingFriendsList, setIsFetchingFriendsList] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [commentsByRating, setCommentsByRating] = useState(new Map());
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState(new Map());
  const [isPostCommentsLoading, setIsPostCommentsLoading] = useState(false);
  const [reportCommentInfo, setReportCommentInfo] = useState({ isOpen: false, comment: null });
  const [reportedComments, setReportedComments] = useState([]);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [createPostModalOrigin, setCreatePostModalOrigin] = useState(null);
  const [postToEdit, setPostToEdit] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [userPostLikes, setUserPostLikes] = useState(new Set());
  const [userPosts, setUserPosts] = useState([]);
  const [postSuccessCount, setPostSuccessCount] = useState(0);


  // Cookie Consent State - Initialize synchronously to avoid flicker
  const [cookieConsent, setCookieConsent] = useState(() =>
    Capacitor.isNativePlatform() ? 'granted' : localStorage.getItem('stoutly-cookie-consent')
  );

  // Online Presence State
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  // Confetti State
  const [confettiState, setConfettiState] = useState({ active: false, recycle: false, opacity: 0, key: null, numberOfPieces: 200, confettiSource: { x: 0, y: 0, w: 0, h: 0 } });
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Developer state
  const [showAllDbPubs, setShowAllDbPubs] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Pub Crawl Planner state
  const [isPubCrawlPlannerEnabled, setIsPubCrawlPlannerEnabled] = useState(() => {
    try {
      const storedValue = localStorage.getItem('stoutly-pub-crawl-enabled');
      return storedValue ? JSON.parse(storedValue) : false;
    } catch {
      return false;
    }
  });
  const [activeCrawl, setActiveCrawl] = useState(() => {
    try {
      const storedCrawl = localStorage.getItem('stoutly-active-crawl');
      return storedCrawl ? JSON.parse(storedCrawl) : null;
    } catch {
      return null;
    }
  });
  const [isCrawlModeActive, setIsCrawlModeActive] = useState(false);


  // Trophy State
  const [allTrophies, setAllTrophies] = useState([]);
  const [userTrophies, setUserTrophies] = useState([]);
  const [unlockedTrophiesToShow, setUnlockedTrophiesToShow] = useState([]);

  // Desktop layout state
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  
  // St. Paddy's Day Mode State
  const [systemFlags, setSystemFlags] = useState({});
  const [localStPaddysOverride, setLocalStPaddysOverride] = useState(false);

  // UI Visibility State (for scroll-to-hide)
  const [isAppHeaderVisible, setIsAppHeaderVisible] = useState(true);
  const [isNavShrunk, setIsNavShrunk] = useState(false);

  // Changelog state
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isChangelogManagerOpen, setIsChangelogManagerOpen] = useState(false);
  const [hasUnreadChangelog, setHasUnreadChangelog] = useState(false);
  const [latestChangelogItemId, setLatestChangelogItemId] = useState(null);

  const mapRef = useRef(null);
  const initialFlyToDone = useRef(false);
  const isRefreshingRef = useRef(false);
  const isInitialMountForRadius = useRef(true);

  const getBoundsFromRadius = (center, radiusInMeters) => {
    const lat = center.lat;
    const lng = center.lng;
    const earthRadius = 6371000; // in meters

    const latRad = (lat * Math.PI) / 180;

    const deltaLat = (radiusInMeters / earthRadius) * (180 / Math.PI);
    const deltaLng = (radiusInMeters / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);

    const south = lat - deltaLat;
    const north = lat + deltaLat;
    const west = lng - deltaLng;
    const east = lng + deltaLng;
    
    return { north, south, east, west };
  };

  const top10PubIds = useMemo(() => {
    if (!pubScores || pubScores.size === 0) {
        return [];
    }

    const sortedPubs = Array.from(pubScores.entries())
        .filter(([, score]) => score !== null && score !== undefined)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .slice(0, 10);
    
    return sortedPubs.map(([pubId]) => pubId);
  }, [pubScores]);

  // Memoized callback for closing the trophy popup to prevent timer resets.
  const handleCloseTrophyPopup = useCallback(() => {
    setUnlockedTrophiesToShow([]);
  }, []);

  const onFilterGuinnessZeroChange = (value) => setFilterGuinnessZero(value);


  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // --- HOOKS ---
  const isDesktop = useIsDesktop();
  const locationPermissionTracked = useRef(false);
  const didProcessUrlParams = useRef(false);
  const watchCallbackRef = useRef();
  
  const getFlyToPadding = useCallback(() => {
    if (isDesktop) {
      const sidebarWidth = isDesktopSidebarCollapsed ? 0 : 420;
      return { left: sidebarWidth };
    }
    const isPanelExpanded = panelHeight > COLLAPSED_PANEL_HEIGHT + 20;
    return { bottom: isPanelExpanded ? panelHeight : COLLAPSED_PANEL_HEIGHT };
  }, [isDesktop, isDesktopSidebarCollapsed, panelHeight]);


  // --- CORE HANDLERS (Define these early to avoid reference errors) ---

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
  };
  
  const handleMobileScroll = useCallback((isScrollingDown) => {
    if (!isDesktop) {
        setIsNavShrunk(isScrollingDown);
        // The main app header is now synced to the nav bar's shrink state
        setIsAppHeaderVisible(!isScrollingDown);
    }
  }, [isDesktop]);

  const handleCancelPubPlacement = useCallback(() => {
    trackEvent('add_pub_cancel', { step: pubPlacementState ? 'placement' : 'modal' });
    setIsAddPubModalOpen(false);
    setPubPlacementState(null);
    setFinalPlacementLocation(null);
    setIsConfirmingLocation(false);
  }, [pubPlacementState]);

  const handleOpenCreatePostModal = useCallback((options = {}) => {
    setCreatePostModalOrigin(options.origin || null);
    setIsCreatePostModalOpen(true);
  }, []);

  const handlePostModalSuccess = useCallback(() => {
    const successMessage = postToEdit ? 'Your post has been updated.' : 'Your post has been published.';
    setIsCreatePostModalOpen(false);
    setPostToEdit(null);
    setCreatePostModalOrigin(null);
    setPostSuccessCount(c => c + 1);
    setAlertInfo({ isOpen: true, title: 'Success!', message: successMessage, theme: 'success' });
  }, [postToEdit]);

  const handleClosePostModal = useCallback(() => {
    setIsCreatePostModalOpen(false);
    setPostToEdit(null);
    setCreatePostModalOrigin(null);
  }, []);
  
  const handleEditPost = (post) => {
    setPostToEdit(post);
    setIsCreatePostModalOpen(true);
  };

  const handleDeletePost = (post) => {
    setPostToDelete(post);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    try {
        // DB should have ON DELETE CASCADE for these, but this is safer.
        await supabase.from('post_comments').delete().eq('post_id', postToDelete.id);
        await supabase.from('post_likes').delete().eq('post_id', postToDelete.id);
        await supabase.from('post_pubs').delete().eq('post_id', postToDelete.id);
        const { error } = await supabase.from('posts').delete().eq('id', postToDelete.id);
        if (error) throw error;
        
        setAlertInfo({ isOpen: true, title: 'Deleted', message: 'Your post has been deleted.', theme: 'success' });
        setPostSuccessCount(c => c + 1); // Trigger re-fetch
    } catch(err) {
        console.error("Error deleting post:", err);
        setAlertInfo({ isOpen: true, title: 'Error', message: `Could not delete post: ${err.message}`, theme: 'error' });
    } finally {
        setPostToDelete(null);
    }
  };


  const handleTabChange = useCallback((tab, scrollTo) => {
    // On mobile, close the details panel when switching main tabs.
    if (!isDesktop) {
        setSelectedPubId(null);
    }

    // Cancel pub placement if user navigates away
    if (pubPlacementState) {
        handleCancelPubPlacement();
    }
    
    // When user explicitly changes tabs, reset all sub-view states
    setLegalPageView(null);
    setSettingsSubView(null);
    setViewingFriendsOf(null);
    setFriendsList([]);
    setViewedProfile(null);
    setViewedRatings([]);
    setViewedPosts([]);
    setViewedTrophies([]);
    setProfileViewOrigin(null);
    setIsChangelogOpen(false);
    setIsChangelogManagerOpen(false);

    // When the user explicitly clicks the Community tab, reset to the main feed.
    if (tab === 'community') {
        setCommunitySubTab('community');
    }

    // Tabs requiring auth
    if ((tab === 'profile' || tab === 'pub_crawl') && !session) {
      setIsAuthOpen(true);
      return;
    }
    // Tabs requiring ONLY developer role
    if ((tab === 'moderation' || tab === 'shop') && !userProfile?.is_developer) {
        setActiveTab('map'); // Fail silently to map
        return;
    }

    if (scrollTo) {
        setScrollToSection(scrollTo);
    }

    setActiveTab(tab);
  }, [isDesktop, pubPlacementState, session, userProfile, handleCancelPubPlacement]);

  const handleTogglePubCrawlPlanner = (enabled) => {
      localStorage.setItem('stoutly-pub-crawl-enabled', JSON.stringify(enabled));
      setIsPubCrawlPlannerEnabled(enabled);
      trackEvent('dev_toggle_pub_crawl', { enabled });
      // If the feature is disabled, navigate away from it if the user is currently on that tab.
      if (!enabled && activeTab === 'pub_crawl') {
          handleTabChange('map');
      }
  };
  
  const handleEnterCrawlMode = () => {
      trackEvent('enter_crawl_mode');
      setIsCrawlModeActive(true);
  };

  const handleExitCrawlMode = () => {
      trackEvent('exit_crawl_mode');
      setIsCrawlModeActive(false);
  };

  const handleStartCrawl = useCallback((crawl) => {
    trackEvent('start_pub_crawl', { crawl_id: crawl.id, stop_count: crawl.stops.length });

    // Pre-populate based on existing progress from the database
    const initiallyVisitedStops = crawl.stops.filter(stop => !!stop.visited_at).map(stop => stop.id);
    const initiallySkippedStops = crawl.stops.filter(stop => !!stop.skipped_at).map(stop => stop.id);

    const newActiveCrawl = {
        id: crawl.id,
        name: crawl.name,
        stops: crawl.stops, // Store the full stops array
        totalStops: crawl.stops.length,
        visitedStops: initiallyVisitedStops,
        skippedStops: initiallySkippedStops,
        start_location_lat: crawl.start_location_lat,
        start_location_lng: crawl.start_location_lng,
    };
    setActiveCrawl(newActiveCrawl);
    localStorage.setItem('stoutly-active-crawl', JSON.stringify(newActiveCrawl));
    handleEnterCrawlMode();
  }, [handleEnterCrawlMode]);

  const handleEndCrawl = useCallback(() => {
    if (activeCrawl) {
        trackEvent('end_pub_crawl', { crawl_id: activeCrawl.id, stops_visited: activeCrawl.visitedStops.length, stops_skipped: activeCrawl.skippedStops.length });
    }
    setActiveCrawl(null);
    localStorage.removeItem('stoutly-active-crawl');
    handleExitCrawlMode();
  }, [activeCrawl]);

  const handleReorderStops = useCallback(async (crawlId, reorderedStops) => {
    trackEvent('reorder_pub_crawl_stops', { crawl_id: crawlId });

    const updates = reorderedStops.map((stop, index) => 
        supabase
            .from('pub_crawl_stops')
            .update({ stop_order: index + 1 })
            .eq('id', stop.id)
    );

    try {
        const results = await Promise.all(updates);
        const error = results.find(res => res.error);
        if (error) throw error.error;
        
        setAlertInfo({
            isOpen: true,
            title: 'Success!',
            message: 'Your pub crawl route has been updated.',
            theme: 'success',
        });
        return true; // Indicate success
    } catch (err) {
        console.error("Error reordering stops:", err);
        setAlertInfo({
            isOpen: true,
            title: 'Update Failed',
            message: `Could not save the new route order: ${err.message}`,
            theme: 'error',
        });
        return false; // Indicate failure
    }
  }, [setAlertInfo]);

  const handleSelectPub = useCallback(async (pub, highlightOptions = {}) => {
    const { highlightRatingId: ratingId, highlightCommentId: commentId } = highlightOptions;
    const pubId = pub ? pub.id : null;
    
    setHighlightedRatingId(ratingId || null);
    setHighlightedCommentId(commentId || null);

    if (pubId && pubId !== selectedPubId) {
        history.pushState({ view: 'pub', pubId }, '');
    }

    if (!pubId) {
      setSelectedPubId(null);
      return;
    }

    let pubToSelect = pub;
    const isPubInCurrentList = pubs.some(p => p.id === pubId);

    // If the pub isn't in our current list (e.g., from a feed), fetch its full details.
    if (!isPubInCurrentList) {
        // The pub object might be partial, so we fetch the full record.
        const { data: fetchedPubData, error } = await supabase
            .from('pubs')
            .select('id, name, address, lat, lng, country_code, country_name, is_closed, guinness_zero_confirmations, guinness_zero_denials, certification_status, certified_since')
            .eq('id', pubId)
            .single();

        if (error) {
            console.error(`Error fetching details for pub ${pubId}:`, error);
            setAlertInfo({
                isOpen: true,
                title: 'Error Loading Pub',
                message: `Could not load the details for this pub. It may have been deleted.`,
                theme: 'error',
            });
            return;
        }

        if (fetchedPubData) {
            // Normalize the fetched data into the format the app expects.
            const formattedPub = {
                ...fetchedPubData,
                location: { lat: fetchedPubData.lat, lng: fetchedPubData.lng },
            };
            
            // Add the fetched pub to the source-of-truth list (`dbPubs`). This will trigger
            // the useEffect that computes the main `pubs` list, making the pub available.
            setDbPubs(currentDbPubs => {
                if (currentDbPubs.some(p => p.id === pubId)) {
                    return currentDbPubs; // Avoid duplicates
                }
                return [...currentDbPubs, formattedPub];
            });

            pubToSelect = formattedPub;
        }
    }

    setSelectedPubId(pubId);
    setActiveTab('map');
    if (pubToSelect?.location && mapRef.current) {
        mapRef.current.flyTo({
            center: [pubToSelect.location.lng, pubToSelect.location.lat],
            zoom: 16,
            duration: 2500,
            padding: getFlyToPadding(),
        });
    }

    if (!isPubInCurrentList && pubToSelect?.location) {
        setSearchOrigin(pubToSelect.location);
        setSearchOnNextMoveEnd(true);
    }
  }, [isDesktop, pubs, selectedPubId, setAlertInfo, getFlyToPadding]);

  const handleViewProfile = useCallback(async (userId, origin) => {
    if (!userId) return;
    // Special case: If user clicks their own profile, use handleTabChange to ensure a clean reset to their own view.
    if (userProfile && userId === userProfile.id) {
        handleTabChange('profile');
        return;
    }
    
    trackEvent('view_profile', { viewed_user_id: userId, origin: origin || 'unknown' });
    
    // We must hide the Friends List page before we can show the Profile page.
    setViewingFriendsOf(null);
    setFriendsList([]);
    
    setIsFetchingViewedProfile(true);
    // Clear the old viewed profile to show a loading state
    setViewedProfile(null); 
    setViewedRatings([]);
    setViewedPosts([]);
    setViewedTrophies([]);
    setProfileViewOrigin(origin); // store where the view was initiated from

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;
        
        // Robustly fetch the friend count for the viewed profile
        const { data: friendCountValue, error: friendCountError } = await supabase.rpc('get_friends_count', { user_id_param: userId }).single();

        if (friendCountError) {
            // PGRST116 means "Not a single row". This can happen for anon users where RLS returns nothing. Treat as 0.
            if (friendCountError.code === 'PGRST116') {
                profile.friends_count = 0;
            } else {
                console.error("Error fetching friend count for viewed profile:", friendCountError);
                profile.friends_count = 0; // Default to 0 on other errors.
            }
        } else {
             // Handle cases where the RPC returns a value directly, or a row object.
            const count = (typeof friendCountValue === 'number') 
                ? friendCountValue 
                : (friendCountValue?.count ?? friendCountValue?.get_friends_count ?? 0);
            profile.friends_count = parseInt(count, 10) || 0;
        }

        setViewedProfile(profile);

        // Fetch trophies for the viewed user
        const { data: trophies, error: trophiesError } = await supabase
            .from('user_trophies')
            .select('trophy_id, achieved_at')
            .eq('user_id', userId)
            .order('achieved_at', { ascending: false });
        
        if (trophiesError) {
            console.error("Error fetching trophies for viewed profile:", trophiesError);
        } else {
            setViewedTrophies(trophies || []);
        }

        // Fetch posts for the viewed user
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*, user:user_id!inner(id, username, avatar_id, level, is_banned), attached_pubs:post_pubs(pub_id, pub:pubs(id, name, address, lat, lng))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (postsError) {
            console.error("Error fetching posts for viewed profile:", postsError);
        } else {
            setViewedPosts(posts || []);
        }

        // Fetch ratings for the viewed user
        // We only fetch non-private ratings for other users.
        const { data: ratings, error: ratingsError } = await supabase
            .from('ratings')
            .select('id, pub_id, price, quality, created_at, updated_at, exact_price, image_url, is_private, message, pubs(id, name, address, lat, lng, country_code, country_name)')
            .eq('user_id', userId)
            .eq('is_private', false) // Important: respect privacy
            .order('created_at', { ascending: false });

        if (ratingsError) throw ratingsError;

        const mappedRatings = (ratings || []).map(r => ({
            id: r.id, pubId: r.pub_id,
            rating: { price: r.price, quality: r.quality, exact_price: r.exact_price, message: r.message },
            timestamp: new Date(r.created_at).getTime(),
            created_at: r.created_at,
            updated_at: r.updated_at,
            pubName: r.pubs?.name || 'Unknown',
            pubAddress: r.pubs?.address || 'Unknown',
            pubLocation: r.pubs && r.pubs.lat && r.pubs.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
            image_url: r.image_url,
            is_private: r.is_private,
            pubCountryCode: r.pubs?.country_code,
            pubCountryName: r.pubs?.country_name,
        }));
        setViewedRatings(mappedRatings);
        
        // This is the key. The profile page is shown when the 'profile' tab is active.
        // We set this directly to avoid `handleTabChange` which would clear `viewedProfile`.
        setActiveTab('profile');

    } catch (error) {
        console.error("Error fetching viewed profile:", error);
        alert(`Could not load profile: ${error.message}`);
        setViewedProfile(null); // Clear on error
    } finally {
        setIsFetchingViewedProfile(false);
    }
  }, [userProfile, handleTabChange]);

  const handleToggleCrawlStop = useCallback(async (stopId, pubId) => {
    if (!activeCrawl) return;

    const isVisited = activeCrawl.visitedStops.includes(stopId);
    let newVisitedStops = activeCrawl.visitedStops;
    let newSkippedStops = activeCrawl.skippedStops.filter(id => id !== stopId);

    if (isVisited) {
        newVisitedStops = newVisitedStops.filter(id => id !== stopId);
    } else {
        newVisitedStops = [...newVisitedStops, stopId];
    }

    const updatedCrawl = { ...activeCrawl, visitedStops: newVisitedStops, skippedStops: newSkippedStops };
    setActiveCrawl(updatedCrawl);
    localStorage.setItem('stoutly-active-crawl', JSON.stringify(updatedCrawl));

    const { error } = await supabase
        .from('pub_crawl_stops')
        .update({
            visited_at: isVisited ? null : new Date().toISOString(),
            skipped_at: null, // Always clear skipped when toggling visited status
        })
        .eq('id', stopId);

    if (error) {
        console.error("Error updating crawl stop status:", error);
    }
  }, [activeCrawl]);

  const handleSkipCrawlStop = useCallback(async (stopId) => {
    if (!activeCrawl) return;

    trackEvent('skip_crawl_stop', { crawl_id: activeCrawl.id, stop_id: stopId });

    const newSkippedStops = [...activeCrawl.skippedStops, stopId];
    const newVisitedStops = activeCrawl.visitedStops.filter(id => id !== stopId);
    
    const updatedCrawl = { ...activeCrawl, visitedStops: newVisitedStops, skippedStops: newSkippedStops };
    setActiveCrawl(updatedCrawl);
    localStorage.setItem('stoutly-active-crawl', JSON.stringify(updatedCrawl));

    const { error } = await supabase
        .from('pub_crawl_stops')
        .update({
            skipped_at: new Date().toISOString(),
            visited_at: null,
        })
        .eq('id', stopId);

    if (error) {
        console.error("Error skipping crawl stop:", error);
    }
  }, [activeCrawl]);
  
  const handleBackFromProfileView = useCallback(() => {
    setViewedProfile(null);
    const origin = profileViewOrigin;
    setProfileViewOrigin(null);

    // This logic handles returning to the correct sub-tab in the community section
    if (origin === 'leaderboard' || origin === 'friends' || origin === 'notifications' || origin === 'community') {
        setCommunitySubTab(origin);
        setActiveTab('community');
    } else if (origin && origin.startsWith('community')) {
        // Fallback for any other community-related origin
        setActiveTab('community');
    }
    // Other origins like 'pubDetails' do not trigger a tab change, which is correct.
  }, [profileViewOrigin]);

  const handleBackFromFriendsList = useCallback(() => {
    setViewingFriendsOf(null);
    if (isDesktop) {
        setActiveTab('profile');
    }
  }, [isDesktop]);

  // --- ANALYTICS & CONSENT ---
  
  useEffect(() => {
    // This effect runs once on mount. If consent was already granted (either
    // on native, or from a previous session on web), initialize analytics.
    if (cookieConsent === 'granted') {
      initializeAnalytics();
    }
  }, []); // Empty dependency array ensures this runs only once.

  const handleAcceptCookies = () => {
    localStorage.setItem('stoutly-cookie-consent', 'granted');
    setCookieConsent('granted');
    // Initialize analytics here when consent is explicitly given for the first time.
    initializeAnalytics(); 
    trackEvent('cookie_consent_change', { consent_status: 'granted' });
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('stoutly-cookie-consent', 'denied');
    setCookieConsent('denied');
    trackEvent('cookie_consent_change', { consent_status: 'denied' });
  };

  // More specific screen view tracking
  useEffect(() => {
    let screenName = activeTab;
    const screenClass = 'StoutlyApp';

    if (viewingFriendsOf) {
      screenName = 'friends_list';
    } else if (legalPageView) {
      screenName = `legal_${legalPageView}`; // e.g., legal_terms
    } else if (settingsSubView) {
        screenName = `settings_${settingsSubView}`;
    } else if (isChangelogOpen) {
        screenName = 'changelog';
    } else if (isChangelogManagerOpen) {
        screenName = 'changelog_manager';
    } else if (viewedProfile && (!userProfile || viewedProfile.id !== userProfile.id)) {
      screenName = 'profile_other_user';
    } else if (activeTab === 'profile' && userProfile) {
      screenName = 'profile_own';
    } else if (activeTab === 'community') {
      screenName = `community_${communitySubTab}`;
    } else if (activeTab === 'shop') {
        screenName = 'shop';
    } else if (activeTab === 'pub_crawl') {
        screenName = 'pub_crawl_planner';
    } else if (isAuthOpen) {
      screenName = 'auth';
    } else if (isPasswordRecovery) {
      screenName = 'password_recovery';
    } else if (pubPlacementState) {
      screenName = 'add_pub_placement';
    } else if (isCreatePostModalOpen || postToEdit) {
        screenName = 'create_edit_post';
    }

    trackEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass, // GA4 standard parameter
    });
  }, [activeTab, communitySubTab, legalPageView, viewedProfile, userProfile, isAuthOpen, isPasswordRecovery, pubPlacementState, viewingFriendsOf, settingsSubView, isChangelogOpen, isChangelogManagerOpen, isCreatePostModalOpen, postToEdit]);


  useEffect(() => {
    const pub = pubs.find(p => p.id === selectedPubId);
    if (pub) {
      trackEvent('select_content', { content_type: 'pub', item_id: pub.id });
    }
  }, [selectedPubId, pubs]);


  // --- DATA FETCHING & AUTH ---
  
  const fetchNominatimPois = useCallback(async (searchCenter, radius) => {
    if (!mapRef.current) {
        setMapSearchResults([]);
        return;
    }

    const { north, south, east, west } = getBoundsFromRadius(searchCenter, radius);
    const bbox = `${west},${north},${east},${south}`;
    const categories = ['pub', 'bar', 'brewery'];
    const userAgent = 'Stoutly/1.0 (https://www.stoutly.co.uk)';

    try {
        const promises = categories.map(category => {
            const url = `https://nominatim.openstreetmap.org/search?q=${category}&format=jsonv2&viewbox=${bbox}&bounded=1&limit=50&addressdetails=1`;
            return fetch(url, { headers: { 'User-Agent': userAgent } }).then(res => {
                if (!res.ok) {
                    console.error(`Nominatim search for '${category}' failed with status: ${res.status}`);
                    return [];
                }
                return res.json();
            });
        });

        const responses = await Promise.all(promises);
        const allResults = responses.flat();

        const uniqueResults = Array.from(new Map(allResults.map(res => [res.osm_id, res])).values());
        
        const results = uniqueResults.map(normalizeNominatimResult).filter(Boolean);

        setMapSearchResults(results || []);
        setResultsAreCapped(uniqueResults.length >= 140);

    } catch (error) {
        console.error("Nominatim POI search failed:", error);
        setMapSearchResults([]);
        setResultsAreCapped(false);
    }
  }, []);

  const fetchDbPubs = useCallback(async (searchCenter, radius) => {
    if (!searchCenter) {
        setDbPubs([]);
        setIsDbPubsLoaded(true);
        return;
    }

    const { data: pubsData, error: rpcError } = await supabase.rpc('get_pubs_in_radius', {
      lat_param: searchCenter.lat,
      lng_param: searchCenter.lng,
      radius_meters: Math.round(radius), // Fix: ensure radius is an integer for the RPC.
      limit_count: 500
    });

    if (rpcError) {
      console.error("Error fetching rated pubs from DB via RPC:", rpcError);
      setDbPubs([]);
      setIsDbPubsLoaded(true);
      throw rpcError;
    }

    const formatted = (pubsData || []).map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      country_code: p.country_code,
      country_name: p.country_name,
      is_closed: !!p.is_closed,
      location: { lat: p.lat, lng: p.lng },
      is_dynamic_price_area: p.is_dynamic_price_area,
      area_identifier: p.area_identifier,
      area_rating_count: p.area_rating_count,
      guinness_zero_confirmations: p.guinness_zero_confirmations,
      guinness_zero_denials: p.guinness_zero_denials,
      certification_status: p.certification_status,
      certified_since: p.certified_since,
    }));

    setDbPubs(formatted);
    setIsDbPubsLoaded(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current || !mapRef.current) return;
    
    isRefreshingRef.current = true;
    setShowSearchAreaButton(false);
    trackEvent('refresh_pubs');
    setIsRefreshing(true);

    const map = mapRef.current;
    const searchCenter = map.getCenter();
    setSearchOrigin({ lat: searchCenter.lat, lng: searchCenter.lng });
    
    try {
        await Promise.all([
            fetchNominatimPois({ lat: searchCenter.lat, lng: searchCenter.lng }, settings.radius),
            fetchDbPubs({ lat: searchCenter.lat, lng: searchCenter.lng }, settings.radius)
        ]);
    } catch (error) {
        console.error("Error during pub data refresh:", error);
        setAlertInfo({ isOpen: true, title: 'Error Refreshing', message: 'Could not load pub data. Please check your connection.', theme: 'error' });
        setInitialSearchComplete(true);
        setIsRefreshing(false);
        isRefreshingRef.current = false;
    }
  }, [fetchNominatimPois, fetchDbPubs, settings.radius, setAlertInfo]);


  useEffect(() => {
    // This effect runs once when loading is complete to handle initial routing from URL params.
    if (loading || didProcessUrlParams.current) {
      return;
    }
    
    didProcessUrlParams.current = true;
    const urlParams = new URLSearchParams(window.location.search);
    const pageFromUrl = urlParams.get('page');
    const pubIdFromUrl = urlParams.get('pub_id');
    const userIdFromUrl = urlParams.get('user_id');
    const ratingIdFromUrl = urlParams.get('rating_id');
    const commentIdFromUrl = urlParams.get('comment_id');
    const postIdFromUrl = urlParams.get('post_id');
    const utmSource = urlParams.get('utm_source');

    if (utmSource === 'coaster') {
      const hasSeenCoasterWelcome = localStorage.getItem('stoutly-coaster-welcome-seen');
      if (hasSeenCoasterWelcome !== 'true') {
        setIsCoasterWelcomeModalOpen(true);
        trackEvent('view_coaster_welcome_modal');
      }
    }

    if (pageFromUrl === 'terms' || pageFromUrl === 'privacy') {
      handleViewLegal(pageFromUrl);
    } else if (pubIdFromUrl) {
      const highlightOptions = {
        highlightRatingId: ratingIdFromUrl,
        highlightCommentId: commentIdFromUrl,
      };
      handleSelectPub({ id: pubIdFromUrl }, highlightOptions);
    } else if (userIdFromUrl) {
      handleViewProfile(userIdFromUrl, 'shared_link');
    } else if (postIdFromUrl) {
        handleTabChange('community');
        setHighlightedPostId(postIdFromUrl);
    }
  }, [loading, handleSelectPub, handleViewProfile, handleTabChange]);

  useEffect(() => {
    // Listen for the custom event fired from index.tsx
    const handleInstallPrompt = (e) => {
      setInstallPromptEvent(e.detail);
    };
    window.addEventListener('pwa-install-prompt-ready', handleInstallPrompt);

    return () => {
      window.removeEventListener('pwa-install-prompt-ready', handleInstallPrompt);
    };
  }, []);

  // One-time welcome modal for native Android users
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
            const hasSeenWelcome = localStorage.getItem('stoutly-welcome-seen');
            if (!hasSeenWelcome) {
                setIsWelcomeModalOpen(true);
                trackEvent('view_welcome_modal');
            }
        }
    }
  }, []);

  // Real-time user presence tracking
  useEffect(() => {
    if (!session?.user) {
      setOnlineUserIds(new Set()); // Clear online users on logout
      return;
    }

    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const userIds = Object.keys(presenceState);
        setOnlineUserIds(new Set(userIds));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUserIds(prevUserIds => {
          const newUserIds = new Set(prevUserIds);
          newPresences.forEach(p => newUserIds.add(p.key));
          return newUserIds;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUserIds(prevUserIds => {
          const newUserIds = new Set(prevUserIds);
          leftPresences.forEach(p => newUserIds.delete(p.key));
          return newUserIds;
        });
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Confetti lifecycle management
  useEffect(() => {
    if (confettiState.active) {
        // After 3 seconds, stop recycling so particles start to fall away.
        const recycleTimer = setTimeout(() => {
            setConfettiState(prev => ({ ...prev, recycle: false }));
        }, 3000);

        // After 4 seconds, start fading out the canvas.
        const fadeTimer = setTimeout(() => {
            setConfettiState(prev => ({ ...prev, opacity: 0 }));
        }, 4000);

        // After 6 seconds (fade duration is 2s), deactivate confetti completely.
        const cleanupTimer = setTimeout(() => {
            setConfettiState(prev => ({ ...prev, active: false, key: null }));
        }, 6000);

        return () => {
            clearTimeout(recycleTimer);
            clearTimeout(fadeTimer);
            clearTimeout(cleanupTimer);
        };
    }
  }, [confettiState.key]);

  // Check for new changelog items
  useEffect(() => {
    const checkChangelog = async () => {
      try {
        const { data, error } = await supabase
          .from('changelog_items')
          .select('id')
          .eq('is_published', true)
          .order('release_date', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
          throw error;
        }

        if (data) {
          setLatestChangelogItemId(data.id);
          const lastSeenId = localStorage.getItem('stoutly-last-seen-changelog-id');
          if (data.id !== lastSeenId) {
            setHasUnreadChangelog(true);
          }
        }
      } catch (err) {
        console.error("Error checking for new changelog:", err);
      }
    };
    checkChangelog();
  }, []);

  const fetchClosedOsmPubs = useCallback(async () => {
    const { data, error } = await supabase
      .from('closed_osm_pubs')
      .select('osm_id');
    
    if (error) {
        console.error("Error fetching closed OSM pubs:", error);
    } else {
        // Store with 'osm-' prefix for direct comparison with nominatim results
        setClosedOsmPubIds(new Set((data || []).map(p => `osm-${p.osm_id}`)));
    }
    setIsClosedOsmPubsLoaded(true);
  }, []);

  const fetchClosedStoutlyPubs = useCallback(async () => {
    const { data, error } = await supabase
      .from('pubs')
      .select('id')
      .eq('is_closed', true);
    
    if (error) {
        console.error("Error fetching closed Stoutly pubs:", error);
    } else {
        setClosedStoutlyPubIds(new Set((data || []).map(p => p.id)));
    }
    setIsClosedStoutlyPubsLoaded(true);
  }, []);

  const fetchOsmPubOverrides = useCallback(async () => {
    const { data, error } = await supabase
        .from('osm_pub_overrides')
        .select('osm_id, name');
    
    if (error) {
        console.error("Error fetching OSM pub overrides:", error);
    } else {
        const overridesMap = new Map();
        for (const override of data || []) {
            // Store with 'osm-' prefix for direct comparison
            overridesMap.set(`osm-${override.osm_id}`, { name: override.name });
        }
        setOsmPubOverrides(overridesMap);
    }
    setIsOsmOverridesLoaded(true);
  }, []);

  const fetchAllRatings = useCallback(async () => {
    // This robust, two-query approach avoids complex RLS-related JOIN issues on the backend.
    
    // Step 1: Fetch all public ratings without joining profile data yet.
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('id, pub_id, user_id, price, quality, created_at, updated_at, exact_price, image_url, like_count, comment_count, message')
      .eq('is_private', false)
      .order('updated_at', { ascending: false });
  
    if (ratingsError) {
      console.error("Critical error fetching ratings:", ratingsError);
      return;
    }
  
    // Step 2: Fetch all user profiles. The RLS policy on profiles allows public reads (`USING (true)`).
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_id, level, is_banned');
  
    if (profilesError) {
      console.error("Critical error fetching profiles:", profilesError);
      return;
    }
  
    // Create a lookup map for efficient access to profiles.
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
  
    // Step 3: Join the data on the client side.
    const ratingsMap = new Map();
    for (const rating of ratingsData || []) {
      const user = profilesMap.get(rating.user_id);
  
      // This check replicates the security logic from the database RLS policy:
      // only show ratings from users who exist and are not banned.
      if (!user || user.is_banned) {
        continue;
      }
      
      // Re-nest the user object into the rating, as the rest of the app expects this structure.
      const ratingWithUser = { ...rating, user };
      
      const existing = ratingsMap.get(rating.pub_id) || [];
      ratingsMap.set(rating.pub_id, [...existing, ratingWithUser]);
    }
  
    setAllRatings(ratingsMap);
  }, []);

  const fetchPubScores = useCallback(async () => {
    const { data, error } = await supabase.from('pub_scores').select('*');
    if (error) {
        console.error("Error fetching pub scores:", error);
        return;
    }
    const scoresMap = new Map();
    for (const score of data || []) {
        scoresMap.set(score.pub_id, score.pub_score);
    }
    setPubScores(scoresMap);
  }, []);
  
  const fetchUserZeroVotes = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('pub_guinness_zero_reports')
      .select('pub_id, is_confirmation')
      .eq('user_id', userId);
    
    if (error) {
        console.error("Error fetching user's Guinness 0.0 votes:", error);
        return;
    }

    const votesMap = new Map();
    (data || []).forEach(vote => {
        votesMap.set(vote.pub_id, vote.is_confirmation);
    });
    setUserZeroVotes(votesMap);
  }, []);

  const fetchUserTrophies = useCallback(async (userId) => {
    if (!userId) {
        setUserTrophies([]);
        return [];
    }
    const { data, error } = await supabase
        .from('user_trophies')
        .select('trophy_id, achieved_at')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching user trophies:", error);
        setUserTrophies([]);
        return [];
    } else {
        setUserTrophies(data || []);
        return data || [];
    }
  }, []);

  const fetchSocialData = useCallback(async (userId) => {
    if (!userId) return;
    
    // Fetch user's rating likes
    const { data: likesData, error: likesError } = await supabase
      .from('rating_likes')
      .select('rating_id')
      .eq('user_id', userId);
    if (likesError) console.error("Error fetching user rating likes:", likesError);
    else setUserLikes(new Set((likesData || []).map(l => l.rating_id)));

    // Fetch user's post likes
    const { data: postLikesData, error: postLikesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);
    if (postLikesError) console.error("Error fetching user post likes:", postLikesError);
    else setUserPostLikes(new Set((postLikesData || []).map(l => l.post_id)));

    // Fetch user's friendships
    const { data: friendsData, error: friendsError } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
    if (friendsError) console.error("Error fetching friendships:", friendsError);
    else setFriendships(friendsData || []);

    // Fetch notifications
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(id, username, avatar_id)')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    if (notificationsError) console.error("Error fetching notifications:", notificationsError);
    else setNotifications(notificationsData || []);
    
    // Fetch user's 0.0 votes
    await fetchUserZeroVotes(userId);

    // Fetch user's trophies
    await fetchUserTrophies(userId);

  }, [fetchUserZeroVotes, fetchUserTrophies]);

  const handleDataRefresh = useCallback(async () => {
      await Promise.all([
          fetchAllRatings(),
          fetchPubScores(),
          fetchClosedOsmPubs(),
          fetchOsmPubOverrides(),
          fetchClosedStoutlyPubs(),
          session?.user?.id ? fetchSocialData(session.user.id) : Promise.resolve(),
      ]);
      // Refetch DB pubs for the current view
      if (mapRef.current) {
        const searchCenter = mapRef.current.getCenter();
        await fetchDbPubs({ lat: searchCenter.lat, lng: searchCenter.lng }, settings.radius);
      }
  }, [fetchAllRatings, fetchPubScores, fetchClosedOsmPubs, fetchOsmPubOverrides, fetchClosedStoutlyPubs, fetchSocialData, session, fetchDbPubs, settings.radius]);

  // --- HISTORY MANAGEMENT ---
  useEffect(() => {
    const handlePopState = (event) => {
      // This is a "back" action. We close the topmost view based on precedence.
      if (viewingFriendsOf) {
        handleBackFromFriendsList();
      } else if (viewedProfile) {
        handleBackFromProfileView();
      } else if (selectedPubId) {
        setSelectedPubId(null);
      } else if (legalPageView) {
        setLegalPageView(null);
      } else if (settingsSubView) {
        setSettingsSubView(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set an initial state so there's an entry to pop.
    history.replaceState({ base: true }, '');

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedPubId, viewedProfile, viewingFriendsOf, legalPageView, settingsSubView, handleBackFromProfileView, handleBackFromFriendsList]);

  // Native Android back button handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener;
    const addListener = async () => {
      listener = await CapacitorApp.addListener('backButton', () => {
        if (isCreatePostModalOpen || postToEdit) {
            handleClosePostModal();
            return;
        }
        if (isProfileStatsModalOpen) {
          setIsProfileStatsModalOpen(false);
          return;
        }
        if (viewingFriendsOf) {
          handleBackFromFriendsList();
          return;
        }
        if (viewedProfile) {
          handleBackFromProfileView();
          return;
        }
        if (selectedPubId) {
          setSelectedPubId(null);
          return;
        }
        if (legalPageView || settingsSubView || isChangelogOpen || isChangelogManagerOpen) {
          setLegalPageView(null);
          setSettingsSubView(null);
          setIsChangelogOpen(false);
          setIsChangelogManagerOpen(false);
          return;
        }
        if (activeTab !== 'map') {
          handleTabChange('map');
          return;
        }
        // If no state was handled, allow the default behavior (exiting the app).
      });
    };
    addListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [
    activeTab,
    selectedPubId,
    viewedProfile,
    viewingFriendsOf,
    legalPageView,
    settingsSubView,
    isChangelogOpen,
    isChangelogManagerOpen,
    handleTabChange,
    handleBackFromProfileView,
    handleBackFromFriendsList,
    isProfileStatsModalOpen,
    isCreatePostModalOpen,
    postToEdit,
    handleClosePostModal,
  ]);
  
  const handleOpenShareRatingModal = useCallback((rating) => {
    // The rating object is now always pre-enriched by the caller (e.g., RatingCard).
    setShareRatingModalRating(rating);
  }, []);
  
  const fetchAllTrophies = async () => {
    const { data, error } = await supabase
        .from('trophies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
    
    if (error) {
        console.error("Failed to fetch trophies:", error);
    } else {
        setAllTrophies(data);
    }
  };

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
    });
    
    fetchAllRatings();
    fetchPubScores();
    fetchLevelRequirements();
    fetchClosedOsmPubs();
    fetchOsmPubOverrides();
    fetchClosedStoutlyPubs();
    fetchAllTrophies();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'SIGNED_IN') {
          trackEvent('login', { method: 'email' });
          setIsPasswordRecovery(false);
        }
        if (_event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        setSession(session);
        if (session) {
            setIsAuthOpen(false);
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const page = urlParams.get('page');

            // Don't reset to map view if user is trying to access a legal page directly
            if (page !== 'terms' && page !== 'privacy') {
              setActiveTab('map');
            }
            
            setViewedProfile(null);
            setViewedPosts([]);
            setFriendships([]);
            setUserLikes(new Set());
            setUserPostLikes(new Set());
            setUserPosts([]);
            setUserZeroVotes(new Map());
            setUserTrophies([]);
        }
    });

    return () => subscription.unsubscribe();
  }, [fetchAllRatings, fetchPubScores, fetchClosedOsmPubs, fetchOsmPubOverrides, fetchClosedStoutlyPubs]);
  
  // Real-time listener for comment count updates.
  useEffect(() => {
    const channel = supabase
        .channel('public:comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
            let ratingId;
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                ratingId = payload.new.rating_id;
            } else if (payload.eventType === 'DELETE') {
                ratingId = payload.old.rating_id;
            }

            if (ratingId) {
                // The DB trigger has already updated the count. We just need to fetch it.
                const { data: updatedRating, error } = await supabase
                    .from('ratings')
                    .select('id, pub_id, comment_count')
                    .eq('id', ratingId)
                    .single();
                
                if (error) {
                    console.error('Error refetching rating on comment change:', error);
                    return;
                }
                
                // Update the rating in the allRatings map to ensure UI consistency
                setAllRatings(prevRatings => {
                    const newRatings = new Map(prevRatings);
                    const pubRatings = newRatings.get(updatedRating.pub_id);
                    if (pubRatings) {
                        const ratingIndex = pubRatings.findIndex(r => r.id === ratingId);
                        if (ratingIndex > -1) {
                            const newPubRatings = [...pubRatings];
                            // Merge updated count into the existing client-side rating object
                            newPubRatings[ratingIndex] = { ...newPubRatings[ratingIndex], comment_count: updatedRating.comment_count };
                            newRatings.set(updatedRating.pub_id, newPubRatings);
                            return newRatings;
                        }
                    }
                    return prevRatings; // No change if rating not found in map
                });
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);
  
  // Simplified, direct notification handler
  const handleNewNotification = useCallback(async (payload) => {
    const newNotification = payload.new;

    // The new backend trigger prevents duplicates, so we can process directly.
    // We just need to enrich the notification with the actor's profile data.
    let actorProfile = { id: newNotification.actor_id, username: 'A user', avatar_id: null };
    if (newNotification.actor_id) {
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_id').eq('id', newNotification.actor_id).single();
      if (!error && data) actorProfile = data;
    }
    const enrichedNotification = { ...newNotification, actor: actorProfile };
    
    setNotifications(prev => {
      // Basic check to prevent re-adding if the websocket sends the same event twice.
      if (prev.some(n => n.id === enrichedNotification.id)) {
        return prev;
      }
      setToastNotification(enrichedNotification);
      return [enrichedNotification, ...prev];
    });
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        handleNewNotification
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleNewNotification]);

  const handleToastClick = () => {
    trackEvent('notification_toast_clicked');
    handleTabChange('community');
    setCommunitySubTab('notifications');
    setToastNotification(null); // Dismiss the toast
  };

  const fetchLevelRequirements = async () => {
    const { data, error } = await supabase
        .from('level_requirements')
        .select('level, total_ratings_required')
        .order('level', { ascending: true });
    
    if (error) {
        console.error("Failed to fetch level requirements:", error);
    } else {
        setLevelRequirements(data);
    }
  };
  
  const fetchUserData = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
        setUserProfile(null);
        setUserRatings([]);
        setUserPosts([]);
        return { profile: null, ratings: [], posts: [] };
    }

    const userId = currentSession.user.id;

    // Fetch user profile and friend count in parallel
    const [profileResult, friendCountResult] = await Promise.all([
        supabase.from('profiles').select('*, accepts_marketing, has_donated').eq('id', userId).single(),
        supabase.rpc('get_friends_count', { user_id_param: userId }).single()
    ]);

    const { data: profile, error: profileError } = profileResult;
    if (profileError) {
        console.error("Error fetching profile:", profileError);
        if (profileError.code === 'PGRST116') {
            console.error("CRITICAL: Profile not found for logged-in user. The 'handle_new_user' DB trigger may be missing or failing.");
        }
        setUserProfile(null);
        setUserRatings([]);
        setUserPosts([]);
        return { profile: null, ratings: [], posts: [] };
    }
    
    if (profile?.is_banned) {
        setUserProfile(profile);
        setUserRatings([]);
        setUserPosts([]);
        return { profile, ratings: [], posts: [] };
    }

    // Add friend count to the profile object
    const { data: friendCountValue, error: friendCountError } = friendCountResult;
    if (friendCountError) {
        if (friendCountError.code === 'PGRST116') { // "Not a single row"
            profile.friends_count = 0;
        } else {
            console.error("Error fetching friend count:", friendCountError);
            profile.friends_count = 0;
        }
    } else {
        const count = (typeof friendCountValue === 'number') 
            ? friendCountValue 
            : (friendCountValue?.count ?? friendCountValue?.get_friends_count ?? 0);
        profile.friends_count = parseInt(count, 10) || 0;
    }

    // FIX: Merge last_sign_in_at from the session user object.
    // This property exists on auth.users, not the public profiles table.
    if (currentSession.user) {
        profile.last_sign_in_at = currentSession.user.last_sign_in_at;
    }

    setUserProfile(profile);

    // If profile exists, fetch ratings and posts in parallel.
    const [ratingsResult, postsResult] = await Promise.all([
      supabase
        .from('ratings')
        .select('id, pub_id, price, quality, created_at, updated_at, exact_price, image_url, is_private, message, pubs(id, name, address, lat, lng, country_code, country_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('*, user:user_id!inner(id, username, avatar_id, level, is_banned), attached_pubs:post_pubs(pub_id, pub:pubs(id, name, address, lat, lng))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    const { data: userRatingsData, error: ratingsError } = ratingsResult;
    let mappedUserRatings = [];
    if (ratingsError) {
        console.error("Error fetching user ratings:", ratingsError);
    } else {
        mappedUserRatings = (userRatingsData || []).map(r => ({
          id: r.id, pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality, exact_price: r.exact_price, message: r.message },
          timestamp: new Date(r.created_at).getTime(),
          created_at: r.created_at,
          updated_at: r.updated_at,
          pubName: r.pubs?.name || 'Unknown',
          pubAddress: r.pubs?.address || 'Unknown',
          pubLocation: r.pubs && r.pubs.lat && r.pubs.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
          image_url: r.image_url,
          is_private: r.is_private || false,
          pubCountryCode: r.pubs?.country_code,
          pubCountryName: r.pubs?.country_name,
        }));
    }
    setUserRatings(mappedUserRatings);

    const { data: userPostsData, error: postsError } = postsResult;
    let mappedUserPosts = [];
    if (postsError) {
      console.error("Error fetching user posts:", postsError);
    } else {
      mappedUserPosts = userPostsData || [];
    }
    setUserPosts(mappedUserPosts);
    
    return { profile, ratings: mappedUserRatings, posts: mappedUserPosts };
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
      fetchSocialData(session.user.id);
    } else {
      setUserProfile(null);
      setUserRatings([]);
      setUserPosts([]);
      setFriendships([]);
      setUserLikes(new Set());
      setUserPostLikes(new Set());
      setUserZeroVotes(new Map());
    }
  }, [session, fetchSocialData]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);


  // --- CORE APP LOGIC & HANDLERS ---

  const handleBackfillCountryData = useCallback(async () => {
    if (isBackfilling) return;
    setIsBackfilling(true);
    trackEvent('dev_backfill_country_data_start');
    try {
        const { data, error } = await supabase.functions.invoke('backfill-country-data');
        if (error) throw new Error(error.message);

        setAlertInfo({
            isOpen: true,
            title: 'Backfill Complete',
            message: data.message || 'The backfill process completed successfully.',
            theme: 'success',
        });
        trackEvent('dev_backfill_country_data_success', { result_message: data.message });
        await handleDataRefresh();
    } catch (err) {
        console.error("Backfill error:", err);
        setAlertInfo({
            isOpen: true,
            title: 'Backfill Failed',
            message: `An error occurred: ${err.message}`,
            theme: 'error',
        });
        trackEvent('dev_backfill_country_data_failed', { error_message: err.message });
    } finally {
        setIsBackfilling(false);
    }
  }, [isBackfilling, handleDataRefresh]);


  const handleDonationSuccess = useCallback(async (previouslyHadTrophy) => {
    trackEvent('donation_success_client');
    setConfettiState({
        active: true,
        recycle: true,
        opacity: 1,
        key: crypto.randomUUID(),
        numberOfPieces: 500,
        confettiSource: { x: 0, y: 0, w: windowSize.width, h: 0 },
    });
    // These calls will update the state for the rest of the app
    await handleDataRefresh();
    const { profile: newProfile } = await fetchUserData();

    // Now, show the correct modal. We need the freshest trophy data.
    if (newProfile) { // Check if user is logged in
      const newTrophies = await fetchUserTrophies(newProfile.id);
      const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';
      const nowHasTrophy = newTrophies.some(t => t.trophy_id === PATRON_TROPHY_ID);

      if (nowHasTrophy && !previouslyHadTrophy) {
          setAlertInfo({
              isOpen: true,
              title: 'Trophy Unlocked!',
              message: "You've unlocked the 'Stoutly Patron' trophy! Thank you so much for your donation and for supporting the development of Stoutly.",
              theme: 'success',
              customIcon: 'fa-hand-holding-heart',
          });
      } else {
          setAlertInfo({
              isOpen: true,
              title: 'Thank You!',
              message: "Your continued support means the world. Thank you for your donation and for helping us keep Stoutly running and ad-free. Cheers!",
              theme: 'success',
          });
      }
    } else { // Anonymous donation
       setAlertInfo({
          isOpen: true,
          title: 'Thank You!',
          message: "Your generous support helps keep Stoutly running and ad-free. Cheers!",
          theme: 'success',
      });
    }
  }, [handleDataRefresh, fetchUserData, fetchUserTrophies, setAlertInfo, windowSize]);

  const handleTestTrophyPopup = useCallback(() => {
    trackEvent('dev_test_trophy_popup');

    if (allTrophies.length === 0) {
      setAlertInfo({
        isOpen: true,
        title: 'No Trophies Loaded',
        message: 'Trophy data hasn\'t been loaded yet. Cannot display a test popup.',
        theme: 'info',
      });
      return;
    }
    
    // Use the first 2 trophies for the test, or just one if that's all there is.
    const trophiesToTest = allTrophies.slice(0, 2);

    setUnlockedTrophiesToShow(trophiesToTest);
    setConfettiState({
        active: true,
        recycle: true,
        opacity: 1,
        key: crypto.randomUUID(),
        numberOfPieces: 350,
        confettiSource: { x: 0, y: 0, w: windowSize.width, h: 0 },
    });
  }, [allTrophies, setAlertInfo, windowSize]);

  const handleTestDonationPopup = useCallback((scenario) => {
    trackEvent('dev_test_donation_popup', { scenario });

    setConfettiState({
        active: true,
        recycle: true,
        opacity: 1,
        key: crypto.randomUUID(),
        numberOfPieces: 500,
        confettiSource: { x: 0, y: 0, w: windowSize.width, h: 0 },
    });

    if (scenario === 'new_trophy') {
      setAlertInfo({
          isOpen: true,
          title: 'Trophy Unlocked!',
          message: "You've unlocked the 'Stoutly Patron' trophy! Thank you so much for your donation and for supporting the development of Stoutly.",
          theme: 'success',
          customIcon: 'fa-hand-holding-heart',
      });
    } else { // 'repeat_donation'
      setAlertInfo({
          isOpen: true,
          title: 'Thank You!',
          message: "Your continued support means the world. Thank you for your donation and for helping us keep Stoutly running and ad-free. Cheers!",
          theme: 'success',
      });
    }
  }, [setAlertInfo, windowSize]);

  const handleChangePassword = async () => {
    if (!session?.user?.email) {
        setAlertInfo({ isOpen: true, title: 'Error', message: 'Could not find your user email.', theme: 'error' });
        return;
    }

    setIsChangingPassword(true);
    trackEvent('request_password_change');

    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: window.location.origin,
    });

    if (error) {
        setAlertInfo({ isOpen: true, title: 'Error', message: error.message, theme: 'error' });
    } else {
        setAlertInfo({
            isOpen: true,
            title: 'Check Your Email',
            message: 'A password reset link has been sent to your email address.',
            theme: 'success',
        });
    }
    setIsChangingPassword(false);
  };

  // Save settings to local storage whenever they change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Effect to automatically refresh pubs when the search radius setting changes.
  useEffect(() => {
    // Prevent this effect from running on the initial render.
    if (isInitialMountForRadius.current) {
        isInitialMountForRadius.current = false;
        // On initial load, just track the value without triggering a refresh.
        trackEvent('change_setting', { setting_name: 'radius', value: settings.radius });
        return;
    }

    // Debounce the refresh to avoid excessive API calls while the user is sliding.
    const debounceTimer = setTimeout(() => {
        trackEvent('change_setting', { setting_name: 'radius', value: settings.radius });
        // Ensure the map is loaded before trying to refresh, as a refresh relies on map center.
        if (mapRef.current) {
            handleRefresh();
        }
    }, 500); // 500ms delay

    // Cleanup the timer if the radius changes again before the timeout.
    return () => clearTimeout(debounceTimer);
  }, [settings.radius, handleRefresh]);


  const handleSearchAfterMove = useCallback(() => {
    // This function is called by the Map component after a 'flyTo' animation ends.
    if (searchOnNextMoveEnd) {
        handleRefresh();
        setSearchOnNextMoveEnd(false);
    }
  }, [searchOnNextMoveEnd, handleRefresh]);

  const handleSearchThisArea = useCallback(() => {
      trackEvent('click_search_this_area');
      handleRefresh();
  }, [handleRefresh]);

  const handleFindPlace = useCallback((location) => {
    if (location?.lat && location?.lng && mapRef.current) {
        mapRef.current.flyTo({
            center: [location.lng, location.lat],
            zoom: 15,
            duration: 3000,
            padding: getFlyToPadding(),
        });
        setSearchOnNextMoveEnd(true); 
    }
  }, [getFlyToPadding]);

  const handleRequestPermission = useCallback(async (trigger = 'manual') => {
    trackEvent('location_permission_requested', { trigger });
    const isNative = Capacitor.isNativePlatform();

    const getPositionAndSetState = async () => {
        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
        });
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocationPermissionStatus('granted');
        setLocationError(null);
        setRealUserLocation(newLocation);
    };

    try {
        if (isNative) {
            const permissions = await Geolocation.requestPermissions();
            if (permissions.location !== 'granted') {
                throw new Error('Permission denied');
            }
        }
        await getPositionAndSetState();
        trackEvent('location_permission_result', { status: 'granted' });
    } catch (error) {
        console.error("Error requesting location permissions:", error);
        trackEvent('location_permission_result', { status: 'error', error_message: error.message });
        const message = error.code === 1 || error.message === 'Permission denied' 
            ? "Location access was denied." 
            : "Could not request location access. Please check your device settings.";
        setLocationPermissionStatus('denied');
        setLocationError(message);
    }
  }, []);


  // Consolidated app initialization and location permission logic
  useEffect(() => {
    const initializeApp = async () => {
      const isNative = Capacitor.isNativePlatform();

      const urlParams = new URLSearchParams(window.location.search);
      const pubIdFromUrl = urlParams.get('pub_id');
      const postIdFromUrl = urlParams.get('post_id');

      if ((pubIdFromUrl || postIdFromUrl) && !initialLocationSet) {
        setInitialLocationSet(true);
        return; 
      }
      
      let permissionState = 'prompt';
      try {
        const permissionStatus = await Geolocation.checkPermissions();
        permissionState = permissionStatus.location || permissionStatus.public || 'prompt';
        
        // For web, navigator.permissions gives more detailed state changes
        if (!isNative && navigator.permissions) {
            const webPermission = await navigator.permissions.query({ name: 'geolocation' });
            permissionState = webPermission.state;
            webPermission.onchange = () => {
                setLocationPermissionStatus(webPermission.state);
            };
        }
      } catch (e) {
        console.warn("Could not query geolocation permissions. This is normal in some browsers.", e);
      }

      setLocationPermissionStatus(permissionState);

      if (permissionState === 'granted' && !initialLocationSet) {
        try {
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
            const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            setRealUserLocation(newLocation);
            setSearchOrigin(newLocation);
            setInitialLocationSet(true);
        } catch (error) {
            console.error("Error getting location despite granted permission:", error);
            setLocationError("Could not get your location. Please check signal or try again.");
            setInitialLocationSet(true); // Mark as set to avoid re-triggering
        }
      } else if (permissionState === 'prompt' && !initialLocationSet) {
          await handleRequestPermission('auto_initial_load');
          setInitialLocationSet(true);
      } else if (permissionState === 'denied' && !initialLocationSet) {
          setLocationError("Location access denied.");
          setInitialLocationSet(true);
      } else {
          setInitialLocationSet(true); // If already set or none of the above, ensure we mark it
      }
    };

    initializeApp();
  }, [initialLocationSet, handleRequestPermission]);

  const handleFindCurrentPub = useCallback(() => {
    if (locationPermissionStatus === 'granted' && realUserLocation && (realUserLocation.lat !== DEFAULT_LOCATION.lat || realUserLocation.lng !== DEFAULT_LOCATION.lng)) {
        trackEvent('recenter_map');
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [realUserLocation.lng, realUserLocation.lat],
                zoom: 15,
                duration: 3000,
                padding: getFlyToPadding(),
            });
            setSearchOnNextMoveEnd(true);
        }
    } else {
        handleRequestPermission();
    }
  }, [realUserLocation, locationPermissionStatus, handleRequestPermission, getFlyToPadding]);

  // Popup visibility timers
  useEffect(() => { if (reviewPopupInfo) { const timer = setTimeout(() => setReviewPopupInfo(null), 3000); return () => clearTimeout(timer); } }, [reviewPopupInfo]);
  useEffect(() => { if (updateConfirmationInfo) { const timer = setTimeout(() => setUpdateConfirmationInfo(null), 3000); return () => clearTimeout(timer); } }, [updateConfirmationInfo]);
  useEffect(() => { if (deleteConfirmationInfo) { const timer = setTimeout(() => setDeleteConfirmationInfo(null), 3000); return () => clearTimeout(timer); } }, [deleteConfirmationInfo]);
  useEffect(() => { if (leveledUpInfo) { const timer = setTimeout(() => setLeveledUpInfo(null), 4000); return () => clearTimeout(timer); } }, [leveledUpInfo]);
  useEffect(() => { if (rankUpInfo) { const timer = setTimeout(() => setRankUpInfo(null), 5000); return () => clearTimeout(timer); } }, [rankUpInfo]);
  useEffect(() => { if (addPubSuccessInfo) { const timer = setTimeout(() => setAddPubSuccessInfo(null), 3000); return () => clearTimeout(timer); } }, [addPubSuccessInfo]);

  const getDistance = useCallback((location1, location2) => {
    if (!location1 || !location2) return Infinity;
    const R = 6371e3;
    const φ1 = location1.lat * Math.PI/180;
    const φ2 = location2.lat * Math.PI/180;
    const Δφ = (location2.lat-location1.lat) * Math.PI/180;
    const Δλ = (location2.lng-location1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in meters
  }, []);

  useEffect(() => {
    // Wait until all foundational data from our DB is loaded before attempting to merge.
    if (!isDbPubsLoaded || !isClosedOsmPubsLoaded || !isOsmOverridesLoaded || !isClosedStoutlyPubsLoaded) {
      return; // Exit early if data isn't ready
    }

    let pubsToFilter;

    if (showAllDbPubs) {
      // DEV MODE: Unfiltered list of all pubs from our DB for debugging.
      pubsToFilter = dbPubs.map(pub => ({
        ...pub,
        is_closed: !!pub.is_closed || closedOsmPubIds.has(pub.id) || closedStoutlyPubIds.has(pub.id),
      }));
    } else {
      // NORMAL MODE: Combine sources for a comprehensive list, prioritizing our DB.
      const processedPubs = new Map();

      // 1. Add all pubs from our DB first. This is the source of truth for existence, name, address, and closed status.
      dbPubs.forEach(dbPub => {
        const override = osmPubOverrides.get(dbPub.id);
        processedPubs.set(dbPub.id, {
          ...dbPub,
          name: override?.name || dbPub.name,
          is_closed: !!dbPub.is_closed || closedOsmPubIds.has(dbPub.id) || closedStoutlyPubIds.has(dbPub.id),
        });
      });

      // 2. Merge with Mapbox results.
      mapSearchResults.forEach(mapboxPub => {
        const override = osmPubOverrides.get(mapboxPub.id);
        const finalMapboxName = override?.name || mapboxPub.name;
        
        // This logic was flawed. Now, we only check for duplicates against the initial DB pubs.
        // This ensures external data always loads in areas without existing Stoutly pubs.
        const isSpatialDuplicateWithDb = dbPubs.some(dbPub => {
            if (!mapboxPub.location || !dbPub.location) return false;
            const dist = getDistance(mapboxPub.location, dbPub.location);
            if (dist > 50) return false; // 50 meters
            
            const normMapboxName = normalizePubNameForComparison(finalMapboxName);
            const normDbName = normalizePubNameForComparison(dbPub.name);
            return normMapboxName && normDbName && normMapboxName === normDbName;
        });

        if (!isSpatialDuplicateWithDb) {
            // If it's not a duplicate of a DB pub, we should add it.
            // We also check if we've already added this mapbox pub to avoid duplicates from Mapbox's side.
            if (!processedPubs.has(mapboxPub.id)) {
                processedPubs.set(mapboxPub.id, {
                    ...mapboxPub,
                    name: finalMapboxName,
                    is_closed: closedOsmPubIds.has(mapboxPub.id) || closedStoutlyPubIds.has(mapboxPub.id),
                });
            }
        }
      });
      
      pubsToFilter = Array.from(processedPubs.values());
    }

    // 3. Filter out any pubs that are outside the current search radius.
    // This handles discrepancies from bounding-box searches.
    const radiusFilteredPubs = pubsToFilter.filter(pub => {
        if (!pub.location || !searchOrigin) return false; // Should not happen but safe guard.
        return getDistance(pub.location, searchOrigin) <= settings.radius;
    });

    // 4. Attach ratings and scores to the final list of pubs to be displayed.
    const finalPubsList = radiusFilteredPubs.map(pub => ({
      ...pub,
      ratings: allRatings.get(pub.id) || [],
      pub_score: pubScores.get(pub.id) ?? null,
    }));

    setPubs(finalPubsList);
    
    // This is now the single point of truth for ending a refresh successfully.
    if (isRefreshingRef.current) {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
    }
    
    if (!initialSearchComplete) {
        setInitialSearchComplete(true);
    }

  }, [showAllDbPubs, mapSearchResults, dbPubs, allRatings, pubScores, searchOrigin, getDistance, closedOsmPubIds, closedStoutlyPubIds, osmPubOverrides, normalizePubNameForComparison, isDbPubsLoaded, isClosedOsmPubsLoaded, isOsmOverridesLoaded, isClosedStoutlyPubsLoaded, settings.radius]);

  // This effect will run after pubs are loaded and look for any without an address
  useEffect(() => {
    const reverseGeocodePub = async (pub) => {
        try {
            const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${pub.location.lng},${pub.location.lat}.json?access_token=${accessToken}&limit=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('API response not OK');
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const newAddress = normalizeReverseGeocodeResult(data.features[0]);
                if (newAddress && newAddress !== 'Address unknown') {
                    setPubs(currentPubs =>
                        currentPubs.map(p =>
                            p.id === pub.id ? { ...p, address: newAddress } : p
                        )
                    );
                }
            }
        } catch (error) {
            console.error(`Reverse geocoding failed for pub ${pub.id}:`, error);
        } finally {
            // Remove from geocoding state regardless of success or failure to prevent retries
            setGeocodingPubIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(pub.id);
                return newSet;
            });
        }
    };
    
    const pubsToGeocode = pubs.filter(p =>
        (!p.address || p.address === 'Address unknown') &&
        p.location?.lat &&
        p.location?.lng &&
        !geocodingPubIds.has(p.id)
    );

    if (pubsToGeocode.length > 0) {
        setGeocodingPubIds(prev => {
            const newSet = new Set(prev);
            pubsToGeocode.forEach(p => newSet.add(p.id));
            return newSet;
        });

        // Stagger API calls to respect rate limits
        pubsToGeocode.forEach((pub, index) => {
            setTimeout(() => {
                reverseGeocodePub(pub);
            }, index * 200); // Mapbox has higher rate limits than Nominatim
        });
    }
}, [pubs, geocodingPubIds]);

  const selectedPub = useMemo(() => pubs.find(p => p.id === selectedPubId) || null, [pubs, selectedPubId]);
  
  const existingUserRatingForSelectedPub = useMemo(() => {
    if (!selectedPub) return undefined;
    return userRatings.find(r => r.pubId === selectedPub.id);
  }, [selectedPub, userRatings]);

  const getAverageRating = useCallback((ratings, key) => {
    if (!ratings || ratings.length === 0) return 0;
    const total = ratings.reduce((acc, r) => acc + r[key], 0);
    return total / ratings.length;
  }, []);

  // This effect keeps the callback in the ref up-to-date with the latest state values.
  useEffect(() => {
    watchCallbackRef.current = (position, error) => {
        if (error) {
            // This now uses the correct, up-to-date `realUserLocation` value from the closure of this effect.
            if (realUserLocation === DEFAULT_LOCATION || error.code === 1) { // code 1 is PERMISSION_DENIED
                const message = error.code === 1 ? "Location access was revoked." : "Could not get your location.";
                setLocationError(message);
            }
            
            if (error.code === 1) { // PERMISSION_DENIED
                setLocationPermissionStatus('denied');
            }
            return;
        }
        if (position) {
             if (!locationPermissionTracked.current) {
                trackEvent('location_permission_result', { status: 'granted' });
                locationPermissionTracked.current = true;
            }
            const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            setRealUserLocation(newLocation);
            setLocationError(null);
        }
    };
  }); // No dependency array, runs on every render to keep callback fresh.

  useEffect(() => {
    let watcherId = null;

    if (locationPermissionStatus === 'granted') {
        // The callback now just calls the function stored in the ref.
        const watchCallback = (position, error) => {
            if (watchCallbackRef.current) {
                watchCallbackRef.current(position, error);
            }
        };

        (async () => {
            try {
                watcherId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, watchCallback);
            } catch(e) {
                console.error("Failed to start location watcher:", e);
            }
        })();
    }
    
    return () => {
        if (watcherId) {
            Geolocation.clearWatch({ id: watcherId });
        }
    };
  }, [locationPermissionStatus]); // Correct dependency array. No more loop.

  // This effect simply ensures the blue dot for the user's location is always up-to-date.
  // The logic for centering the map and initiating a search has been moved.
  useEffect(() => {
      setUserLocation(realUserLocation);
  }, [realUserLocation]);
  
  // This new effect handles the initial map centering with correct padding
  useEffect(() => {
      if (mapRef.current && !initialFlyToDone.current && realUserLocation && realUserLocation.lat !== DEFAULT_LOCATION.lat) {
          mapRef.current.flyTo({
              center: [realUserLocation.lng, realUserLocation.lat],
              zoom: 14,
              duration: 2500, // A nice smooth animation for the user
              padding: getFlyToPadding(),
          });
          initialFlyToDone.current = true;
          // This will trigger handleRefresh after the map moves to the user's location.
          setSearchOnNextMoveEnd(true);
      }
  }, [realUserLocation, getFlyToPadding]);
  
  const handleMapMove = useCallback((viewState) => {
    const newCenter = { lat: viewState.latitude, lng: viewState.longitude };
    setMapCenter(newCenter);
    
    // If in placement mode, allow map movement without cancelling the flow or showing other buttons.
    if (pubPlacementState) {
        return;
    }
    
    const distance = getDistance(newCenter, searchOrigin);
    if (distance > settings.radius * 0.25) { // Show if map has moved 25% of radius
      setShowSearchAreaButton(true);
    }
  }, [searchOrigin, getDistance, pubPlacementState, settings.radius]);

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const getComparablePrice = useCallback((pub) => {
      if (!pub?.ratings?.length) return 999;
      const ratingsWithExactPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
      if (ratingsWithExactPrice.length > 0) {
          return ratingsWithExactPrice.reduce((acc, r) => acc + r.exact_price, 0) / ratingsWithExactPrice.length;
      }
      
      const avgStarRating = getAverageRating(pub.ratings, 'price');
      const isLondonNonDynamic = isLondonPub(pub) && !pub.is_dynamic_price_area;

      if (avgStarRating === 0) return 999;

      if (isLondonNonDynamic) {
          if (avgStarRating > 4.5) return 5.50;  // < 6.00
          if (avgStarRating > 3.5) return 6.37;  // 6.00 - 6.74
          if (avgStarRating > 2.5) return 7.12;  // 6.75 - 7.49
          if (avgStarRating > 1.5) return 8.00;  // 7.50 - 8.49
          return 9.00;  // > 8.49
      }

      // Original logic
      if (avgStarRating > 4.5) return 4.25; if (avgStarRating > 3.5) return 5.00;
      if (avgStarRating > 2.5) return 5.75; if (avgStarRating > 1.5) return 6.50;
      return 7.50;
  }, [getAverageRating]);

  const sortedPubs = useMemo(() => {
    let pubsToProcess = [...pubs];

    if (filterGuinnessZero) {
        pubsToProcess = pubsToProcess.filter(pub => 
            (pub.guinness_zero_confirmations || 0) > (pub.guinness_zero_denials || 0)
        );
    }

    return pubsToProcess.sort((a, b) => {
      if (a.is_closed && !b.is_closed) return 1;
      if (!a.is_closed && b.is_closed) return -1;
      switch (filter) {
        case FilterType.PubScore:
          return (b.pub_score ?? -1) - (a.pub_score ?? -1);
        case FilterType.Price: return getComparablePrice(a) - getComparablePrice(b);
        case FilterType.Quality: return getAverageRating(b.ratings, 'quality') - getAverageRating(a.ratings, 'quality');
        default: return getDistance(a.location, searchOrigin) - getDistance(b.location, searchOrigin);
      }
    });
  }, [pubs, filter, filterGuinnessZero, searchOrigin, getDistance, getComparablePrice, getAverageRating]);

  const refreshSinglePubAndUserVotes = useCallback(async (pubId, userId) => {
    await fetchUserZeroVotes(userId);
    
    const { data: updatedPubData, error: pubFetchError } = await supabase
        .from('pubs')
        .select('id, name, address, lat, lng, country_code, country_name, is_closed, guinness_zero_confirmations, guinness_zero_denials, certification_status, certified_since')
        .eq('id', pubId)
        .single();

    if (pubFetchError) {
        console.error(`Error fetching updated data for pub ${pubId}:`, pubFetchError);
        await handleDataRefresh();
        return;
    }

    const formattedPub = {
        ...updatedPubData,
        location: { lat: updatedPubData.lat, lng: updatedPubData.lng },
    };

    setPubs(currentPubs => {
        const index = currentPubs.findIndex(p => p.id === pubId);
        if (index > -1) {
            const newPubs = [...currentPubs];
            newPubs[index] = { ...currentPubs[index], ...formattedPub };
            return newPubs;
        }
        return [...currentPubs, { ...formattedPub, ratings: [], pub_score: null }];
    });

    setDbPubs(currentDbPubs => {
        const index = currentDbPubs.findIndex(p => p.id === pubId);
        if (index > -1) {
            const newDbPubs = [...currentDbPubs];
            newDbPubs[index] = { ...currentDbPubs[index], ...formattedPub };
            return newDbPubs;
        }
        return [...currentDbPubs, formattedPub];
    });
  }, [fetchUserZeroVotes, handleDataRefresh]);

  const handleRatePub = useCallback(async (pubId, pubName, pubAddress, ratingData) => {
    if (!session || !userProfile || !selectedPub) return;
    setIsSubmittingRating(true);
    const trophiesBefore = new Set(userTrophies.map(t => t.trophy_id));

    try {
        const { imageFile, imageWasRemoved, guinnessZeroStatus, is_private, price, quality, exact_price, message } = ratingData;
        
        await supabase.from('pubs').upsert({
          id: pubId, name: pubName, address: pubAddress,
          lat: selectedPub.location.lat, lng: selectedPub.location.lng,
          country_code: selectedPub.country_code, country_name: selectedPub.country_name,
        });

        const existingRating = userRatings.find(r => r.pubId === pubId);
        const isUpdating = !!existingRating;
        const currencyInfo = getCurrencyInfo(selectedPub);

        trackEvent('rate_pub', {
            pub_id: pubId, is_update: isUpdating, quality: quality, price_rating: price,
            has_exact_price: !!exact_price, has_image: !!imageFile, has_message: !!message,
            is_private: is_private, value: exact_price || 0, currency: currencyInfo.code,
        });
        
        let imageUrl = existingRating?.image_url || null;
        if (imageWasRemoved) {
            imageUrl = null;
        }
        if (isUpdating && imageUrl && (imageWasRemoved || imageFile)) {
            try {
                const imagePath = new URL(imageUrl).pathname.split('/pint-images/')[1];
                if (imagePath) await supabase.storage.from('pint-images').remove([imagePath]);
            } catch (error) { console.error("Failed to delete old image:", error); }
        }
        
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('pint-images').upload(fileName, imageFile, { upsert: true });
            if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}.`);
            imageUrl = supabase.storage.from('pint-images').getPublicUrl(fileName).data.publicUrl;
        }

        const ratingPayload = { 
            pub_id: pubId, user_id: session.user.id, price, quality, exact_price, is_private, image_url: imageUrl, message,
        };
        const { error: dbError } = isUpdating
          ? await supabase.from('ratings').update(ratingPayload).eq('pub_id', pubId).eq('user_id', session.user.id)
          : await supabase.from('ratings').insert(ratingPayload);
        
        if (dbError) throw dbError;
        
        if (guinnessZeroStatus && guinnessZeroStatus !== 'unknown') {
            await supabase.rpc('report_guinness_zero_status', {
                p_pub_id: pubId,
                p_is_confirmation: guinnessZeroStatus === 'confirm',
            });
        }
        
        // More robust, sequential refresh to prevent race conditions
        await Promise.all([ fetchAllRatings(), fetchPubScores() ]);
        await refreshSinglePubAndUserVotes(pubId, session.user.id);
        
        const oldLevel = userProfile?.level;
        const { profile: newProfile } = await fetchUserData();

        // Check for newly unlocked trophies
        const newTrophies = await fetchUserTrophies(session.user.id);
        const justUnlocked = newTrophies.filter(t => !trophiesBefore.has(t.trophy_id));

        if (justUnlocked.length > 0) {
            const unlockedDetails = justUnlocked
                .map(ut => allTrophies.find(at => at.id === ut.trophy_id))
                .filter(Boolean);
            
            if (unlockedDetails.length > 0) {
                setUnlockedTrophiesToShow(unlockedDetails);
                // Trigger confetti once for the batch of new trophies
                setConfettiState({
                    active: true,
                    recycle: true,
                    opacity: 1,
                    key: crypto.randomUUID(),
                    numberOfPieces: 350,
                    confettiSource: { x: 0, y: 0, w: windowSize.width, h: 0 },
                });
            }
        }

        if (!isUpdating) {
            if (newProfile?.level > oldLevel) {
                const oldRank = getRankData(oldLevel);
                const newRank = getRankData(newProfile.level);
                if (newRank.name !== oldRank.name) {
                    setRankUpInfo({ key: crypto.randomUUID(), newRank });
                    trackEvent('rank_up', { new_rank: newRank.name, level: newProfile.level });
                } else {
                    setLeveledUpInfo({ key: crypto.randomUUID(), newLevel: newProfile.level });
                    trackEvent('level_up', { level: newProfile.level });
                }
            }
            setReviewPopupInfo({ key: crypto.randomUUID() });
        } else {
            setUpdateConfirmationInfo({ key: crypto.randomUUID() });
        }
        
    } catch (error) {
        console.error("Error submitting rating:", error);
        setAlertInfo({
            isOpen: true, title: 'Submission Failed',
            message: `There was a problem submitting your rating. Error: ${error.message}`,
            theme: 'error',
        });
    } finally {
        setIsSubmittingRating(false);
    }
  }, [session, userRatings, selectedPub, userProfile, fetchUserData, fetchAllRatings, fetchPubScores, refreshSinglePubAndUserVotes, userTrophies, fetchUserTrophies, allTrophies, windowSize]);
  
  const handleGuinnessZeroVote = useCallback(async (pubId, isConfirmation) => {
    if (!session) {
        setIsAuthOpen(true);
        return;
    }
    trackEvent('vote_guinness_zero', { pub_id: pubId, vote: isConfirmation ? 'confirm' : 'deny' });
    
    if (userZeroVotes.get(pubId) === isConfirmation) return;

    const pubToUpsert = pubs.find(p => p.id === pubId);
    if (!pubToUpsert) {
        console.error("Cannot vote on a pub that doesn't exist in the current view.");
        return;
    }
    
    const { error: upsertError } = await supabase.from('pubs').upsert({
        id: pubToUpsert.id, name: pubToUpsert.name, address: pubToUpsert.address,
        lat: pubToUpsert.location.lat, lng: pubToUpsert.location.lng,
        country_code: pubToUpsert.country_code, country_name: pubToUpsert.country_name,
    });
    if (upsertError) {
        console.error("Error upserting pub before vote:", upsertError);
        setAlertInfo({ isOpen: true, title: 'Action Failed', message: `Could not save pub info: ${upsertError.message}`, theme: 'error' });
        return;
    }
    
    const { error } = await supabase.rpc('report_guinness_zero_status', {
        p_pub_id: pubId, p_is_confirmation: isConfirmation,
    });
    
    if (error) {
        console.error("Error voting on Guinness 0.0 status:", error);
        setAlertInfo({ isOpen: true, title: 'Vote Failed', message: `Your vote could not be saved: ${error.message}`, theme: 'error' });
    } else {
        await refreshSinglePubAndUserVotes(pubId, session.user.id);
    }
  }, [session, userZeroVotes, pubs, refreshSinglePubAndUserVotes]);

  const handleClearGuinnessZeroVote = useCallback(async (pubId) => {
    if (!session) {
        setIsAuthOpen(true);
        return;
    }
    trackEvent('clear_vote_guinness_zero', { pub_id: pubId });

    if (userZeroVotes.get(pubId) === undefined) return;

    const { error } = await supabase.rpc('clear_guinness_zero_status', { p_pub_id: pubId });

    if (error) {
        console.error("Error clearing Guinness 0.0 vote:", error);
        setAlertInfo({ isOpen: true, title: 'Action Failed', message: `Your vote could not be cleared: ${error.message}`, theme: 'error' });
    } else {
        await refreshSinglePubAndUserVotes(pubId, session.user.id);
    }
  }, [session, userZeroVotes, refreshSinglePubAndUserVotes]);

  const handleDeleteRating = useCallback(async (ratingToDelete) => {
    if (!session || !userProfile || !ratingToDelete) return;

    const ratingInUserRatings = userRatings.find(r => r.id === ratingToDelete.id);
    if (!ratingInUserRatings) {
        console.error("Attempted to delete a rating that does not belong to the current user.");
        return;
    }

    trackEvent('delete_rating', { rating_id: ratingToDelete.id, pub_id: ratingToDelete.pubId });

    // Store original state for potential rollback on error
    const originalUserRatings = userRatings;
    const originalAllRatings = allRatings;
    const originalUserProfile = userProfile;

    // --- Start Optimistic Updates ---
    // 1. Remove from user's ratings list
    setUserRatings(prev => prev.filter(r => r.id !== ratingToDelete.id));

    // 2. Remove from global ratings map
    setAllRatings(prev => {
        const newMap = new Map(prev);
        const pubRatings = newMap.get(ratingToDelete.pubId);
        if (pubRatings) {
            newMap.set(ratingToDelete.pubId, pubRatings.filter(r => r.id !== ratingToDelete.id));
        }
        return newMap;
    });

    // 3. Decrement review count in profile
    setUserProfile(prev => ({ ...prev, reviews: Math.max(0, (prev.reviews || 1) - 1) }));
    // --- End optimistic updates ---

    try {
        // Perform the actual deletions in the background.
        // 1. If there's an image, delete it from storage first.
        if (ratingToDelete.image_url) {
            try {
                const imagePath = new URL(ratingToDelete.image_url).pathname.split('/pint-images/')[1];
                if (imagePath) {
                    await supabase.storage.from('pint-images').remove([imagePath]);
                }
            } catch (error) {
                console.error("Failed to delete image from storage. It might be orphaned.", error);
                // Non-critical, so we don't block the rating deletion.
            }
        }
        
        // 2. Delete the rating record from the database.
        const { error: deleteError } = await supabase.from('ratings').delete().eq('id', ratingToDelete.id);
        if (deleteError) throw deleteError;

        // 3. Show success popup
        setDeleteConfirmationInfo({ key: crypto.randomUUID() });

        // 4. Silently re-fetch user data in the background to ensure consistency
        // for level/rank after the DB trigger has run. This is quick and doesn't block UI.
        fetchUserData();

    } catch (error) {
        console.error("Error deleting rating:", error);
        
        // --- Rollback on Error ---
        setUserRatings(originalUserRatings);
        setAllRatings(originalAllRatings);
        setUserProfile(originalUserProfile);
        
        setAlertInfo({
            isOpen: true,
            title: 'Deletion Failed',
            message: `There was a problem deleting your rating. Please try again. Error: ${error.message}`,
            theme: 'error',
        });
    }
  }, [session, userProfile, userRatings, allRatings, fetchUserData]);
  
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    trackEvent('change_filter', { filter_type: newFilter });
  };
  
  const handleToggleShowAllDbPubs = () => {
      trackEvent('dev_toggle_all_pubs', { enabled: !showAllDbPubs });
      setShowAllDbPubs(prev => !prev);
  };

  const handleToggleLike = useCallback(async (rating) => {
    if (!session) {
        setIsAuthOpen(true);
        return;
    }

    const ratingId = rating.id;
    const userId = session.user.id;
    const isLiked = userLikes.has(ratingId);
    
    trackEvent('toggle_like', { rating_id: ratingId, action: isLiked ? 'unlike' : 'like' });

    // --- Optimistic UI update for heart color ---
    const originalUserLikes = userLikes;
    const newUserLikes = new Set(originalUserLikes);
    isLiked ? newUserLikes.delete(ratingId) : newUserLikes.add(ratingId);
    setUserLikes(newUserLikes);

    // --- DB call ---
    try {
        if (isLiked) {
            const { error } = await supabase.from('rating_likes').delete().match({ rating_id: ratingId, user_id: userId });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('rating_likes').insert({ rating_id: ratingId, user_id: userId });
            if (error) throw error;
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        // Revert heart color on error
        setUserLikes(originalUserLikes);
        setAlertInfo({
            isOpen: true,
            title: 'Action Failed',
            message: 'Your like could not be saved. Please check your connection and try again.',
            theme: 'error',
        });
    }
  }, [session, userLikes, setAlertInfo, setIsAuthOpen]);
  
  const handleTogglePostLike = useCallback(async (post) => {
    if (!session) {
        setIsAuthOpen(true);
        return;
    }

    const postId = post.id;
    const userId = session.user.id;
    const isLiked = userPostLikes.has(postId);
    
    trackEvent('toggle_post_like', { post_id: postId, action: isLiked ? 'unlike' : 'like' });

    // --- Optimistic UI update for heart color ---
    const originalUserPostLikes = userPostLikes;
    const newUserPostLikes = new Set(originalUserPostLikes);
    isLiked ? newUserPostLikes.delete(postId) : newUserPostLikes.add(postId);
    setUserPostLikes(newUserPostLikes);

    // --- DB call ---
    try {
        if (isLiked) {
            const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
            if (error) throw error;
        }
    } catch (error) {
        console.error("Error toggling post like:", error);
        // Revert heart color on error
        setUserPostLikes(originalUserPostLikes);
        setAlertInfo({
            isOpen: true,
            title: 'Action Failed',
            message: 'Your like could not be saved. Please check your connection and try again.',
            theme: 'error',
        });
    }
}, [session, userPostLikes, setAlertInfo, setIsAuthOpen]);
  
  const handleViewLegal = (page) => {
    if (page) {
        trackEvent('view_legal_page', { page_name: page });

        // Update URL for better navigation and deep-linking, without creating duplicate history entries.
        const newSearch = `?page=${page}`;
        const title = `Stoutly - ${page.charAt(0).toUpperCase() + page.slice(1)}`;
        if (window.location.search !== newSearch) {
            history.pushState({ view: 'legal', page }, title, newSearch);
        }
    }
    
    setLegalPageView(page);
    setActiveTab('settings');
    setSelectedPubId(null);
  };
  
  const handleViewAdminPage = (page) => {
    trackEvent('view_admin_page', { page_name: page });
    setSettingsSubView(page);
    setActiveTab('settings'); // Switch to settings tab to host the admin page
  };

  const onViewSocialHub = () => handleViewAdminPage('social');

  const handlePlacementPinMove = useCallback((newLocation) => {
    setFinalPlacementLocation(newLocation);
  }, []);

  const handleFriendRequest = async (targetUserId) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('send_friend_request', { target_user_id: targetUserId });
    const { error } = await supabase.from('friendships').insert({
        user_id_1: session.user.id,
        user_id_2: targetUserId,
        action_user_id: session.user.id,
        status: 'pending',
    });

    if (error) {
        if (error.code === '23505') { // unique_violation
            alert('A friend request between you and this user already exists.');
        } else {
            alert(`Error sending friend request: ${error.message}`);
        }
    } else {
        // Re-fetch social data to update friendship status
        await fetchSocialData(session.user.id);
    }
  };
  
  const handleFriendAction = async (friendshipId, newStatus) => {
      trackEvent('friend_request_action', { friendship_id: friendshipId, action: newStatus });

      // 'declined' is used for both unfriending and declining a request.
      // In both cases, we want to remove the row so a new request can be sent later.
      if (newStatus === 'declined') {
          const { error } = await supabase
              .from('friendships')
              .delete()
              .eq('id', friendshipId);

          if (error) {
              alert(`Error updating friendship: ${error.message}`);
          } else {
              await Promise.all([
                  fetchSocialData(session.user.id),
                  fetchUserData(), // To update friend count
              ]);
          }
      } else { // This handles 'accepted'
          const { error } = await supabase
              .from('friendships')
              .update({ 
                  status: newStatus, 
                  action_user_id: session.user.id,
                  updated_at: new Date().toISOString()
              })
              .eq('id', friendshipId);
          
          if (error) {
              alert(`Error updating friendship: ${error.message}`);
          } else {
              await Promise.all([
                  fetchSocialData(session.user.id),
                  fetchUserData(), // To update friend count
              ]);
          }
      }
  };
  
  const handleProfileUpdate = (profileId) => {
      // Re-fetch the profile data if it's the currently viewed one
      if (viewedProfile && viewedProfile.id === profileId) {
          handleViewProfile(profileId, 'moderation_update');
      }
      // Also re-fetch own profile data if we updated it
      if(userProfile && userProfile.id === profileId) {
          fetchUserData();
      }
  };

  const handleUpdateUsername = async (newUsername) => {
    if (!session || !userProfile || newUsername === userProfile.username) {
        setIsEditUsernameModalOpen(false);
        return null; // Return null for success with no action
    }
    trackEvent('update_username');
    const { error } = await supabase.rpc('change_username', { new_username: newUsername });

    if (error) {
        console.error("Error updating username:", error);
        return error.message; // Return the user-friendly error message from the DB
    } else {
        setIsEditUsernameModalOpen(false);
        await fetchUserData(); // Re-fetch to get the new username and timestamp everywhere
        setAlertInfo({
            isOpen: true,
            title: 'Success!',
            message: 'Your username has been updated.',
            theme: 'success',
        });
        return null; // No error
    }
  };

  const handleUpdateBio = async (newBio) => {
    if (!session || !userProfile) return "You must be logged in.";

    trackEvent('update_bio');
    const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', userProfile.id);
    
    if (error) {
        console.error("Error updating bio:", error);
        return error.message;
    }

    setIsEditBioModalOpen(false);
    await fetchUserData(); // Refresh profile data
    return null; // Success
  };

  const handleUpdateSocials = async (socialsData) => {
    if (!session || !userProfile) return "You must be logged in.";
    
    trackEvent('update_socials');
    const { instagram_handle, youtube_handle, x_handle } = socialsData;

    const { error } = await supabase
        .from('profiles')
        .update({ 
            instagram_handle: instagram_handle || null,
            youtube_handle: youtube_handle || null,
            x_handle: x_handle || null,
        })
        .eq('id', userProfile.id);

    if (error) {
        console.error("Error updating socials:", error);
        return error.message;
    }

    setIsEditSocialsModalOpen(false);
    await fetchUserData(); // Refresh profile data
    setAlertInfo({
        isOpen: true,
        title: 'Success!',
        message: 'Your social links have been updated.',
        theme: 'success',
    });
    return null; // Success
  };

  const handleUpdateUserDetails = async ({ dob, country_code }) => {
    if (!session || !userProfile) return 'You must be logged in.';
    trackEvent('update_user_details');

    const { error } = await supabase
        .from('profiles')
        .update({ dob, country_code })
        .eq('id', userProfile.id);

    if (error) {
        console.error("Error updating user details:", error);
        return error.message;
    }

    setIsUpdateDetailsModalOpen(false);
    await fetchUserData(); // Refresh profile data
    setAlertInfo({
        isOpen: true,
        title: 'Success!',
        message: 'Your profile details have been updated.',
        theme: 'success',
    });
    return null; // Success
  };

  const handleViewFriends = async (targetUser) => {
    if (!targetUser) return;
    trackEvent('view_friends_list', { target_user_id: targetUser.id });

    // On desktop, switch back to map view so the side panel is visible
    if (isDesktop) {
      setActiveTab('map');
    }
    
    // Set state to show the friends list UI
    setViewingFriendsOf(targetUser);
    setIsFetchingFriendsList(true);
    setFriendsList([]); // Clear previous list

    try {
        const { data, error } = await supabase.rpc('get_friends_list', {
            user_id_param: targetUser.id,
        });

        if (error) {
            throw error;
        }
        
        setFriendsList(data || []);
    } catch (error) {
        console.error("Error fetching friends list:", error);
        alert(`Could not load friends list: ${error.message}`);
        // Go back if the fetch fails to avoid a broken state
        setViewingFriendsOf(null); 
    } finally {
        setIsFetchingFriendsList(false);
    }
  };

  const profilePage = useMemo(() => {
      const onBackHandler = viewedProfile ? handleBackFromProfileView : undefined;
      return (
          <ProfilePage
              userProfile={viewedProfile || userProfile}
              userRatings={viewedProfile ? viewedRatings : userRatings}
              userPosts={viewedProfile ? viewedPosts : userPosts}
              userTrophies={viewedProfile ? viewedTrophies : userTrophies}
              allTrophies={allTrophies}
              onBack={onBackHandler}
              onViewPub={handleSelectPub}
              loggedInUserProfile={userProfile}
              levelRequirements={levelRequirements}
              onAvatarChangeClick={() => setIsAvatarModalOpen(true)}
              onEditUsernameClick={() => setIsEditUsernameModalOpen(true)}
              onEditBioClick={() => setIsEditBioModalOpen(true)}
              onEditSocialsClick={() => setIsEditSocialsModalOpen(true)}
              onOpenUpdateDetailsModal={() => setIsUpdateDetailsModalOpen(true)}
              onProfileUpdate={handleProfileUpdate}
              friendships={friendships}
              onFriendRequest={handleFriendRequest}
              onFriendAction={handleFriendAction}
              onViewFriends={handleViewFriends}
              onDeleteRating={handleDeleteRating}
              onOpenShareProfileModal={(user) => setShareProfileModalUser(user)}
              onViewProfile={handleViewProfile}
              onNavigateToSettings={handleTabChange}
              pubScores={pubScores}
              isStatsModalOpen={isProfileStatsModalOpen}
              onSetIsStatsModalOpen={setIsProfileStatsModalOpen}
              userPostLikes={userPostLikes}
              onTogglePostLike={handleTogglePostLike}
              onEditPost={handleEditPost}
              onDeletePost={handleDeletePost}
          />
      );
  }, [
      viewedProfile, userProfile, viewedRatings, userRatings, viewedPosts, userPosts, userTrophies, viewedTrophies, allTrophies,
      handleBackFromProfileView, handleSelectPub, levelRequirements, 
      handleProfileUpdate, friendships, handleFriendRequest, handleViewProfile,
      handleFriendAction, handleViewFriends, handleDeleteRating, handleTabChange,
      pubScores, isProfileStatsModalOpen, userPostLikes, handleTogglePostLike,
      handleEditPost, handleDeletePost,
  ]);
  
  const handleAddPubClick = () => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('add_pub_start');
    setIsAddPubModalOpen(true);
  };
  
  const handleStartPubPlacement = async ({ name, address }) => {
    trackEvent('add_pub_geocode_start', { address });
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${accessToken}&limit=1`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const [lng, lat] = place.center;
        const location = { lat, lng };
        
        setIsAddPubModalOpen(false);
        setPubPlacementState({ name, address });
        setFinalPlacementLocation(location);
        
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 3000, padding: getFlyToPadding() });
        } else {
            setMapCenter(location);
        }

        trackEvent('add_pub_geocode_success');
      } else {
        trackEvent('add_pub_geocode_failed', { reason: 'not_found' });
        alert('Could not find that address. Please try being more specific or check for typos.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      trackEvent('add_pub_geocode_failed', { reason: 'api_error' });
      alert('An error occurred while searching for the address. Please check your connection and try again.');
    }
  };
  
  const handleConfirmNewPub = async () => {
    if (!pubPlacementState || !finalPlacementLocation || !session) return;
  
    setIsConfirmingLocation(true);
    trackEvent('add_pub_confirm_start');
  
    try {
      // Reverse geocode to get country info
      const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${finalPlacementLocation.lng},${finalPlacementLocation.lat}.json?access_token=${accessToken}&types=country`;
      const reverseResponse = await fetch(reverseUrl);
      const reverseData = await reverseResponse.json();

      let country_code = null;
      let country_name = null;
      if (reverseData.features && reverseData.features.length > 0) {
          const context = reverseData.features[0].context;
          const country = context?.find(c => c.id.startsWith('country'));
          if (country) {
            country_code = country.short_code;
            country_name = country.text;
          }
      }
      
      // Generate a unique ID for the new pub to satisfy the not-null constraint.
      const newPubId = `stoutly-${session.user.id}-${Date.now()}`;

      const newPubPayload = {
        id: newPubId,
        name: pubPlacementState.name,
        address: pubPlacementState.address,
        lat: finalPlacementLocation.lat,
        lng: finalPlacementLocation.lng,
        created_by: session.user.id,
        country_code,
        country_name,
      };
  
      const { data: insertedPub, error } = await supabase
        .from('pubs')
        .insert(newPubPayload)
        .select()
        .single();
  
      if (error) throw error;
      
      trackEvent('add_pub_success', { pub_id: insertedPub.id });
      
      // Clean up the placement state first
      handleCancelPubPlacement(); 
  
      // Show success popup
      setAddPubSuccessInfo({ key: crypto.randomUUID() });

      // Refresh data to include the new pub
      await handleDataRefresh();
      
      // Format the pub object for selection, ensuring it has the nested location object.
      const pubForSelection = {
        ...insertedPub,
        location: { lat: insertedPub.lat, lng: insertedPub.lng }
      };
      // Select the pub, which will also handle centering the map on it.
      handleSelectPub(pubForSelection);
  
    } catch (error) {
      console.error("Error confirming new pub:", error);
      trackEvent('add_pub_failed', { error_message: error.message });
      alert(`There was an error saving the pub: ${error.message}`);
    } finally {
      setIsConfirmingLocation(false);
    }
  };

  const handleUpdateAvatar = useCallback(async (newAvatarId) => {
    if (!session || !userProfile) return;
    trackEvent('update_avatar', { avatar_style: JSON.parse(newAvatarId)?.style });

    try {
        const originalAvatarId = userProfile.avatar_id;
        // Optimistic update for instant UI feedback
        setUserProfile(currentProfile => ({ ...currentProfile, avatar_id: newAvatarId }));
        setIsAvatarModalOpen(false); // Close modal immediately

        const { error } = await supabase
            .from('profiles')
            .update({ avatar_id: newAvatarId })
            .eq('id', userProfile.id);

        if (error) {
            // Revert on error
            setUserProfile(currentProfile => ({ ...currentProfile, avatar_id: originalAvatarId }));
            throw error;
        }
        // No need to fetch user data again due to optimistic update
    } catch (error) {
        console.error("Error updating avatar:", error);
        alert(`Could not update avatar: ${error.message}`);
    }
  }, [session, userProfile]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);
  
  // --- COMMENTS & NOTIFICATIONS HANDLERS ---
  
  const fetchCommentsForRating = useCallback(async (ratingId) => {
    setIsCommentsLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:user_id(id, username, avatar_id, level, is_developer)')
      .eq('rating_id', ratingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setCommentsByRating(prev => new Map(prev).set(ratingId, data));
    }
    setIsCommentsLoading(false);
  }, []);

  const handleAddComment = useCallback(async (ratingId, content, parentCommentId = null) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('add_comment', { rating_id: ratingId, is_reply: !!parentCommentId });

    const payload = {
        rating_id: ratingId,
        user_id: session.user.id,
        content,
        parent_comment_id: parentCommentId,
    };

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert(payload)
      .select('*, user:user_id(id, username, avatar_id, level, is_developer)')
      .single();

    if (error) {
        if (error.message.includes('Please wait a moment')) {
            setAlertInfo({
                isOpen: true,
                title: 'You are commenting too quickly!',
                message: 'To prevent spam, we have a limit on how frequently you can comment. Please wait a moment before trying again.',
                theme: 'info',
            });
        } else {
             setAlertInfo({
                isOpen: true,
                title: 'Error',
                message: `Could not post comment: ${error.message}`,
                theme: 'error',
            });
        }
    } else {
      // Re-fetch all comments for the rating to get the updated thread structure
      await fetchCommentsForRating(ratingId);
    }
  }, [session, setAlertInfo, fetchCommentsForRating, setIsAuthOpen]);

  const handleDeleteComment = useCallback(async (commentId, ratingId) => {
    trackEvent('delete_comment', { comment_id: commentId });
    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (error) {
      alert(`Error deleting comment: ${error.message}`);
    } else {
      // Re-fetch all comments for this rating to correctly update the UI,
      // including removing any nested replies that were cascaded in the DB.
      await fetchCommentsForRating(ratingId);
      // Also re-fetch all ratings to update the comment count on the rating card itself
      await fetchAllRatings();
    }
  }, [fetchCommentsForRating, fetchAllRatings]);

  const fetchCommentsForPost = useCallback(async (postId) => {
    setIsPostCommentsLoading(true);
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, user:user_id(id, username, avatar_id, level, is_developer)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching post comments:", error);
    } else {
      setCommentsByPost(prev => new Map(prev).set(postId, data));
    }
    setIsPostCommentsLoading(false);
  }, []);

  const handleAddPostComment = useCallback(async (postId, content, parentCommentId = null) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('add_post_comment', { post_id: postId, is_reply: !!parentCommentId });

    const payload = {
        post_id: postId,
        user_id: session.user.id,
        content,
        parent_comment_id: parentCommentId,
    };

    const { error } = await supabase.from('post_comments').insert(payload);

    if (error) {
        setAlertInfo({ isOpen: true, title: 'Error', message: `Could not post comment: ${error.message}`, theme: 'error' });
    } else {
      await fetchCommentsForPost(postId);
    }
  }, [session, setAlertInfo, fetchCommentsForPost, setIsAuthOpen]);

  const handleDeletePostComment = useCallback(async (commentId, postId) => {
    trackEvent('delete_post_comment', { comment_id: commentId });
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);

    if (error) {
      alert(`Error deleting comment: ${error.message}`);
    } else {
      await fetchCommentsForPost(postId);
    }
  }, [fetchCommentsForPost]);

  const handleOpenReportCommentModal = (comment) => {
    setReportCommentInfo({ isOpen: true, comment });
  };

  const handleReportComment = useCallback(async (reason) => {
    if (!reportCommentInfo.comment) return;
    const { id: commentId } = reportCommentInfo.comment;

    trackEvent('report_comment', { comment_id: commentId, reason });
    const { error } = await supabase.rpc('report_comment', {
      p_comment_id: commentId,
      p_reason: reason,
    });

    setReportCommentInfo({ isOpen: false, comment: null }); // Close modal

    if (error) {
      setAlertInfo({
        isOpen: true,
        title: 'Report Failed',
        message: `There was an error reporting this comment: ${error.message}`,
        theme: 'error',
      });
    } else {
      setAlertInfo({
        isOpen: true,
        title: 'Comment Reported',
        message: 'Thank you for helping keep the community safe. Our moderation team will review it shortly.',
        theme: 'success',
      });
    }
  }, [reportCommentInfo.comment]);

  const handleMarkNotificationsAsRead = useCallback(async () => {
    if (!session || unreadNotificationsCount === 0) return;
    trackEvent('mark_notifications_read');

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error("Error marking notifications as read:", error);
    } else {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  }, [session, notifications, unreadNotificationsCount]);
  
  const handleDeleteNotification = useCallback(async (notificationId) => {
    if (!session) return;
    trackEvent('delete_notification', { notification_id: notificationId });

    // Optimistic update
    const originalNotifications = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    
    if (error) {
        console.error("Error deleting notification:", error);
        // Revert on error
        setNotifications(originalNotifications);
        setAlertInfo({
            isOpen: true,
            title: 'Error',
            message: 'Could not delete notification. Please try again.',
            theme: 'error',
        });
    }
  }, [session, notifications, setAlertInfo, setNotifications]);
  
  // --- MODERATION HANDLERS (for reported comments) ---

  const fetchReportedComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('reported_comments')
      .select(`
        *,
        comment:comments!inner(
          id, content, created_at,
          author:profiles!comments_user_id_fkey(id, username, avatar_id)
        ),
        reporter:profiles!reported_comments_reporter_id_fkey(id, username)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error fetching reported comments:", error);
    } else {
      setReportedComments(data || []);
    }
  }, [setReportedComments]);

  const handleResolveCommentReport = useCallback(async (report, action) => {
    trackEvent('resolve_comment_report', { report_id: report.id, action });
    
    const { error } = await supabase.functions.invoke('resolve-comment-report', {
      body: { report_id: report.id, action: action }
    });
    
    if (error) {
      alert(`Failed to resolve report: ${error.context?.responseJson?.error || error.message}`);
    } else {
      // Optimistically remove from list
      setReportedComments(prev => prev.filter(r => r.id !== report.id));
      if (action === 'remove') {
          // If a comment was removed, we should refresh all ratings to update comment counts
          await fetchAllRatings();
      }
    }
  }, [fetchAllRatings, setReportedComments]);

  const handleAdminDeleteComment = useCallback(async (commentId) => {
      trackEvent('admin_delete_comment', { comment_id: commentId });
      try {
          const { error } = await supabase.functions.invoke('delete-comment-admin', {
              body: { comment_id: commentId }
          });
          if (error) throw error;
          await fetchAllRatings();
          return { success: true };
      } catch (error) {
          console.error("Failed to delete comment as admin:", error);
          return { success: false, error: `Could not delete comment: ${error.context?.responseJson?.error || error.message}` };
      }
  }, [fetchAllRatings]);
  
  const handleMarketingConsentChange = useCallback(async (newValue) => {
    if (!session || !userProfile) return;
    trackEvent('change_setting', { setting_name: 'marketing_consent', value: newValue });
    // Optimistic update
    const originalValue = userProfile.accepts_marketing;
    setUserProfile(current => ({ ...current, accepts_marketing: newValue }));
    
    const { error } = await supabase
      .from('profiles')
      .update({ accepts_marketing: newValue })
      .eq('id', userProfile.id);
      
    if (error) {
      console.error("Error updating marketing consent:", error);
      // Revert on error
      setUserProfile(current => ({ ...current, accepts_marketing: originalValue }));
      setAlertInfo({
        isOpen: true,
        title: 'Update Failed',
        message: `Could not save your preference: ${error.message}`,
        theme: 'error',
      });
    }
  }, [session, userProfile, setUserProfile, setAlertInfo]);

  const handleOpenSuggestEditModal = useCallback((pub) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('suggest_edit_open', { pub_id: pub.id });
    setPubToEdit(pub);
    setIsSuggestEditModalOpen(true);
  }, [session]);

  const handleSubmitEditSuggestion = useCallback(async (suggestionData) => {
    if (!pubToEdit) return;

    trackEvent('suggest_edit_submit', {
        pub_id: pubToEdit.id,
        has_new_name: !!suggestionData.suggested_data.name,
        marked_as_closed: suggestionData.suggested_data.is_closed,
        has_notes: !!suggestionData.notes,
    });

    const { error } = await supabase.rpc('submit_pub_edit', {
        p_pub_id: pubToEdit.id,
        p_current_name: pubToEdit.name,
        p_current_address: pubToEdit.address,
        p_lat: pubToEdit.location?.lat,
        p_lng: pubToEdit.location?.lng,
        p_suggested_data: suggestionData.suggested_data,
        p_notes: suggestionData.notes,
        p_country_code: suggestionData.country_code,
        p_country_name: suggestionData.country_name,
    });

    setIsSuggestEditModalOpen(false);
    setPubToEdit(null);

    if (error) {
        setAlertInfo({
            isOpen: true,
            title: 'Submission Failed',
            message: `Could not submit your suggestion: ${error.message}`,
            theme: 'error',
        });
    } else {
        setAlertInfo({
            isOpen: true,
            title: 'Suggestion Submitted!',
            message: 'Thank you for helping keep Stoutly up to date. Your suggestion has been sent for review.',
            theme: 'success',
        });
    }
  }, [pubToEdit]);

  // --- St Paddy's Day Mode ---
  
  const isStPaddysModeActive = (systemFlags.st_paddys_mode || false) || localStPaddysOverride;

  // Fetch and subscribe to system flags
  useEffect(() => {
    const fetchFlags = async () => {
      const { data, error } = await supabase.from('system_flags').select('*');
      if (!error && data) {
        const flags = data.reduce((acc, flag) => {
          acc[flag.flag_name] = flag.is_active;
          return acc;
        }, {});
        setSystemFlags(flags);
      }
    };
    fetchFlags();

    const channel = supabase.channel('system-flags')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_flags' }, (payload) => {
        setSystemFlags(prev => ({ ...prev, [payload.new.flag_name]: payload.new.is_active }));
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update root class and confetti for theme
  useEffect(() => {
    const root = document.documentElement;
    const hasBeenActivated = sessionStorage.getItem('stoutly-paddys-confetti-seen');

    if (isStPaddysModeActive) {
      root.classList.add('st-paddys-mode');
      if (!hasBeenActivated) {
        setConfettiState({
          active: true,
          recycle: true,
          opacity: 1,
          key: 'st-paddys-day',
          numberOfPieces: 400,
          colors: ['#22c55e', '#ffffff', '#f97316', '#16a34a'],
          confettiSource: { x: 0, y: 0, w: windowSize.width, h: 0 },
          drawShape: (ctx) => {
            const scale = 1.5; // Increase the size of the shamrocks
            ctx.scale(scale, scale);
            ctx.beginPath();
            ctx.moveTo(0, -1);
            ctx.arc(1, -2, 2, Math.PI, Math.PI * 1.7);
            ctx.arc(-1, -2, 2, Math.PI * 1.3, Math.PI * 2);
            ctx.arc(0, 0, 1, Math.PI * 0.4, Math.PI * 1.1);
            ctx.fill();
          }
        });
        sessionStorage.setItem('stoutly-paddys-confetti-seen', 'true');
      }
    } else {
      root.classList.remove('st-paddys-mode');
    }
  }, [isStPaddysModeActive, windowSize]);
  
  const handleToggleGlobalStPaddysMode = useCallback(async (isActive) => {
    trackEvent('dev_toggle_global_event', { event: 'st_paddys_mode', active: isActive });
    const { error } = await supabase.rpc('toggle_system_flag', {
        p_flag_name: 'st_paddys_mode',
        p_is_active: isActive,
    });
    if (error) {
        setAlertInfo({ isOpen: true, title: "Error", message: `Failed to toggle global mode: ${error.message}`, theme: 'error' });
    }
  }, [setAlertInfo]);

  const handleToggleLocalStPaddysMode = useCallback((isActive) => {
    setLocalStPaddysOverride(isActive);
  }, []);

  const layoutProps = {
      isDesktop,
      isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
      activeTab, handleTabChange, locationError, settings, handleSettingsChange, filter, handleFilterChange,
      filterGuinnessZero, onFilterGuinnessZeroChange,
      handleRefresh, isRefreshing, sortedPubs, userLocation, mapCenter, searchOrigin,
      handleSelectPub, selectedPubId, highlightedRatingId, highlightedCommentId, highlightedPostId,
      handleMapMove,
      handleFindCurrentPub, getDistance,
      getAverageRating, resultsAreCapped, isDbPubsLoaded, initialSearchComplete,
      profilePage, session, userProfile, onLogout: () => supabase.auth.signOut(),
      selectedPub, existingUserRatingForSelectedPub, handleRatePub,
      reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo, addPubSuccessInfo,
      isAvatarModalOpen, setIsAvatarModalOpen,
      handleUpdateAvatar, viewedProfile, handleViewProfile, legalPageView, handleViewLegal, handleDataRefresh,
      installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
      showSearchAreaButton, handleSearchThisArea,
      searchOnNextMoveEnd, handleSearchAfterMove,
      pubPlacementState, finalPlacementLocation, isConfirmingLocation,
      handlePlacementPinMove, handleConfirmNewPub, handleCancelPubPlacement, isSubmittingRating,
      handleFindPlace,
      onPubSelected: handleSelectPub,
      searchRadius: settings.radius,
      showSearchRadius: settings.showSearchRadius,
      showSearchOrigin: settings.showSearchOrigin,
      levelRequirements,
      locationPermissionStatus, onRequestPermission: handleRequestPermission,
      CommunityPage,
      friendships, userLikes, onToggleLike: handleToggleLike, onFriendRequest: handleFriendRequest, onFriendAction: handleFriendAction,
      viewingFriendsOf, friendsList, isFetchingFriendsList, handleViewFriends, handleBackFromFriendsList,
      deleteConfirmationInfo,
      settingsSubView, handleViewAdminPage,
      onOpenScoreExplanation: () => setIsPubScoreModalOpen(true),
      isPubScoreModalOpen, onSetIsPubScoreModalOpen: setIsPubScoreModalOpen,
      onOpenSuggestEditModal: handleOpenSuggestEditModal,
      unreadNotificationsCount,
      notifications, onMarkNotificationsAsRead: handleMarkNotificationsAsRead, onDeleteNotification: handleDeleteNotification,
      commentsByRating, isCommentsLoading, onFetchComments: fetchCommentsForRating, onAddComment: handleAddComment, onDeleteComment: handleDeleteComment, onReportComment: handleOpenReportCommentModal,
      commentsByPost, isPostCommentsLoading, onFetchCommentsForPost: handleAddPostComment, onDeletePostComment: handleDeletePostComment,
      reportCommentInfo, onCloseReportCommentModal: () => setReportCommentInfo({ isOpen: false, comment: null }), onSubmitReportComment: handleReportComment,
      reportedComments, onFetchReportedComments: fetchReportedComments, onResolveCommentReport: handleResolveCommentReport, onAdminDeleteComment: handleAdminDeleteComment,
      toastNotification, onCloseToast: () => setToastNotification(null), onToastClick: handleToastClick,
      handleMarketingConsentChange,
      userZeroVotes, onGuinnessZeroVote: handleGuinnessZeroVote, onClearGuinnessZeroVote: handleClearGuinnessZeroVote,
      showAllDbPubs, onToggleShowAllDbPubs: handleToggleShowAllDbPubs,
      onOpenShareModal: setShareModalPub,
      onOpenShareRatingModal: handleOpenShareRatingModal,
      onOpenSharePostModal: setSharePostModalPost,
      scrollToSection, onScrollComplete: () => setScrollToSection(null),
      confettiState, setConfettiState,
      isChangingPassword, handleChangePassword,
      userTrophies, allTrophies,
      dbPubs,
      onViewSocialHub,
      geocodingPubIds,
      isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed,
      isStPaddysModeActive,
      top10PubIds,
      systemFlags, localStPaddysOverride, onToggleGlobalStPaddysMode: handleToggleGlobalStPaddysMode, onToggleLocalStPaddysMode: handleToggleLocalStPaddysMode,
      isPubCrawlPlannerEnabled, onTogglePubCrawlPlanner: handleTogglePubCrawlPlanner,
      PubCrawlPage,
      activeCrawl, onStartCrawl: handleStartCrawl, onEndCrawl: handleEndCrawl, onToggleCrawlStop: handleToggleCrawlStop, onReorderStops: handleReorderStops,
      pubScores,
      onEnterCrawlMode: handleEnterCrawlMode,
      handleAddPubClick,
      isBackfilling, onBackfillCountryData: handleBackfillCountryData,
      onTestTrophyPopup: handleTestTrophyPopup,
      onTestDonationPopup: handleTestDonationPopup,
      mapRef, onMapLoad: handleMapLoad,
      communitySubTab, setCommunitySubTab,
      isAppHeaderVisible, onMobileScroll: handleMobileScroll, isNavShrunk,
      // Changelog handlers
      hasUnreadChangelog,
      onViewChangelog: () => {
        setIsChangelogOpen(true);
        if (latestChangelogItemId) {
          localStorage.setItem('stoutly-last-seen-changelog-id', latestChangelogItemId);
        }
        setHasUnreadChangelog(false);
      },
      onManageChangelog: () => {
        setIsChangelogManagerOpen(true);
      },
      // Post handlers
      isCreatePostModalOpen,
      createPostModalOrigin,
      onOpenCreatePostModal: handleOpenCreatePostModal,
      postToEdit,
      onEditPost: handleEditPost,
      onDeletePost: handleDeletePost,
      userPostLikes,
      onTogglePostLike: handleTogglePostLike,
      postSuccessCount,
      // Mobile Panel
      panelHeight, setPanelHeight, COLLAPSED_PANEL_HEIGHT,
      handleDonationSuccess,
  };

  const Layout = isDesktop ? DesktopLayout : MobileLayout;
  
  if (userProfile?.is_banned) {
    return <BannedPage userProfile={userProfile} onLogout={() => supabase.auth.signOut()} />;
  }
  
  if (isCrawlModeActive && activeCrawl) {
      return (
          <CrawlModePage
              activeCrawl={activeCrawl}
              onEndCrawl={handleEndCrawl}
              onExitCrawlMode={handleExitCrawlMode}
              onToggleCrawlStop={handleToggleCrawlStop}
              onSkipCrawlStop={handleSkipCrawlStop}
              userRatings={userRatings}
              userProfile={userProfile}
              session={session}
              onRate={handleRatePub}
              isSubmittingRating={isSubmittingRating}
              getAverageRating={getAverageRating}
              onLoginRequest={() => setIsAuthOpen(true)}
              onViewProfile={onViewProfile}
              onDataRefresh={handleDataRefresh}
              userLikes={userLikes}
              onToggleLike={onToggleLike}
              onOpenScoreExplanation={() => setIsPubScoreModalOpen(true)}
              onOpenSuggestEditModal={handleOpenSuggestEditModal}
              commentsByRating={commentsByRating}
              isCommentsLoading={isCommentsLoading}
              onFetchComments={fetchCommentsForRating}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
              onReportComment={onReportComment}
              userZeroVotes={userZeroVotes}
              onGuinnessZeroVote={onGuinnessZeroVote}
              onClearGuinnessZeroVote={onClearGuinnessZeroVote}
              onOpenShareModal={setShareModalPub}
              onOpenShareRatingModal={handleOpenShareRatingModal}
              setAlertInfo={setAlertInfo}
              settings={settings}
              pubScores={pubScores}
              userLocation={userLocation}
              allRatings={allRatings}
              isActiveCrawl={isCrawlModeActive}
          />
      );
  }

  return (
    <Elements stripe={stripePromise}>
      <OnlineStatusContext.Provider value={{ onlineUserIds }}>
      <ExchangeRatesProvider>
        <Layout {...layoutProps} />

        {/* Popups & Modals that can appear over any layout */}
        {alertInfo.isOpen && (
          <AlertModal
            {...alertInfo}
            onClose={() => setAlertInfo({ isOpen: false, title: '', message: '', theme: 'info' })}
          />
        )}
        {isPubScoreModalOpen && <PubScoreExplanationModal isOpen={isPubScoreModalOpen} onClose={() => setIsPubScoreModalOpen(false)} />}
        {isChangelogOpen && <ChangelogPage onClose={() => setIsChangelogOpen(false)} />}
        {isChangelogManagerOpen && userProfile?.is_developer && <ChangelogManager onClose={() => setIsChangelogManagerOpen(false)} />}
        {(isCreatePostModalOpen || postToEdit) && userProfile && (
            <CreatePostModal 
                userProfile={userProfile}
                onClose={handleClosePostModal}
                dbPubs={dbPubs}
                userRatings={userRatings}
                onPostSuccess={handlePostModalSuccess}
                editingPost={postToEdit}
                createPostModalOrigin={createPostModalOrigin}
            />
        )}
        {postToDelete && (
            <ConfirmationModal
                isOpen={!!postToDelete}
                onClose={() => setPostToDelete(null)}
                onConfirm={confirmDeletePost}
                title="Delete Post?"
                message="Are you sure you want to permanently delete this post and all its comments?"
                confirmText="Delete"
                theme="red"
            />
        )}


        {isAddPubModalOpen && (
          <AddPubModal onClose={handleCancelPubPlacement} onSubmit={handleStartPubPlacement} />
        )}
        {isEditUsernameModalOpen && (
          <EditUsernameModal
              userProfile={userProfile}
              onClose={() => setIsEditUsernameModalOpen(false)}
              onSubmit={handleUpdateUsername}
          />
      )}
      {isEditBioModalOpen && (
        <EditBioModal
            currentBio={userProfile.bio}
            onClose={() => setIsEditBioModalOpen(false)}
            onSubmit={handleUpdateBio}
        />
      )}
      {isEditSocialsModalOpen && (
          <EditSocialsModal
              userProfile={userProfile}
              onClose={() => setIsEditSocialsModalOpen(false)}
              onSubmit={handleUpdateSocials}
          />
      )}
      {isUpdateDetailsModalOpen && (
        <UpdateDetailsModal 
            onClose={() => setIsUpdateDetailsModalOpen(false)}
            onSubmit={handleUpdateUserDetails}
        />
      )}
       {isSuggestEditModalOpen && pubToEdit && (
            <SuggestEditModal
                pub={pubToEdit}
                onClose={() => setIsSuggestEditModalOpen(false)}
                onSubmit={handleSubmitEditSuggestion}
            />
        )}

      {shareModalPub && <ShareModal pub={shareModalPub} onClose={() => setShareModalPub(null)} loggedInUserProfile={userProfile} />}
      {shareProfileModalUser && <ShareProfileModal user={shareProfileModalUser} onClose={() => setShareProfileModalUser(null)} />}
      {shareRatingModalRating && <ShareRatingModal rating={shareRatingModalRating} onClose={() => setShareRatingModalRating(null)} loggedInUserProfile={userProfile} />}
      {sharePostModalPost && <SharePostModal post={sharePostModalPost} onClose={() => setSharePostModalPost(null)} />}

      {unlockedTrophiesToShow.length > 0 && <TrophyUnlockedPopup trophies={unlockedTrophiesToShow} onClose={handleCloseTrophyPopup} />}

      {confettiState.active && (
          <Confetti
              key={confettiState.key}
              width={windowSize.width}
              height={windowSize.height}
              recycle={confettiState.recycle}
              opacity={confettiState.opacity}
              numberOfPieces={confettiState.numberOfPieces}
              drawShape={confettiState.drawShape}
              colors={confettiState.colors}
              style={{ transition: 'opacity 2s ease-in-out', zIndex: 9999 }}
              confettiSource={confettiState.confettiSource}
          />
      )}

      {isWelcomeModalOpen && <WelcomeModal onClose={() => setIsWelcomeModalOpen(false)} />}

      {cookieConsent === null && (
        <CookieConsentBanner onAccept={handleAcceptCookies} onDecline={handleDeclineCookies} />
      )}
      
      {!isDesktop && isCoasterWelcomeModalOpen && <CoasterWelcomeModal onClose={() => setIsCoasterWelcomeModalOpen(false)} />}
      
      </ExchangeRatesProvider>
      </OnlineStatusContext.Provider>
    </Elements>
  );
};

export default App;
