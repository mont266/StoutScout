import React, { useMemo, useState, useRef, useEffect, useContext, useCallback } from 'react';
import StarRating from './StarRating.jsx';
import RatingForm from './RatingForm.jsx';
import ImageModal from './ImageModal.jsx';
import ReportImageModal from './ReportImageModal.jsx';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import { formatTimeAgo, getCurrencyInfo, getDisplayPrice } from '../utils.js';
import Avatar from './Avatar.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';
import CommentsSection from './CommentsSection.jsx';
import CertifiedBadge from './CertifiedBadge.jsx';
import RatingCard from './RatingCard.jsx';
import CertifiedExplanationModal from './CertifiedExplanationModal.jsx';
import { ExchangeRatesContext } from '../contexts/ExchangeRatesContext.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import PostCard from './PostCard.jsx';
import CheckInModal from './CheckInModal.jsx';
import CheckInCard from './CheckInCard.jsx';

const Section = React.forwardRef(({ title, children, ...props }, ref) => (
    <section ref={ref} {...props} aria-labelledby={title ? `section-title-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}>
        {title && (
            <h3 id={`section-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {title}
            </h3>
        )}
        {children}
    </section>
));

const ScoreGauge = ({ score }) => {
  if (score === null || score === undefined) return null;

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-yellow-400';
    if (s >= 65) return 'text-green-500';
    if (s >= 45) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45; // radius is 45
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle className="text-gray-200 dark:text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
        {/* Progress circle */}
        <circle
          className={`${color} transition-all duration-1000 ease-in-out`}
          style={{ strokeDashoffset: offset }}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
};

const PintGallery = ({ ratings, onViewImage }) => {
    const imageRatings = ratings.filter(r => !!r.image_url);
    if (imageRatings.length === 0) return null;

    return (
        <Section title="Pint Gallery">
            <div className="flex overflow-x-auto space-x-3 pb-2 -mx-4 px-4">
                {imageRatings.map(rating => (
                    <button 
                        key={rating.id}
                        onClick={() => onViewImage(rating)}
                        className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none transition shadow-md"
                    >
                        <img src={rating.image_url} alt={`Pint by ${rating.user.username}`} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </Section>
    );
};


const PubDetails = ({ pub, onClose, handleRatePub, getAverageRating, existingUserRating, session, onLoginRequest, onViewProfile, loggedInUserProfile, onDataRefresh, userLikes, onToggleLike, isSubmittingRating, onOpenScoreExplanation, onOpenSuggestEditModal, commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportContent, highlightedRatingId, highlightedCommentId, highlightedPostId, userZeroVotes, onGuinnessZeroVote, onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal, setAlertInfo, top10PubIds = [], onViewPub, isEditRatingFlow, userPostLikes, onTogglePostLike, commentsByPost, isPostCommentsLoading, onFetchCommentsForPost, onAddPostComment, onDeletePostComment, onEditPost, onDeletePost, onOpenSharePostModal, pubScores, dbPubs, getDistance, userLocation, onDeleteRating, handleAddXP, handleRemoveXP }) => {
  const [localPub, setLocalPub] = useState(pub);
  const [imageToView, setImageToView] = useState(null);
  const [reportModalInfo, setReportModalInfo] = useState({ isOpen: false, rating: null });
  const [isRatingFormExpanded, setIsRatingFormExpanded] = useState((isEditRatingFlow && !!existingUserRating) || (!existingUserRating && !!session));
  const [confirmation, setConfirmation] = useState({ isOpen: false });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [visibleComments, setVisibleComments] = useState({});
  const ratingsListRef = useRef(null);
  const postsListRef = useRef(null);
  const yourRatingSectionRef = useRef(null);
  const communityActivityRef = useRef(null);
  const [isDevInfoVisible, setIsDevInfoVisible] = useState(false);
  const [isCertifiedModalOpen, setIsCertifiedModalOpen] = useState(false);
  const { rates: exchangeRates } = useContext(ExchangeRatesContext);
  const isDesktop = useIsDesktop();
  const [pubPosts, setPubPosts] = useState([]);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  const [pubCheckins, setPubCheckins] = useState([]);
  const [isFetchingCheckins, setIsFetchingCheckins] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState('all'); // 'all', 'ratings', 'posts', 'checkins'
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [simulateProximity, setSimulateProximity] = useState(false);

  const areaStats = useMemo(() => {
      if (!localPub || !localPub.pub_score || !dbPubs || !getDistance) return null;
      
      const AREA_RADIUS_METERS = 5000; // 5km radius
      const MIN_PUBS_FOR_AVERAGE = 3;
      
      let totalScore = 0;
      let count = 0;
      
      for (const p of dbPubs) {
          if (!p.location?.lat || !p.location?.lng) continue; 
          
          const pScore = p.pub_score !== undefined ? p.pub_score : (pubScores && pubScores.get(p.id));
          if (pScore == null) continue;

          const dist = getDistance({lat: localPub.location?.lat, lng: localPub.location?.lng}, {lat: p.location.lat, lng: p.location.lng});
          if (dist <= AREA_RADIUS_METERS) {
              totalScore += pScore;
              count++;
          }
      }
      
      if (count >= MIN_PUBS_FOR_AVERAGE) {
          return {
              average: Math.round(totalScore / count),
              count
          };
      }
      return null;
  }, [localPub, dbPubs, pubScores, getDistance]);

  useEffect(() => {
    const fetchPubPosts = async () => {
        if (!localPub.id) return;
        setIsFetchingPosts(true);
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`*, user:user_id!inner(id, username, avatar_id, level, is_banned, is_developer, is_stoutly_legend), attached_pubs:post_pubs!inner(pub_id, pub:pubs(id, name, address, lat, lng))`)
                .eq('attached_pubs.pub_id', localPub.id)
                .eq('user.is_banned', false)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching pub posts:", error);
            } else {
                setPubPosts(data || []);
            }
        } catch (err) {
            console.error("Error in fetchPubPosts:", err);
        } finally {
            setIsFetchingPosts(false);
        }
    };

    const fetchPubCheckins = async () => {
        if (!localPub.id) return;
        setIsFetchingCheckins(true);
        try {
            const { data, error } = await supabase
                .from('pub_checkins')
                .select(`*, user:user_id!inner(id, username, avatar_id, level, is_banned, is_developer, is_stoutly_legend)`)
                .eq('pub_id', localPub.id)
                .eq('user.is_banned', false)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching pub checkins:", error);
            } else {
                const formattedData = (data || []).map(checkin => ({
                    ...checkin,
                    pub: {
                        id: localPub.id,
                        name: localPub.name,
                        address: localPub.address,
                        lat: localPub.lat,
                        lng: localPub.lng,
                        country_code: localPub.country_code,
                        country_name: localPub.country_name
                    }
                }));
                setPubCheckins(formattedData);
            }
        } catch (err) {
            console.error("Error in fetchPubCheckins:", err);
        } finally {
            setIsFetchingCheckins(false);
        }
    };

    fetchPubPosts();
    fetchPubCheckins();
  }, [localPub.id]);

  const combinedFeed = useMemo(() => {
    let feedItems = [];

    // Add Ratings
    if (localPub.ratings && (feedFilter === 'all' || feedFilter === 'ratings')) {
        let ratingItems = localPub.ratings.map(r => ({ ...r, feedType: 'rating' }));
        if (showMineOnly && session) {
            ratingItems = ratingItems.filter(r => r.user_id === session.user.id);
        }
        feedItems = feedItems.concat(ratingItems);
    }

    // Add Posts
    if (pubPosts && (feedFilter === 'all' || feedFilter === 'posts')) {
        let postItems = pubPosts.map(p => ({ ...p, feedType: 'post' }));
        if (showMineOnly && session) {
            postItems = postItems.filter(p => p.user_id === session.user.id);
        }
        feedItems = feedItems.concat(postItems);
    }

    // Add Checkins
    if (pubCheckins && (feedFilter === 'all' || feedFilter === 'checkins')) {
        let checkinItems = pubCheckins.map(c => ({ ...c, feedType: 'checkin' }));
        if (showMineOnly && session) {
            checkinItems = checkinItems.filter(c => c.user_id === session.user.id);
        }
        feedItems = feedItems.concat(checkinItems);
    }

    // Sort by date (newest first)
    feedItems.sort((a, b) => {
        const dateA = new Date(a.created_at || a.timestamp);
        const dateB = new Date(b.created_at || b.timestamp);
        return dateB - dateA;
    });

    return feedItems;
  }, [localPub.ratings, pubPosts, pubCheckins, feedFilter, showMineOnly, session]);

  const isCertified = localPub.certification_status === 'certified' || localPub.certification_status === 'at_risk';
  const isDeveloper = loggedInUserProfile?.is_developer;

  const rank = useMemo(() => {
    if (!top10PubIds || top10PubIds.length === 0) return null;
    const index = top10PubIds.indexOf(localPub.id);
    return index !== -1 ? index + 1 : null;
  }, [top10PubIds, localPub.id]);

  useEffect(() => {
    setLocalPub(pub); 
    const hasCountryInfo = pub.country_code || pub.country_name;
    const isRated = pub.ratings?.length > 0 || pub.pub_score != null;

    if (!hasCountryInfo && pub.id && pub.location) {
        if (isRated) {
            const fetchFullPubData = async () => {
                const { data, error } = await supabase
                    .from('pubs')
                    .select('id, name, address, lat, lng, country_code, country_name, certification_status, certified_since, is_closed, guinness_zero_confirmations, guinness_zero_denials, local_avg_price, checkin_count')
                    .eq('id', pub.id)
                    .single();
                if (data && !error) {
                    const { is_closed: _, ...restOfData } = data;
                    setLocalPub(prevPub => ({
                        ...prevPub,
                        ...restOfData,
                        location: { lat: data.lat, lng: data.lng },
                    }));
                }
            };
            fetchFullPubData();
        } else {
            const reverseGeocodeForCountry = async () => {
                try {
                    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${pub.location.lng},${pub.location.lat}.json?access_token=${accessToken}&types=country`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data && data.features?.length > 0 && data.features[0].context) {
                        const country = data.features[0].context.find(c => c.id.startsWith('country'));
                        if (country) {
                             setLocalPub(prevPub => ({
                                ...prevPub,
                                country_code: country.short_code,
                                country_name: country.text,
                            }));
                        }
                    }
                } catch (error) {
                    console.error("Reverse geocoding for country failed:", error);
                }
            };
            reverseGeocodeForCountry();
        }
    }
  }, [pub]);
  
    useEffect(() => {
        // Scroll to the rating form if it was opened via the "Edit" flow
        if (isEditRatingFlow && existingUserRating && yourRatingSectionRef.current) {
            setTimeout(() => {
                yourRatingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400); // A short delay for the panel animation to finish
        }
    }, [isEditRatingFlow, existingUserRating]);

  useEffect(() => {
    if (highlightedRatingId && ratingsListRef.current) {
      setTimeout(() => {
        const element = ratingsListRef.current.querySelector(`[data-rating-id="${highlightedRatingId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-rating');
          setTimeout(() => {
            element.classList.remove('highlight-rating');
          }, 2500); // Highlight for 2.5 seconds
        }
      }, 350); // Increased from 100 to wait for panel transition to complete
    }
  }, [highlightedRatingId, localPub.ratings]);

  useEffect(() => {
    if (highlightedPostId && postsListRef.current) {
      setTimeout(() => {
        const element = postsListRef.current.querySelector(`[data-post-id="${highlightedPostId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-rating');
          setTimeout(() => {
            element.classList.remove('highlight-rating');
          }, 2500);
        }
      }, 350);
    }
  }, [highlightedPostId, pubPosts]);
  
    useEffect(() => {
        if (highlightedCommentId) {
            // Find which rating the highlighted comment belongs to
            const targetRating = (localPub.ratings || []).find(rating => {
                const ratingComments = commentsByRating.get(rating.id);
                return ratingComments && ratingComments.some(c => c.id === highlightedCommentId || c.parent_comment_id === highlightedCommentId);
            });
            
            // This logic is now handled inside RatingCard, but we still scroll to the right card.
            if (targetRating && ratingsListRef.current) {
                setTimeout(() => {
                    const element = ratingsListRef.current.querySelector(`[data-rating-id="${targetRating.id}"]`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 350);
            }
        }
    }, [highlightedCommentId, localPub.ratings, commentsByRating]);

  const handleScrollToCommunityActivity = (filterType) => {
    if (filterType) {
        setFeedFilter(filterType);
    }
    if (communityActivityRef.current) {
        communityActivityRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        trackEvent('click_scroll_to_community_activity', { pub_id: localPub.id, filter: filterType });
    }
  };

  const avgQuality = getAverageRating(localPub.ratings, 'quality');
  const avgPrice = localPub.dynamic_price_score !== undefined && localPub.dynamic_price_score !== null 
    ? localPub.dynamic_price_score 
    : getAverageRating(localPub.ratings, 'price');
  
  const currencyInfo = getCurrencyInfo(localPub);
  
  const priceInfo = useMemo(() => {
    const recentMedianPrice = getDisplayPrice(localPub.ratings);
    if (recentMedianPrice === null) return { text: `${avgPrice.toFixed(1)} / 5`, stars: avgPrice, originalPrice: null, convertedPrice: null, originalCode: null, convertedCode: null };

    const userHomeCurrency = getCurrencyInfo(loggedInUserProfile || { country_code: 'gb' });
    let convertedPriceText = null;
    let convertedCode = null;
    if (
        recentMedianPrice > 0 && 
        exchangeRates &&
        currencyInfo.code !== userHomeCurrency.code &&
        exchangeRates[currencyInfo.code] &&
        exchangeRates[userHomeCurrency.code]
    ) {
        const priceInGbp = recentMedianPrice / exchangeRates[currencyInfo.code];
        const convertedPrice = priceInGbp * exchangeRates[userHomeCurrency.code];
        convertedPriceText = `${userHomeCurrency.symbol}${convertedPrice.toFixed(2)}`;
        convertedCode = userHomeCurrency.code;
    }

    return { 
        text: `${currencyInfo.symbol}${recentMedianPrice.toFixed(2)}`, 
        stars: avgPrice,
        originalPrice: `${currencyInfo.symbol}${recentMedianPrice.toFixed(2)}`,
        convertedPrice: convertedPriceText,
        originalCode: currencyInfo.code,
        convertedCode: convertedCode,
    };
  }, [localPub.ratings, avgPrice, currencyInfo, loggedInUserProfile, exchangeRates]);

  const handleLocalToggleLike = useCallback((ratingToToggle) => {
    if (!loggedInUserProfile) {
        onToggleLike(ratingToToggle);
        return;
    }
    setLocalPub(prevPub => {
        if (!prevPub.ratings) return prevPub;
        const newRatings = prevPub.ratings.map(rating => {
            if (rating.id === ratingToToggle.id) {
                const isLiked = userLikes.has(ratingToToggle.id);
                const newLikeCount = isLiked
                    ? Math.max(0, (rating.like_count || 1) - 1)
                    : (rating.like_count || 0) + 1;
                return { ...rating, like_count: newLikeCount };
            }
            return rating;
        });
        return { ...prevPub, ratings: newRatings };
    });
    onToggleLike(ratingToToggle);
  }, [loggedInUserProfile, userLikes, onToggleLike]);

  const handleInitiateReport = (ratingToReport) => {
    setImageToView(null); // Close the image modal first
    setReportModalInfo({ isOpen: true, rating: ratingToReport }); // Then open the report modal
  };

  const handleReportImage = async (rating, reason) => {
      if (!session) {
          setAlertInfo({ isOpen: true, title: 'Login Required', message: 'You must be logged in to report an image.', theme: 'info' });
          return;
      }
      trackEvent('report_image', { rating_id: rating.id, reason });
      try {
          const { error } = await supabase.functions.invoke('report-image', {
              body: { rating_id: rating.id, reason },
          });
          if (error) throw error;
          setAlertInfo({ isOpen: true, title: 'Report Submitted', message: 'Thank you. The image has been reported and will be reviewed.', theme: 'success' });
      } catch (error) {
          console.error("Failed to report image:", error);
          setAlertInfo({ isOpen: true, title: 'Report Failed', message: `Could not report image: ${error.context?.responseJson?.error || error.message}`, theme: 'error' });
      }
      setReportModalInfo({ isOpen: false, rating: null });
  };
  
  const confirmAdminRemoveImage = (ratingToRemove) => {
    setConfirmation({
        isOpen: true,
        title: 'Remove Image?',
        message: 'Are you sure you want to remove this image? This action is permanent and cannot be undone.',
        onConfirm: async () => {
            await handleAdminRemoveImage(ratingToRemove);
            setConfirmation({ isOpen: false });
        },
        confirmText: 'Remove',
        theme: 'red'
    });
  };

  const handleAdminRemoveImage = async (ratingToRemove) => {
    setIsActionLoading(true);
    trackEvent('admin_remove_image', { rating_id: ratingToRemove.id });
    try {
      const { error } = await supabase.functions.invoke('remove-image-admin', {
        body: { rating_id: ratingToRemove.id },
      });
      if (error) throw error;
      setAlertInfo({ isOpen: true, title: 'Image Removed', message: 'Image removed successfully.', theme: 'success' });
      onDataRefresh(); // Refresh app-wide data
    } catch (error) {
      console.error("Failed to remove image as admin:", error);
      setAlertInfo({ isOpen: true, title: 'Error', message: `Could not remove image: ${error.context?.responseJson?.error || error.message}`, theme: 'error' });
    }
    setImageToView(null);
    setIsActionLoading(false);
  };

  const handleRatingSubmit = (ratingData) => {
    handleRatePub(localPub.id, localPub.name, localPub.address, ratingData);
    // Collapse the form after a new submission, but not after an update.
    if (!existingUserRating) {
        setIsRatingFormExpanded(false);
    }
  }
  
  const toggleComments = (ratingId) => {
    setVisibleComments(prev => {
        const isVisible = !!prev[ratingId];
        if (!isVisible) {
            onFetchComments(ratingId);
        }
        return { ...prev, [ratingId]: !isVisible };
    });
  };

  const handleOpenCertifiedModal = () => {
    trackEvent('view_certification_details', { pub_id: localPub.id, pub_name: localPub.name });
    setIsCertifiedModalOpen(true);
  };
  
  const GuinnessZeroStatus = () => {
    const confirms = localPub.guinness_zero_confirmations || 0;
    const denials = localPub.guinness_zero_denials || 0;
    const totalVotes = confirms + denials;

    let status = 'Unknown';
    let statusIcon = 'fa-question-circle';
    let statusColor = 'text-gray-500 dark:text-gray-400';
    let message = "No one has reported on Guinness 0.0 availability here yet. Be the first!";

    if (totalVotes > 0) {
        if (confirms > denials) {
            status = 'Confirmed';
            statusIcon = 'fa-check-circle';
            statusColor = 'text-green-500';
            message = `${confirms} of ${totalVotes} people confirmed it's sold here.`;
        } else if (denials > confirms) {
            status = 'Unlikely';
            statusIcon = 'fa-times-circle';
            statusColor = 'text-red-500';
            message = `${denials} of ${totalVotes} people reported it's not sold here.`;
        } else { // Equal votes
             status = 'Contested';
             statusIcon = 'fa-balance-scale-right';
             statusColor = 'text-yellow-500';
             message = "There are conflicting reports about availability.";
        }
    }
    
    return (
        <Section title="Guinness 0.0 Status">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex items-center space-x-3">
                    <i className={`fas ${statusIcon} text-2xl ${statusColor}`}></i>
                    <div>
                        <h4 className={`text-lg font-bold ${statusColor}`}>{status}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
                    </div>
                </div>
            </div>
        </Section>
    );
  };

  const renderYourRatingSection = () => {
    if (localPub.is_closed) return null;

    const handleCheckInClick = () => {
        if (!session) {
            onLoginRequest();
            return;
        }
        if (!canCheckIn) {
            return;
        }
        setIsCheckInModalOpen(true);
    };

    let canCheckIn = true;
    let timeUntilNextCheckIn = null;
    let isNearPub = false;

    if (userLocation && localPub && localPub.location && getDistance) {
        const distanceToPub = getDistance(userLocation, localPub.location);
        if (distanceToPub <= 250 || simulateProximity) { // 250 meters
            isNearPub = true;
        }
    }

    if (!existingUserRating) {
        canCheckIn = false;
        timeUntilNextCheckIn = "Rate this pub first.";
    } else {
        const ratingTime = new Date(existingUserRating.timestamp).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const timeDiffFromRating = Date.now() - ratingTime;
        
        if (timeDiffFromRating < twentyFourHours) {
            canCheckIn = false;
            const msUntilAvailable = twentyFourHours - timeDiffFromRating;
            const hoursWait = Math.floor(msUntilAvailable / (60 * 60 * 1000));
            const minsWait = Math.floor((msUntilAvailable % (60 * 60 * 1000)) / (60 * 1000));
            if (hoursWait > 0) {
                timeUntilNextCheckIn = `Unlock in ${hoursWait}h ${minsWait}m`;
            } else {
                timeUntilNextCheckIn = `Unlock in ${minsWait}m`;
            }
        }
    }

    if (canCheckIn && !isNearPub) {
        canCheckIn = false;
        timeUntilNextCheckIn = "You must be near the pub to check in.";
    }

    if (canCheckIn && session && pubCheckins && pubCheckins.length > 0) {
        const userCheckins = pubCheckins.filter(c => c.user_id === session.user.id);
        if (userCheckins.length > 0) {
            const mostRecentCheckInTime = new Date(userCheckins[0].created_at).getTime();
            const twelveHours = 12 * 60 * 60 * 1000;
            const timeDiff = Date.now() - mostRecentCheckInTime;
            if (timeDiff < twelveHours) {
                canCheckIn = false;
                const msUntilNext = twelveHours - timeDiff;
                const hoursWait = Math.floor(msUntilNext / (60 * 60 * 1000));
                const minsWait = Math.floor((msUntilNext % (60 * 60 * 1000)) / (60 * 1000));
                if (hoursWait > 0) {
                    timeUntilNextCheckIn = `Available in ${hoursWait}h ${minsWait}m`;
                } else {
                    timeUntilNextCheckIn = `Available in ${minsWait}m`;
                }
            }
        }
    }

    if (!session) {
        return (
            <Section title="Your Rating">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center shadow-md">
                    <p className="text-gray-700 dark:text-gray-300 mb-3">Want to rate this pub?</p>
                    <button
                        onClick={onLoginRequest}
                        className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                        Sign In or Create Account
                    </button>
                </div>
            </Section>
        );
    }
    
    if (existingUserRating) {
        return (
            <Section title="Your Rating & Check-in" ref={yourRatingSectionRef}>
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y divide-gray-100 dark:divide-gray-700">
                    <button 
                        onClick={handleCheckInClick}
                        disabled={!canCheckIn}
                        className={`w-full text-left p-4 rounded-t-lg flex justify-between items-center transition-colors ${canCheckIn ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : 'cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-800/50'}`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${canCheckIn ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                <i className="fas fa-location-dot"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-800 dark:text-white">Check In</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {canCheckIn ? 'Back again? Let us know quickly!' : timeUntilNextCheckIn}
                                </p>
                            </div>
                        </div>
                        <i className={`fas fa-chevron-right ${canCheckIn ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}></i>
                    </button>
                    {!isRatingFormExpanded && (
                         <button 
                            onClick={() => setIsRatingFormExpanded(true)}
                            className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-b-lg flex justify-between items-center transition-colors"
                         >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <i className="fas fa-solid fa-pen"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-white">Update Your Rating</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">You rated this pub on {new Date(existingUserRating.timestamp).toLocaleDateString()}.</p>
                                </div>
                            </div>
                            <i className="fas fa-chevron-down text-gray-500 dark:text-gray-400"></i>
                        </button>
                    )}
                    {isRatingFormExpanded && (
                         <RatingForm
                            onSubmit={handleRatingSubmit}
                            existingRating={existingUserRating.rating}
                            existingImageUrl={existingUserRating.image_url}
                            existingIsPrivate={existingUserRating.is_private}
                            currencyInfo={currencyInfo}
                            isSubmitting={isSubmittingRating}
                            userZeroVote={userZeroVotes.get(localPub.id)}
                        />
                    )}
                </div>
            </Section>
        );
    }

    // New rating, form is inside a collapsible section
    return (
        <Section title="Your Rating & Check-in" ref={yourRatingSectionRef}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y divide-gray-100 dark:divide-gray-700">
                <button 
                    onClick={handleCheckInClick}
                    disabled={!canCheckIn}
                    className={`w-full text-left p-4 rounded-t-lg flex justify-between items-center transition-colors ${canCheckIn ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : 'cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-800/50'}`}
                >
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${canCheckIn ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            <i className="fas fa-location-dot"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-gray-800 dark:text-white">Check In</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {canCheckIn ? 'Back again? Let us know quickly!' : timeUntilNextCheckIn}
                            </p>
                        </div>
                    </div>
                    <i className={`fas fa-chevron-right ${canCheckIn ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}></i>
                </button>
                {!isRatingFormExpanded && (
                    <button 
                        onClick={() => setIsRatingFormExpanded(true)}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-b-lg flex justify-between items-center transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <i className="fas fa-star"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-800 dark:text-white">Rate This Pub</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Share your experience with the community.</p>
                            </div>
                        </div>
                         <i className="fas fa-chevron-down text-gray-500 dark:text-gray-400"></i>
                    </button>
                )}
                 {isRatingFormExpanded && (
                    <RatingForm
                        onSubmit={handleRatingSubmit}
                        currencyInfo={currencyInfo}
                        isSubmitting={isSubmittingRating}
                        userZeroVote={userZeroVotes.get(localPub.id)}
                    />
                 )}
            </div>
        </Section>
    );
  };


  return (
    <>
    {imageToView && <ImageModal rating={imageToView} onClose={() => setImageToView(null)} onReport={() => handleInitiateReport(imageToView)} canReport={loggedInUserProfile && loggedInUserProfile.id !== imageToView.user.id} canAdminRemove={isDeveloper} onAdminRemove={confirmAdminRemoveImage} isDeveloper={isDeveloper} />}
    {reportModalInfo.isOpen && <ReportImageModal onClose={() => setReportModalInfo({ isOpen: false, rating: null })} onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)} />}
    {confirmation.isOpen && <ConfirmationModal {...confirmation} isLoading={isActionLoading} onClose={() => setConfirmation({ isOpen: false })} />}
    {isCertifiedModalOpen && <CertifiedExplanationModal isOpen={isCertifiedModalOpen} onClose={() => setIsCertifiedModalOpen(false)} />}

    <div className="flex flex-col bg-gray-100 dark:bg-gray-900 h-full">
        <header className="sticky top-0 p-4 bg-white dark:bg-gray-800 shadow-md z-10 flex-shrink-0">
            <div className="flex items-center space-x-2">
                <button
                    onClick={onClose}
                    className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors h-10 w-10 flex items-center justify-center rounded-full"
                    aria-label="Back to map"
                >
                    <i className="fas fa-arrow-left fa-lg"></i>
                </button>
                <div className="flex-grow min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate" title={localPub.name}>
                        {localPub.name}
                    </h1>
                    <p 
                        className={`text-xs text-gray-500 dark:text-gray-400 ${isAddressExpanded ? '' : 'truncate'} cursor-pointer md:cursor-auto active:bg-gray-100 dark:active:bg-gray-800 rounded`} 
                        title={localPub.address}
                        onClick={() => !isDesktop && setIsAddressExpanded(!isAddressExpanded)}
                    >
                        {localPub.address}
                    </p>
                </div>
                {isDeveloper && (
                    <button
                        onClick={() => setIsDevInfoVisible(prev => !prev)}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isDevInfoVisible
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        aria-label="Toggle Developer Info"
                        title="Toggle Developer Info"
                    >
                        <i className="fas fa-code"></i>
                    </button>
                )}
                 <button
                    onClick={() => onOpenSuggestEditModal(localPub)}
                    className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full"
                    aria-label="Suggest an edit"
                    title="Suggest an edit"
                >
                    <i className="fas fa-edit fa-lg"></i>
                </button>
                 <button
                    onClick={() => onOpenShareModal(localPub)}
                    className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full"
                    aria-label="Share pub"
                >
                    <i className="fas fa-share-alt fa-lg"></i>
                </button>
            </div>
        </header>

        <main className="flex-grow overflow-y-auto">
            <div className={`w-full ${isDesktop ? 'max-w-3xl mx-auto' : ''} p-4 space-y-6`}>
                {isDevInfoVisible && isDeveloper && (
                    <Section>
                        <div className="p-3 bg-gray-200 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 break-all animate-fade-in-down space-y-2">
                            <p><strong>Pub ID:</strong> {localPub.id}</p>
                            <p><strong>Local Avg Price:</strong> {localPub.local_avg_price ? `${currencyInfo.symbol}${localPub.local_avg_price.toFixed(2)}` : 'N/A'}</p>
                            <button
                                onClick={() => setSimulateProximity(!simulateProximity)}
                                className={`px-2 py-1 rounded text-white ${simulateProximity ? 'bg-amber-600' : 'bg-gray-500 hover:bg-gray-600'} transition-colors mt-2`}
                            >
                                {simulateProximity ? 'Simulate Proximity: ON' : 'Simulate Proximity: OFF'}
                            </button>
                        </div>
                    </Section>
                )}
                {localPub.is_closed && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-800 dark:text-red-200 rounded-r-lg text-center">
                        <p className="font-bold"><i className="fas fa-exclamation-triangle mr-2"></i>This pub is reported as permanently closed.</p>
                    </div>
                )}
                
                {localPub.ratings.length > 0 ? (
                    <>
                        {/* Pub Score Section */}
                        <Section>
                            <div className="text-center flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pub Score</h3>
                                    <button onClick={onOpenScoreExplanation} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                        <i className="fas fa-info-circle"></i>
                                    </button>
                                </div>
                                <ScoreGauge score={localPub.pub_score} />
                                {areaStats && localPub.pub_score != null && (
                                    <div className={`mt-3 text-xs font-medium flex items-center justify-center space-x-1.5 opacity-90 animate-fade-in-up ${
                                        localPub.pub_score > areaStats.average 
                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                        <i className={`fas ${localPub.pub_score > areaStats.average ? 'fa-arrow-trend-up' : 'fa-map-location-dot'}`}></i>
                                        <span>
                                            {localPub.pub_score > areaStats.average 
                                                ? `Above area average of ${areaStats.average}` 
                                                : `Area average: ${areaStats.average}`}
                                        </span>
                                    </div>
                                )}
                                {rank && (
                                    <div className="mt-4 animate-fade-in-down">
                                        <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-sm font-bold px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800/60">
                                            <i className="fas fa-trophy mr-2"></i>
                                            #{rank} Top Rated Pub on Stoutly
                                        </span>
                                    </div>
                                )}
                                {isCertified && (
                                    <div className="mt-4 flex flex-col items-center animate-fade-in-down">
                                        <CertifiedBadge certifiedSince={localPub.certified_since} className="w-10 h-10" />
                                        <p className="font-bold text-green-600 dark:text-green-400 mt-2 text-sm">Stoutly Certified</p>
                                        <button 
                                            onClick={handleOpenCertifiedModal}
                                            className="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-1"
                                        >
                                            What is this?
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Small Stat Cards Section */}
                        <Section>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {/* Quality Card */}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                                    <i className="fas fa-beer text-3xl text-amber-500 mb-2"></i>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{avgQuality.toFixed(1)} / 5</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mt-1">Quality</div>
                                </div>

                                {/* Avg. Price Card */}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                                    <i className="fas fa-tag text-3xl text-green-500 mb-2"></i>
                                    {priceInfo.originalPrice ? (
                                        <div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-white" title={priceInfo.originalCode}>{priceInfo.originalPrice}</div>
                                            {priceInfo.convertedPrice && <div className="text-sm font-semibold text-gray-500 dark:text-gray-400" title={priceInfo.convertedCode}>{priceInfo.convertedPrice}</div>}
                                        </div>
                                    ) : (
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{priceInfo.text}</div>
                                    )}
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mt-1 flex items-center justify-center gap-1">
                                        <span>Avg. Price</span>
                                        {(localPub.is_dynamic_price_area || localPub.area_identifier) && <i className="fas fa-hourglass-half text-xs"></i>}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleScrollToCommunityActivity('checkins')}
                                    className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                >
                                    <i className="fas fa-location-dot text-3xl text-green-500 mb-2"></i>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{pubCheckins?.length || 0}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mt-1">Check-ins</div>
                                </button>
                                <button
                                    onClick={() => handleScrollToCommunityActivity('ratings')}
                                    className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                    aria-label={`Scroll to ${localPub.ratings.length} community ratings`}
                                >
                                    <i className="fas fa-users text-3xl text-blue-500 mb-2"></i>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{localPub.ratings.length}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mt-1">Ratings</div>
                                </button>
                            </div>
                        </Section>
                    </>
                ) : (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center shadow-md">
                        <p className="text-gray-700 dark:text-gray-300">No ratings yet for this pub.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Be the first to add one!</p>
                    </div>
                )}

                {renderYourRatingSection()}

                <GuinnessZeroStatus />
                
                <PintGallery ratings={localPub.ratings} onViewImage={setImageToView} />

                <Section ref={communityActivityRef} title="Community Activity" className="mt-4">
                    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setFeedFilter('all')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                feedFilter === 'all' 
                                    ? 'bg-amber-500 text-black' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFeedFilter('ratings')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                feedFilter === 'ratings' 
                                    ? 'bg-amber-500 text-black' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            Ratings
                        </button>
                        <button
                            onClick={() => setFeedFilter('posts')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                feedFilter === 'posts' 
                                    ? 'bg-amber-500 text-black' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            Posts
                        </button>
                        <button
                            onClick={() => setFeedFilter('checkins')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                feedFilter === 'checkins' 
                                    ? 'bg-amber-500 text-black' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            Check-ins
                        </button>
                    </div>

                    {session && (
                        <div className="flex justify-end mb-4 pr-1">
                            <label className="flex items-center cursor-pointer">
                                <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">Show Mine</span>
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={showMineOnly}
                                        onChange={(e) => setShowMineOnly(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="space-y-3">
                        {combinedFeed.length > 0 ? (
                            combinedFeed.map(item => {
                                if (item.feedType === 'rating') {
                                    return (
                                        <div key={`rating-${item.id}`} ref={rating => { if(rating && item.id === highlightedRatingId) { ratingsListRef.current = rating.parentNode } }}>
                                            <RatingCard 
                                                rating={item}
                                                userLikes={userLikes}
                                                onToggleLike={handleLocalToggleLike}
                                                onViewProfile={onViewProfile}
                                                onLoginRequest={onLoginRequest}
                                                onViewImage={setImageToView}
                                                onViewPub={onViewPub}
                                                loggedInUserProfile={loggedInUserProfile}
                                                comments={commentsByRating.get(item.id)}
                                                isCommentsLoading={isCommentsLoading}
                                                onFetchComments={onFetchComments}
                                                onAddComment={onAddComment}
                                                onDeleteComment={onDeleteComment}
                                                onReportContent={onReportContent}
                                                onOpenShareRatingModal={onOpenShareRatingModal}
                                                fallbackLocationData={localPub}
                                                highlightedCommentId={item.id === highlightedRatingId ? highlightedCommentId : null}
                                                onDeleteRating={onDeleteRating}
                                            />
                                        </div>
                                    );
                                } else if (item.feedType === 'post') {
                                    return (
                                        <div key={`post-${item.id}`} data-post-id={item.id} ref={post => { if(post && item.id === highlightedPostId) { postsListRef.current = post.parentNode } }}>
                                            <PostCard
                                                post={item}
                                                userPostLikes={userPostLikes}
                                                onToggleLike={onTogglePostLike}
                                                onViewProfile={onViewProfile}
                                                onLoginRequest={onLoginRequest}
                                                onViewPub={onViewPub}
                                                loggedInUserProfile={loggedInUserProfile}
                                                commentsByPost={commentsByPost}
                                                isPostCommentsLoading={isPostCommentsLoading}
                                                onFetchCommentsForPost={onFetchCommentsForPost}
                                                onAddPostComment={onAddPostComment}
                                                onDeletePostComment={onDeletePostComment}
                                                pubScores={pubScores}
                                                onEditPost={onEditPost}
                                                onDeletePost={onDeletePost}
                                                onOpenSharePostModal={onOpenSharePostModal}
                                                onReportContent={onReportContent}
                                                highlightedCommentId={item.id === highlightedPostId ? highlightedCommentId : null}
                                            />
                                        </div>
                                    );
                                } else if (item.feedType === 'checkin') {
                                    return (
                                        <CheckInCard 
                                            key={`checkin-${item.id}`} 
                                            checkin={item} 
                                            onViewProfile={onViewProfile} 
                                            onViewImage={setImageToView}
                                            currentUser={session?.user}
                                            onDeleteCheckin={async (checkinId) => {
                                                const { error } = await supabase.from('pub_checkins').delete().eq('id', checkinId).eq('user_id', session?.user?.id);
                                                if (error) {
                                                    console.error("Error deleting checkin:", error);
                                                    setAlertInfo({ isOpen: true, title: "Error", message: "Failed to delete check-in." });
                                                } else {
                                                    setPubCheckins(prev => prev.filter(c => c.id !== checkinId));
                                                    if (handleRemoveXP) handleRemoveXP(25);
                                                    setAlertInfo({ isOpen: true, title: "Success", message: "Check-in deleted.", theme: "success" });
                                                }
                                            }}
                                            onUpdateAmount={async (checkinId, amount) => {
                                                const { error } = await supabase.from('pub_checkins').update({ amount_drank: amount }).eq('id', checkinId).eq('user_id', session?.user?.id);
                                                if (error) {
                                                    console.error("Error updating checkin amount:", error.message || error.details || error);
                                                    setAlertInfo({ isOpen: true, title: "Error", message: `Failed to update check-in: ${error.message || error.details || 'Unknown error'}` });
                                                } else {
                                                    setPubCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, amount_drank: amount } : c));
                                                    setAlertInfo({ isOpen: true, title: "Success", message: "Number of pints added!", theme: "success" });
                                                }
                                            }}
                                        />
                                    );
                                }
                                return null;
                            })
                        ) : (
                            <div className="text-center p-4 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <p>No activity found. Be the first!</p>
                            </div>
                        )}
                    </div>
                </Section>
            </div>
        </main>
    </div>
    {isCheckInModalOpen && (
        <CheckInModal
            pub={localPub}
            userProfile={loggedInUserProfile}
            onClose={() => setIsCheckInModalOpen(false)}
            existingUserRating={existingUserRating}
            onSuccess={(newCheckin) => {
                setPubCheckins(prev => [newCheckin, ...prev]);
                setLocalPub(prev => ({
                    ...prev,
                    checkin_count: (prev.checkin_count || 0) + 1
                }));
                setIsCheckInModalOpen(false);
                if (handleAddXP) handleAddXP(25, 'Checking into a Pub');
                if (setAlertInfo) {
                    setAlertInfo({
                        isOpen: true,
                        title: 'Check-in Successful',
                        message: 'Your check-in has been successfully posted!',
                        theme: 'success'
                    });
                }
                if (onDataRefresh) onDataRefresh();
            }}
        />
    )}
    </>
  );
};

export default PubDetails;