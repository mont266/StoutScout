import React, { useState, useMemo, useCallback, useEffect, useRef, createContext } from 'react';
import { FilterType } from './types.js';
import { DEFAULT_LOCATION } from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { supabase } from './supabase.js';
import { getRankData, getCurrencyInfo, normalizeNominatimResult, normalizeReverseGeocodeResult, extractPostcode, normalizePubNameForComparison } from './utils.js';
import { initializeAnalytics, trackEvent } from './analytics.js';

import MobileLayout from './components/MobileLayout.jsx';
import DesktopLayout from './components/DesktopLayout.jsx';
import useIsDesktop from './hooks/useIsDesktop.js';

import ProfilePage from './components/ProfilePage.jsx';
import BannedPage from './components/BannedPage.jsx';
import AddPubModal from './components/AddPubModal.jsx';
import EditUsernameModal from './components/EditUsernameModal.jsx';
import EditBioModal from './components/EditBioModal.jsx';
import SuggestEditModal from './components/SuggestEditModal.jsx';
import CommunityPage from './components/CommunityPage.jsx';
import StatsPage from './components/StatsPage.jsx';
import PubScoreExplanationModal from './components/PubScoreExplanationModal.jsx';
import CookieConsentBanner from './components/CookieConsentBanner.jsx';
import { OnlineStatusContext } from './contexts/OnlineStatusContext.jsx';
import AlertModal from './components/AlertModal.jsx';


const App = () => {
  // --- STATE MANAGEMENT ---

  // Auth state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // App state
  const [nominatimResults, setNominatimResults] = useState([]);
  const [pubs, setPubs] = useState([]);
  const [allRatings, setAllRatings] = useState(new Map());
  const [pubScores, setPubScores] = useState(new Map());
  const [selectedPubId, setSelectedPubId] = useState(null);
  const [highlightedRatingId, setHighlightedRatingId] = useState(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [filter, setFilter] = useState(FilterType.Distance);
  const [filterGuinnessZero, setFilterGuinnessZero] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mapTileRefreshKey, setMapTileRefreshKey] = useState(Date.now());
  const [searchOnNextMoveEnd, setSearchOnNextMoveEnd] = useState(false);

  const [settings, setSettings] = useState(loadSettings);

  const [activeTab, setActiveTab] = useState('map');
  const [userProfile, setUserProfile] = useState(null);
  const [userRatings, setUserRatings] = useState([]);
  const [communitySubTab, setCommunitySubTab] = useState('community');

  // State for viewing other user profiles
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedRatings, setViewedRatings] = useState([]);
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
  const [toastNotification, setToastNotification] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '', theme: 'info' });
  
  const [levelRequirements, setLevelRequirements] = useState([]);
  
  const [dbPubs, setDbPubs] = useState([]);
  const [closedOsmPubIds, setClosedOsmPubIds] = useState(new Set());
  const [osmPubOverrides, setOsmPubOverrides] = useState(new Map());
  
  const [isDbPubsLoaded, setIsDbPubsLoaded] = useState(false);
  const [initialSearchComplete, setInitialSearchComplete] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  
  // State for legal & admin sub-pages
  const [legalPageView, setLegalPageView] = useState(null); // 'terms' or 'privacy'
  const [settingsSubView, setSettingsSubView] = useState(null); // 'stats' or 'moderation'

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
  const [reportCommentInfo, setReportCommentInfo] = useState({ isOpen: false, comment: null });
  const [reportedComments, setReportedComments] = useState([]);


  // Cookie Consent State
  const [cookieConsent, setCookieConsent] = useState(null);

  // Online Presence State
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());


  // --- HOOKS ---
  const isDesktop = useIsDesktop();
  const locationPermissionTracked = useRef(false);
  const initialSettingsLoad = useRef(true);
  const radiusUpdateTimeout = useRef(null);
  const didProcessUrlParams = useRef(false);
  
  // --- ANALYTICS & CONSENT ---
  
  useEffect(() => {
    const storedConsent = localStorage.getItem('stoutly-cookie-consent');
    if (storedConsent === 'granted') {
      initializeAnalytics();
    }
    setCookieConsent(storedConsent);
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('stoutly-cookie-consent', 'granted');
    setCookieConsent('granted');
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
    } else if (viewedProfile && (!userProfile || viewedProfile.id !== userProfile.id)) {
      screenName = 'profile_other_user';
    } else if (activeTab === 'profile' && userProfile) {
      screenName = 'profile_own';
    } else if (activeTab === 'community') {
      screenName = `community_${communitySubTab}`;
    } else if (activeTab === 'stats') {
      screenName = `stats_main`;
    } else if (isAuthOpen) {
      screenName = 'auth';
    } else if (isPasswordRecovery) {
      screenName = 'password_recovery';
    } else if (pubPlacementState) {
      screenName = 'add_pub_placement';
    }

    trackEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass, // GA4 standard parameter
    });
  }, [activeTab, communitySubTab, legalPageView, viewedProfile, userProfile, isAuthOpen, isPasswordRecovery, pubPlacementState, viewingFriendsOf, settingsSubView]);


  useEffect(() => {
    const pub = pubs.find(p => p.id === selectedPubId);
    if (pub) {
      trackEvent('select_content', { content_type: 'pub', item_id: pub.id });
    }
  }, [selectedPubId, pubs]);


  // --- DATA FETCHING & AUTH ---

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


  const fetchDbPubs = useCallback(async () => {
    // This is a two-query workaround because the `pubs_with_dynamic_pricing_info` view
    // was not updated with the Guinness Zero columns, causing a crash. This is safer than
    // requiring a user to run a database migration.
    
    // Query 1: Get data from the view, which includes dynamic pricing info.
    const { data: viewData, error: viewError } = await supabase.from('pubs_with_dynamic_pricing_info')
      .select('id, name, address, lat, lng, country_code, country_name, is_dynamic_price_area, area_identifier, area_rating_count, is_closed');

    if (viewError) {
      console.error("Error fetching rated pubs from DB:", viewError);
      setIsDbPubsLoaded(true);
      return;
    }

    const pubsData = viewData || [];
    let mergedData = pubsData;

    // Query 2: If we have pubs, fetch their Guinness Zero data from the base `pubs` table.
    if (pubsData.length > 0) {
        const pubIds = pubsData.map(p => p.id);
        const { data: zeroData, error: zeroError } = await supabase.from('pubs')
            .select('id, guinness_zero_confirmations, guinness_zero_denials')
            .in('id', pubIds);
        
        if (zeroError) {
            console.error("Error fetching Guinness Zero data:", zeroError);
            // Proceed with what we have, zero data will be missing but app won't crash.
        } else {
            // Merge the two datasets
            const zeroDataMap = new Map((zeroData || []).map(p => [p.id, p]));
            mergedData = pubsData.map(pub => ({
                ...pub,
                guinness_zero_confirmations: zeroDataMap.get(pub.id)?.guinness_zero_confirmations || 0,
                guinness_zero_denials: zeroDataMap.get(pub.id)?.guinness_zero_denials || 0,
            }));
        }
    }

    const formatted = mergedData.map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      country_code: p.country_code,
      country_name: p.country_name,
      is_closed: p.is_closed,
      location: { lat: p.lat, lng: p.lng },
      is_dynamic_price_area: p.is_dynamic_price_area,
      area_identifier: p.area_identifier,
      area_rating_count: p.area_rating_count,
      guinness_zero_confirmations: p.guinness_zero_confirmations,
      guinness_zero_denials: p.guinness_zero_denials,
    }));
    setDbPubs(formatted);
    setIsDbPubsLoaded(true);
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
  }, []);

  const fetchAllRatings = useCallback(async () => {
    // This robust, two-query approach avoids complex RLS-related JOIN issues on the backend.
    
    // Step 1: Fetch all public ratings without joining profile data yet.
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('id, pub_id, user_id, price, quality, created_at, exact_price, image_url, like_count, comment_count, message')
      .eq('is_private', false)
      .order('created_at', { ascending: false });
  
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

  const fetchSocialData = useCallback(async (userId) => {
    if (!userId) return;
    
    // Fetch user's likes
    const { data: likesData, error: likesError } = await supabase
      .from('rating_likes')
      .select('rating_id')
      .eq('user_id', userId);
    if (likesError) console.error("Error fetching user likes:", likesError);
    else setUserLikes(new Set((likesData || []).map(l => l.rating_id)));

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

  }, [fetchUserZeroVotes]);

  const handleDataRefresh = useCallback(async () => {
      await Promise.all([
          fetchAllRatings(),
          fetchPubScores(),
          fetchDbPubs(),
          fetchClosedOsmPubs(),
          fetchOsmPubOverrides(),
          session?.user?.id ? fetchSocialData(session.user.id) : Promise.resolve(),
      ]);
  }, [fetchAllRatings, fetchPubScores, fetchDbPubs, fetchClosedOsmPubs, fetchOsmPubOverrides, fetchSocialData, session]);

  const handleCancelPubPlacement = useCallback(() => {
    trackEvent('add_pub_cancel', { step: pubPlacementState ? 'placement' : 'modal' });
    setIsAddPubModalOpen(false);
    setPubPlacementState(null);
    setFinalPlacementLocation(null);
    setIsConfirmingLocation(false);
  }, [pubPlacementState]);

  const handleTabChange = useCallback((tab) => {
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
    setProfileViewOrigin(null);

    // When the user explicitly clicks the Community tab, reset to the main feed.
    if (tab === 'community') {
        setCommunitySubTab('community');
    }

    // Tabs requiring auth
    if ((tab === 'profile' || tab === 'community' || tab === 'moderation' || tab === 'stats') && !session) {
      setIsAuthOpen(true);
      return;
    }
    // Tabs requiring developer or team member role
    if ((tab === 'stats') && !(userProfile?.is_developer || userProfile?.is_team_member)) {
        setActiveTab('map'); // Fail silently to map
        return;
    }
    // Tabs requiring ONLY developer role
    if ((tab === 'moderation') && !userProfile?.is_developer) {
        setActiveTab('map'); // Fail silently to map
        return;
    }

    setActiveTab(tab);
  }, [isDesktop, pubPlacementState, session, userProfile, handleCancelPubPlacement]);

  useEffect(() => {
    // This effect runs once when loading is complete to handle initial routing from URL params.
    if (loading || didProcessUrlParams.current) {
      return;
    }
    
    didProcessUrlParams.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const tab = urlParams.get('tab');

    if (page === 'terms') {
      // Manually set state to show the legal page within the settings tab.
      // We don't call handleTabChange because it resets the legal page view.
      setLegalPageView('terms');
      setActiveTab('settings');
    } else if (page === 'privacy') {
      setLegalPageView('privacy');
      setActiveTab('settings');
    } else if (tab) {
      // Use handleTabChange for PWA shortcuts as it contains auth logic.
      handleTabChange(tab);
    }
  }, [loading, handleTabChange]);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
    });
    
    fetchAllRatings();
    fetchPubScores();
    fetchLevelRequirements();
    fetchDbPubs();
    fetchClosedOsmPubs();
    fetchOsmPubOverrides();
    
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
            setFriendships([]);
            setUserLikes(new Set());
            setUserZeroVotes(new Map());
        }
    });

    return () => subscription.unsubscribe();
  }, [fetchAllRatings, fetchPubScores, fetchDbPubs, fetchClosedOsmPubs, fetchOsmPubOverrides]);
  

  // Real-time notifications listener
  // Depends on the primitive `userId` to prevent re-subscribing on every render.
  const userId = session?.user?.id;
  useEffect(() => {
      if (!userId) return;
  
      const handleNewNotification = async (payload) => {
        const newNotification = payload.new;
        let actorProfile = null;
        
        if (newNotification.actor_id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_id')
            .eq('id', newNotification.actor_id)
            .single();
          
          if (error) {
            console.error("Realtime listener failed to fetch actor profile:", error);
            actorProfile = { id: newNotification.actor_id, username: 'A user', avatar_id: null };
          } else {
            actorProfile = data;
          }
        }

        const fullNotification = { ...newNotification, actor: actorProfile };
        setNotifications(prev => [fullNotification, ...prev]);
        setToastNotification(fullNotification);
      };

      const channel = supabase
        .channel(`user-notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          handleNewNotification
        )
        .subscribe();
  
      return () => {
        supabase.removeChannel(channel);
      };
  }, [userId]);

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
        return { profile: null, ratings: [] };
    }

    const userId = currentSession.user.id;

    // Fetch user profile and friend count in parallel
    const [profileResult, friendCountResult] = await Promise.all([
        supabase.from('profiles').select('*, accepts_marketing').eq('id', userId).single(),
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
        return { profile: null, ratings: [] };
    }
    
    if (profile?.is_banned) {
        setUserProfile(profile);
        setUserRatings([]);
        return { profile, ratings: [] };
    }

    // Add friend count to the profile object
    profile.friends_count = friendCountResult.data || 0;
    if (friendCountResult.error) console.error("Error fetching friend count:", friendCountResult.error);

    setUserProfile(profile);

    // If profile exists, fetch ratings.
    const { data: userRatingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('id, pub_id, price, quality, created_at, exact_price, image_url, is_private, message, pubs(id, name, address, lat, lng, country_code, country_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    let mappedUserRatings = [];
    if (ratingsError) {
        console.error("Error fetching user ratings:", ratingsError);
    } else {
        mappedUserRatings = (userRatingsData || []).map(r => ({
          id: r.id, pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality, exact_price: r.exact_price, message: r.message },
          timestamp: new Date(r.created_at).getTime(),
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
    return { profile, ratings: mappedUserRatings };
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
      fetchSocialData(session.user.id);
    } else {
      setUserProfile(null);
      setUserRatings([]);
      setFriendships([]);
      setUserLikes(new Set());
      setUserZeroVotes(new Map());
    }
  }, [session, fetchSocialData]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);


  // --- CORE APP LOGIC & HANDLERS ---

  // Save settings to local storage whenever they change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Effect to automatically refresh pubs when the search radius setting changes.
  useEffect(() => {
    // Prevent this from running on the initial app load.
    if (initialSettingsLoad.current) {
        initialSettingsLoad.current = false;
        return;
    }
    
    // Clear any existing timeout to debounce the slider.
    if (radiusUpdateTimeout.current) {
        clearTimeout(radiusUpdateTimeout.current);
    }

    // Set a new timeout to trigger a refresh after the user stops changing the slider.
    radiusUpdateTimeout.current = setTimeout(() => {
        trackEvent('change_setting', { setting_name: 'radius', value: settings.radius });
        handleRefresh();
    }, 800); // 800ms debounce period

    // Cleanup timeout on component unmount or if radius changes again.
    return () => {
        if (radiusUpdateTimeout.current) {
            clearTimeout(radiusUpdateTimeout.current);
        }
    };
  }, [settings.radius]);


  const handleNominatimResults = useCallback((places, capped) => {
    if (!initialSearchComplete) {
      setInitialSearchComplete(true);
    }
    setNominatimResults(places || []);
    setResultsAreCapped(capped);
    setIsRefreshing(false);
  }, [initialSearchComplete]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setShowSearchAreaButton(false); // Hide the button when a search starts
    setRefreshTrigger(c => c + 1);
    setMapTileRefreshKey(Date.now()); // Force remount of TileLayer
    trackEvent('refresh_pubs');
  }, [isRefreshing]);

  const handleSearchAfterMove = useCallback(() => {
    // This function is called by the Map component after a 'flyTo' animation ends.
    if (searchOnNextMoveEnd) {
        handleRefresh();
        setSearchOnNextMoveEnd(false);
    }
  }, [searchOnNextMoveEnd, handleRefresh]);

  const handleSearchThisArea = useCallback(() => {
      trackEvent('click_search_this_area');
      setSearchOrigin(mapCenter); // Update the origin before searching
      handleRefresh();
  }, [handleRefresh, mapCenter]);

  const handleFindPlace = useCallback((location) => {
    if (location?.lat && location?.lng) {
        // Set both the search origin and map center to the new location.
        // This ensures distance calculations are correct for the new area.
        setSearchOrigin(location); 
        setMapCenter(location);
        
        // This is the key part: reuse existing logic to trigger a search
        // after the map's "flyTo" animation finishes.
        setSearchOnNextMoveEnd(true); 
    }
  }, []);

  const requestLocationPermission = useCallback(() => {
    trackEvent('location_permission_requested');
    if (!navigator.geolocation) {
        setLocationPermissionStatus('denied');
        setLocationError("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            if (!locationPermissionTracked.current) {
                trackEvent('location_permission_result', { status: 'granted' });
                locationPermissionTracked.current = true;
            }
            setLocationPermissionStatus('granted');
            const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            setRealUserLocation(newLocation);
            setLocationError(null);

            if (!initialLocationSet) {
                setSearchOrigin(newLocation);
                setMapCenter(newLocation);
                setInitialLocationSet(true);
                setSearchOnNextMoveEnd(true);
            }
        },
        (error) => {
            if (!locationPermissionTracked.current) {
                const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'error';
                trackEvent('location_permission_result', { status, error_code: error.code, error_message: error.message });
                locationPermissionTracked.current = true;
            }

            if (error.code === error.PERMISSION_DENIED) {
                setLocationError("Location access denied.");
                setLocationPermissionStatus('denied');
            } else {
                setLocationError("Could not get your location. Please check your device's location services and try again.");
                setLocationPermissionStatus('checking'); // Hides prompt, allows error banner to show
            }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [initialLocationSet]);

  // New effect to automatically request permission on load if it's in the 'prompt' state.
  useEffect(() => {
    if (locationPermissionStatus === 'prompt' && !initialLocationSet) {
      requestLocationPermission();
    }
  }, [locationPermissionStatus, requestLocationPermission, initialLocationSet]);

  const handleFindCurrentPub = useCallback(() => {
    if (locationPermissionStatus === 'granted' && realUserLocation && (realUserLocation.lat !== DEFAULT_LOCATION.lat || realUserLocation.lng !== DEFAULT_LOCATION.lng)) {
        trackEvent('recenter_map');
        setSearchOrigin(realUserLocation);
        setMapCenter(realUserLocation);
        setSearchOnNextMoveEnd(true);
    } else {
        requestLocationPermission();
    }
  }, [realUserLocation, locationPermissionStatus, requestLocationPermission]);

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
    // 1. Create a map for de-duplicated pubs, keyed by pub ID.
    const processedPubs = new Map();

    // 2. Add all database pubs first. They are the source of truth.
    dbPubs.forEach(dbPub => {
      processedPubs.set(dbPub.id, dbPub);
    });

    // 3. Process Nominatim results, checking for duplicates against our trusted DB list.
    nominatimResults.forEach(nominatimPub => {
      // Apply any name overrides first.
      const override = osmPubOverrides.get(nominatimPub.id);
      const finalNominatimPub = override ? { ...nominatimPub, name: override.name } : nominatimPub;

      // Skip if a pub with the same ID is already in our map (the DB version is superior).
      if (processedPubs.has(finalNominatimPub.id)) {
        return;
      }
      
      // Perform a spatial de-duplication check against ALL pubs already processed.
      // This prevents adding an OSM result that is a spatial duplicate of ANY DB pub (stoutly- or osm-).
      const isSpatialDuplicate = Array.from(processedPubs.values()).some(processedPub => {
        if (!finalNominatimPub.location || !processedPub.location) return false;
        
        const dist = getDistance(finalNominatimPub.location, processedPub.location);
        if (dist > 50) return false; // Not a duplicate if more than 50m away.
        
        // If close, check for similar names.
        const normOsmName = normalizePubNameForComparison(finalNominatimPub.name);
        const normDbName = normalizePubNameForComparison(processedPub.name);
        
        // Check if one name contains the other for fuzzy matching.
        return normOsmName.includes(normDbName) || normDbName.includes(normOsmName);
      });

      if (!isSpatialDuplicate) {
        processedPubs.set(finalNominatimPub.id, finalNominatimPub);
      }
    });

    // 4. Convert the de-duplicated map back to an array.
    const combinedPubs = Array.from(processedPubs.values());

    // 5. Filter the combined list for closed status and radius.
    const pubsInRadius = combinedPubs.filter(pub => {
      // Filter 1: Pub is marked as closed in our database.
      if (pub.is_closed) {
        return false;
      }
      
      // Filter 2: Pub is an OSM pub that's on our explicit blacklist.
      if (closedOsmPubIds.has(pub.id)) {
        return false;
      }

      // Filter 3: Pub is outside the search radius.
      if (!pub.location) return false; // Should not happen, but a good safeguard.
      const distance = getDistance(pub.location, searchOrigin);
      if (distance > settings.radius) {
        return false;
      }

      // If all checks pass, keep the pub.
      return true;
    });

    // 6. Enrich with ratings and scores, then update the state.
    const finalPubsList = pubsInRadius.map(pub => ({
      ...pub,
      ratings: allRatings.get(pub.id) || [],
      pub_score: pubScores.get(pub.id) ?? null,
    }));

    setPubs(finalPubsList);

  }, [nominatimResults, dbPubs, allRatings, pubScores, searchOrigin, settings.radius, getDistance, closedOsmPubIds, osmPubOverrides, normalizePubNameForComparison]);

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

  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationPermissionStatus('denied');
      return;
    }

    let permissionStatus;
    const handlePermissionChange = () => {
      setLocationPermissionStatus(permissionStatus.state);
    };

    navigator.permissions.query({ name: 'geolocation' }).then(status => {
      permissionStatus = status;
      setLocationPermissionStatus(permissionStatus.state);
      permissionStatus.addEventListener('change', handlePermissionChange);
    }).catch(error => {
        console.error("Could not query geolocation permission:", error);
        setLocationPermissionStatus('denied');
        setLocationError("Could not request location access.");
    });

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handlePermissionChange);
      }
    };
  }, []);

  useEffect(() => {
    let watcherId = null;

    if (locationPermissionStatus === 'granted') {
        watcherId = navigator.geolocation.watchPosition(
            (position) => {
                if (!locationPermissionTracked.current) {
                    trackEvent('location_permission_result', { status: 'granted' });
                    locationPermissionTracked.current = true;
                }
                const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                setRealUserLocation(newLocation);
                setLocationError(null);
            },
            (error) => {
                // Only show a generic "could not get location" error if we never successfully found the user.
                // This prevents the error banner from flashing if watchPosition times out after an initial success.
                // Always show an error if permission is explicitly revoked.
                if (realUserLocation === DEFAULT_LOCATION || error.code === error.PERMISSION_DENIED) {
                    const message = error.code === error.PERMISSION_DENIED ? "Location access was revoked." : "Could not get your location.";
                    setLocationError(message);
                }
                
                if (error.code === error.PERMISSION_DENIED) {
                    setLocationPermissionStatus('denied');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
    
    return () => {
        if (watcherId) {
            navigator.geolocation.clearWatch(watcherId);
        }
    };
  }, [locationPermissionStatus, realUserLocation]);

  useEffect(() => {
    const effectiveLocation = (settings.developerMode && settings.simulatedLocation)
      ? settings.simulatedLocation.coords : realUserLocation;
    
    setUserLocation(effectiveLocation);

    if (effectiveLocation !== DEFAULT_LOCATION && !initialLocationSet) {
      setSearchOrigin(effectiveLocation);
      setMapCenter(effectiveLocation);
      setInitialLocationSet(true);
      setSearchOnNextMoveEnd(true);
    }
  }, [settings.developerMode, settings.simulatedLocation, realUserLocation, initialLocationSet]);
  
  const handleMapMove = useCallback((newCenter) => {
    setMapCenter(newCenter);
    
    // If in placement mode, allow map movement without cancelling the flow or showing other buttons.
    if (pubPlacementState) {
        return;
    }
    
    const distance = getDistance(newCenter, searchOrigin);
    if (distance > 100) {
      setShowSearchAreaButton(true);
      trackEvent('map_dragged_show_search_button');
    }
  }, [searchOrigin, getDistance, pubPlacementState]);

  const getComparablePrice = useCallback((pub) => {
      if (!pub?.ratings?.length) return 999;
      const ratingsWithExactPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
      if (ratingsWithExactPrice.length > 0) {
          return ratingsWithExactPrice.reduce((acc, r) => acc + r.exact_price, 0) / ratingsWithExactPrice.length;
      }
      const avgStarRating = getAverageRating(pub.ratings, 'price');
      if (avgStarRating === 0) return 999;
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
      switch (filter) {
        case FilterType.PubScore:
          return (b.pub_score ?? -1) - (a.pub_score ?? -1);
        case FilterType.Price: return getComparablePrice(a) - getComparablePrice(b);
        case FilterType.Quality: return getAverageRating(b.ratings, 'quality') - getAverageRating(b.ratings, 'quality');
        default: return getDistance(a.location, searchOrigin) - getDistance(b.location, searchOrigin);
      }
    });
  }, [pubs, filter, filterGuinnessZero, searchOrigin, getDistance, getComparablePrice, getAverageRating]);

  const refreshSinglePubAndUserVotes = useCallback(async (pubId, userId) => {
    await fetchUserZeroVotes(userId);
    
    const { data: updatedPubData, error: pubFetchError } = await supabase
        .from('pubs')
        .select('id, name, address, lat, lng, country_code, country_name, is_closed, guinness_zero_confirmations, guinness_zero_denials')
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

        if (!isUpdating) {
            if (newProfile?.level > oldLevel) {
                const oldRank = getRankData(oldLevel);
                const newRank = getRankData(newProfile.level);
                if (newRank.name !== oldRank.name) {
                    setRankUpInfo({ key: Date.now(), newRank });
                    trackEvent('rank_up', { new_rank: newRank.name, level: newProfile.level });
                } else {
                    setLeveledUpInfo({ key: Date.now(), newLevel: newProfile.level });
                    trackEvent('level_up', { level: newProfile.level });
                }
            }
            setReviewPopupInfo({ key: Date.now() });
        } else {
            setUpdateConfirmationInfo({ key: Date.now() });
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
  }, [session, userRatings, selectedPub, userProfile, fetchUserData, fetchAllRatings, fetchPubScores, refreshSinglePubAndUserVotes]);
  
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
    // --- End Optimistic Updates ---

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
        setDeleteConfirmationInfo({ key: Date.now() });

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
  
  const handleSelectPub = useCallback(async (pub, highlightOptions = {}) => {
    const { highlightRatingId: ratingId, highlightCommentId: commentId } = highlightOptions;
    const pubId = pub ? pub.id : null;
    
    setHighlightedRatingId(ratingId || null);
    setHighlightedCommentId(commentId || null);

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
            .select('id, name, address, lat, lng, country_code, country_name, is_closed, guinness_zero_confirmations, guinness_zero_denials')
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

    // This part of the logic remains the same and runs for all selections.
    setSelectedPubId(pubId);
    setActiveTab('map');
    if (pubToSelect?.location) {
        setMapCenter(pubToSelect.location);
    }
    if (!isDesktop && !isListExpanded) {
        setIsListExpanded(true);
    }

    // If the pub wasn't in the list originally, also trigger a search around it
    // to populate the map with nearby pubs for context.
    if (!isPubInCurrentList && pubToSelect?.location) {
        setSearchOrigin(pubToSelect.location);
        setSearchOnNextMoveEnd(true);
    }
  }, [isDesktop, isListExpanded, pubs]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    trackEvent('change_filter', { filter_type: newFilter });
  };

  const handleToggleLike = useCallback(async (rating) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }

    const ratingId = rating.id;
    const pubId = rating.pub_id;
    const userId = session.user.id;
    const isLiked = userLikes.has(ratingId);
    
    trackEvent('toggle_like', { rating_id: ratingId, action: isLiked ? 'unlike' : 'like' });

    // --- Start optimistic updates ---
    const originalUserLikes = userLikes;
    const originalAllRatings = allRatings;

    // 1. Optimistic update for button color
    const newUserLikes = new Set(originalUserLikes);
    if (isLiked) {
      newUserLikes.delete(ratingId);
    } else {
      newUserLikes.add(ratingId);
    }
    setUserLikes(newUserLikes);

    // 2. Optimistic update for like count
    const newAllRatings = new Map(originalAllRatings);
    const pubRatings = newAllRatings.get(pubId);

    if (pubRatings) {
        const ratingIndex = pubRatings.findIndex(r => r.id === ratingId);
        if (ratingIndex !== -1) {
            const updatedRatings = [...pubRatings];
            const originalRating = updatedRatings[ratingIndex];
            const newCount = isLiked ? (originalRating.like_count || 0) - 1 : (originalRating.like_count || 0) + 1;
            updatedRatings[ratingIndex] = { ...originalRating, like_count: Math.max(0, newCount) };
            newAllRatings.set(pubId, updatedRatings);
            setAllRatings(newAllRatings);
        }
    }
    // --- End optimistic updates ---

    try {
      // 3. Database call
      if (isLiked) {
        const { error } = await supabase.from('rating_likes').delete().match({ rating_id: ratingId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rating_likes').insert({ rating_id: ratingId, user_id: userId });
        if (error) throw error;
      }
      
      // 4. Re-fetch from server to ensure consistency.
      await fetchAllRatings();
    } catch (error) {
        console.error("Error toggling like:", error);
        // 5. Revert on error
        setUserLikes(originalUserLikes);
        setAllRatings(originalAllRatings);
    }
  }, [session, userLikes, allRatings, fetchAllRatings]);
  
  const handleViewLegal = (page) => {
    trackEvent('view_legal_page', { page_name: page });
    setLegalPageView(page);
    // Ensure other full-screen views are closed
    setSelectedPubId(null);
  };
  
  const handleViewAdminPage = (page) => {
    trackEvent('view_admin_page', { page_name: page });
    setSettingsSubView(page);
  };

  const handlePlacementPinMove = useCallback((newLocation) => {
    setFinalPlacementLocation(newLocation);
  }, []);

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
    setProfileViewOrigin(origin); // store where the view was initiated from

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;
        
        // Correctly fetch the friend count
        const { data: friendCount, error: friendCountError } = await supabase.rpc('get_friends_count', { user_id_param: userId }).single();
        if (friendCountError) console.error("Error fetching friend count for viewed profile:", friendCountError);
        // Correctly assign the direct result of the RPC call.
        profile.friends_count = friendCount || 0;

        setViewedProfile(profile);

        // Fetch ratings for the viewed user
        // We only fetch non-private ratings for other users.
        const { data: ratings, error: ratingsError } = await supabase
            .from('ratings')
            .select('id, pub_id, price, quality, created_at, exact_price, image_url, is_private, message, pubs(id, name, address, lat, lng, country_code, country_name)')
            .eq('user_id', userId)
            .eq('is_private', false) // Important: respect privacy
            .order('created_at', { ascending: false });

        if (ratingsError) throw ratingsError;

        const mappedRatings = (ratings || []).map(r => ({
            id: r.id, pubId: r.pub_id,
            rating: { price: r.price, quality: r.quality, exact_price: r.exact_price, message: r.message },
            timestamp: new Date(r.created_at).getTime(),
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

  const handleBackFromProfileView = () => {
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
  };
  
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
              onBack={onBackHandler}
              onViewPub={handleSelectPub}
              loggedInUserProfile={userProfile}
              levelRequirements={levelRequirements}
              onAvatarChangeClick={() => setIsAvatarModalOpen(true)}
              onEditUsernameClick={() => setIsEditUsernameModalOpen(true)}
              onEditBioClick={() => setIsEditBioModalOpen(true)}
              onProfileUpdate={handleProfileUpdate}
              friendships={friendships}
              onFriendRequest={handleFriendRequest}
              onFriendAction={handleFriendAction}
              onViewFriends={handleViewFriends}
              onDeleteRating={handleDeleteRating}
          />
      );
  }, [
      viewedProfile, userProfile, viewedRatings, userRatings, 
      handleBackFromProfileView, handleSelectPub, levelRequirements, 
      handleProfileUpdate, friendships, handleFriendRequest, 
      handleFriendAction, handleViewFriends, handleDeleteRating
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
    const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=jsonv2&limit=1&addressdetails=1`;
  
    try {
      const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
      const data = await response.json();
  
      if (data && data.length > 0) {
        const place = data[0];
        const location = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
        
        setIsAddPubModalOpen(false);
        setPubPlacementState({ name, address });
        setFinalPlacementLocation(location);
        setMapCenter(location);
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
      const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${finalPlacementLocation.lat}&lon=${finalPlacementLocation.lng}&addressdetails=1`;
      const reverseResponse = await fetch(reverseUrl, { headers: { 'User-Agent': userAgent } });
      const reverseData = await reverseResponse.json();
      const country_code = reverseData?.address?.country_code || null;
      const country_name = reverseData?.address?.country || null;
      
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
      setAddPubSuccessInfo({ key: Date.now() });

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
      .select('id, created_at, content, user:user_id(id, username, avatar_id, level, is_developer)')
      .eq('rating_id', ratingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setCommentsByRating(prev => new Map(prev).set(ratingId, data));
    }
    setIsCommentsLoading(false);
  }, []);

  const handleAddComment = useCallback(async (ratingId, content) => {
    if (!session) return;
    trackEvent('add_comment', { rating_id: ratingId });

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({ rating_id: ratingId, user_id: session.user.id, content })
      .select('id, created_at, content, user:user_id(id, username, avatar_id, level, is_developer)')
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
      setCommentsByRating(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(ratingId) || [];
        newMap.set(ratingId, [...existing, newComment]);
        return newMap;
      });
      // A full refresh is needed to get the updated comment_count from the DB trigger.
      await fetchAllRatings(); 
    }
  }, [session, fetchAllRatings]);

  const handleDeleteComment = useCallback(async (commentId, ratingId) => {
    trackEvent('delete_comment', { comment_id: commentId });
    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (error) {
      alert(`Error deleting comment: ${error.message}`);
    } else {
      setCommentsByRating(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(ratingId) || [];
        newMap.set(ratingId, existing.filter(c => c.id !== commentId));
        return newMap;
      });
      await fetchAllRatings();
    }
  }, [fetchAllRatings]);

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
  }, [reportCommentInfo]);

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
  }, []);

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
  }, [fetchAllRatings]);

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
  }, [session, userProfile]);

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
        p_suggested_data: suggestionData.suggested_data,
        p_notes: suggestionData.notes,
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

  const layoutProps = {
      isDesktop,
      isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
      activeTab, handleTabChange, locationError, settings, filter, handleFilterChange,
      filterGuinnessZero, onFilterGuinnessZeroChange: setFilterGuinnessZero,
      handleRefresh, isRefreshing, sortedPubs, userLocation, mapCenter, searchOrigin,
      handleSelectPub, selectedPubId, highlightedRatingId, highlightedCommentId, handleNominatimResults, handleMapMove,
      refreshTrigger, getDistance, isListExpanded, setIsListExpanded,
      getAverageRating, resultsAreCapped, isDbPubsLoaded, initialSearchComplete,
      profilePage, session, userProfile, handleLogout: () => supabase.auth.signOut(),
      selectedPub, existingUserRatingForSelectedPub, handleRatePub,
      reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo, addPubSuccessInfo,
      isAvatarModalOpen, setIsAvatarModalOpen,
      viewedProfile, legalPageView, handleViewLegal, handleDataRefresh,
      installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
      showSearchAreaButton, handleSearchThisArea,
      searchOnNextMoveEnd, handleSearchAfterMove,
      pubPlacementState,
      isConfirmingLocation, finalPlacementLocation, handlePlacementPinMove, isSubmittingRating,
      CommunityPage, friendships, userLikes, onToggleLike: handleToggleLike, allRatings,
      viewingFriendsOf, friendsList, isFetchingFriendsList,
      deleteConfirmationInfo,
      communitySubTab, setCommunitySubTab,
      StatsPage,
      levelRequirements,
      settingsSubView, handleViewAdminPage,
      onOpenScoreExplanation: () => setIsPubScoreModalOpen(true),
      unreadNotificationsCount,
      notifications,
      commentsByRating, isCommentsLoading,
      locationPermissionStatus,
      mapTileRefreshKey,
      
      // Implemented handlers
      handleViewProfile,
      handleFriendRequest,
      handleFriendAction,
      handleViewFriends,
      onProfileUpdate: handleProfileUpdate,
      handleBackFromProfileView,
      handleBackFromFriendsList: () => setViewingFriendsOf(null),
      handleFindPlace,
      handleFindCurrentPub,
      requestLocationPermission,
      handleUpdateAvatar,
      
      // Guinness 0.0 handlers
      userZeroVotes,
      onGuinnessZeroVote: handleGuinnessZeroVote,
      onClearGuinnessZeroVote: handleClearGuinnessZeroVote,

      // Comments & Notifications
      onFetchComments: fetchCommentsForRating,
      onAddComment: handleAddComment,
      onDeleteComment: handleDeleteComment,
      onReportComment: handleOpenReportCommentModal,
      onMarkNotificationsAsRead: handleMarkNotificationsAsRead,
      
      // Implemented "Add Pub" flow handlers
      handleAddPubClick: handleAddPubClick,
      handleConfirmNewPub: handleConfirmNewPub,
      handleCancelPubPlacement: handleCancelPubPlacement,

      // "Suggest Edit" handlers
      onOpenSuggestEditModal: handleOpenSuggestEditModal,

      // Moderation
      reportedComments,
      onFetchReportedComments: fetchReportedComments,
      onResolveCommentReport: handleResolveCommentReport,
      onAdminDeleteComment: handleAdminDeleteComment,
      reportCommentInfo,
      onCloseReportCommentModal: () => setReportCommentInfo({ isOpen: false, comment: null }),
      onSubmitReportComment: handleReportComment,
      
      // Stubs
      handleSettingsChange: setSettings,
      handleSetSimulatedLocation: () => {},

      // Toast Notification
      toastNotification,
      onCloseToast: () => setToastNotification(null),
      onToastClick: handleToastClick,
      
      // New handler for marketing consent
      handleMarketingConsentChange,
      
      // Username and Bio change
      onEditUsernameClick: () => setIsEditUsernameModalOpen(true),
      onEditBioClick: () => setIsEditBioModalOpen(true),
  };

  const renderModals = () => (
    <>
        {isPubScoreModalOpen && <PubScoreExplanationModal isOpen={isPubScoreModalOpen} onClose={() => setIsPubScoreModalOpen(false)} />}
        {isEditUsernameModalOpen && userProfile && (
          <EditUsernameModal
            userProfile={userProfile}
            onClose={() => setIsEditUsernameModalOpen(false)}
            onSubmit={handleUpdateUsername}
          />
        )}
        {isEditBioModalOpen && userProfile && (
          <EditBioModal
            currentBio={userProfile.bio}
            onClose={() => setIsEditBioModalOpen(false)}
            onSubmit={handleUpdateBio}
          />
        )}
        {isAddPubModalOpen && (
            <AddPubModal 
                onClose={handleCancelPubPlacement}
                onSubmit={handleStartPubPlacement}
            />
        )}
        {isSuggestEditModalOpen && pubToEdit && (
            <SuggestEditModal
                pub={pubToEdit}
                onClose={() => setIsSuggestEditModalOpen(false)}
                onSubmit={handleSubmitEditSuggestion}
            />
        )}
        {alertInfo.isOpen && (
            <AlertModal
                onClose={() => setAlertInfo({ isOpen: false })}
                title={alertInfo.title}
                message={alertInfo.message}
                theme={alertInfo.theme}
            />
        )}
    </>
  );

  if (userProfile?.is_banned) {
    return <BannedPage userProfile={userProfile} onLogout={() => supabase.auth.signOut()} />;
  }
  
  const AppContent = isDesktop ? <DesktopLayout {...layoutProps} /> : <MobileLayout {...layoutProps} />;

  return (
    <OnlineStatusContext.Provider value={{ onlineUserIds }}>
      {renderModals()}
      {AppContent}
      {cookieConsent === null && (
        <CookieConsentBanner
          onAccept={handleAcceptCookies}
          onDecline={handleDeclineCookies}
        />
      )}
    </OnlineStatusContext.Provider>
  );
};

export default App;