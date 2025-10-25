import React, { useMemo, useState, useRef, useEffect } from 'react';
import StarRating from './StarRating.jsx';
import RatingForm from './RatingForm.jsx';
import ImageModal from './ImageModal.jsx';
import ReportImageModal from './ReportImageModal.jsx';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import { formatTimeAgo, getCurrencyInfo, isLondonPub } from '../utils.js';
import Avatar from './Avatar.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';
import CommentsSection from './CommentsSection.jsx';
import CertifiedBadge from './CertifiedBadge.jsx';
import RatingCard from './RatingCard.jsx';
import CertifiedExplanationModal from './CertifiedExplanationModal.jsx';

const Section = ({ title, children, ...props }) => (
    <section {...props} aria-labelledby={title ? `section-title-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}>
        {title && (
            <h3 id={`section-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {title}
            </h3>
        )}
        {children}
    </section>
);

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


const PubDetails = ({ pub, onClose, onRate, getAverageRating, existingUserRating, session, onLoginRequest, onViewProfile, loggedInUserProfile, onDataRefresh, userLikes, onToggleLike, isSubmittingRating, onOpenScoreExplanation, onOpenSuggestEditModal, commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment, highlightedRatingId, highlightedCommentId, userZeroVotes, onGuinnessZeroVote, onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal, setAlertInfo }) => {
  const [localPub, setLocalPub] = useState(pub);
  const [imageToView, setImageToView] = useState(null);
  const [reportModalInfo, setReportModalInfo] = useState({ isOpen: false, rating: null });
  const [isRatingFormExpanded, setIsRatingFormExpanded] = useState(!existingUserRating && !!session);
  const [confirmation, setConfirmation] = useState({ isOpen: false });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [visibleComments, setVisibleComments] = useState({});
  const ratingsListRef = useRef(null);
  const [isDevInfoVisible, setIsDevInfoVisible] = useState(false);
  const [isCertifiedModalOpen, setIsCertifiedModalOpen] = useState(false);

  const isLondonNonDynamic = useMemo(() => isLondonPub(localPub) && !localPub.is_dynamic_price_area, [localPub]);
  const isCertified = localPub.certification_status === 'certified' || localPub.certification_status === 'at_risk';
  const isDeveloper = loggedInUserProfile?.is_developer;

  useEffect(() => {
    // This effect ensures we always have the most complete pub data available.
    // It handles two cases for missing country info: rated pubs (in our DB)
    // and unrated pubs (new from OSM).
    setLocalPub(pub); // Optimistically set the local pub first

    const hasCountryInfo = pub.country_code || pub.country_name;
    const isRated = pub.ratings?.length > 0 || pub.pub_score != null;

    if (!hasCountryInfo && pub.id && pub.location) {
        // Pub is missing country info, we need to fetch it.
        if (isRated) {
            // It's a rated pub, so it must exist in our DB. Fetch full record.
            const fetchFullPubData = async () => {
                const { data, error } = await supabase
                    .from('pubs')
                    .select('id, name, address, lat, lng, country_code, country_name, certification_status, certified_since')
                    .eq('id', pub.id)
                    .single();

                if (data && !error) {
                    setLocalPub(prevPub => ({
                        ...prevPub, // Keep live data like ratings from the prop
                        ...data, // Overwrite with the full data from DB
                        location: { lat: data.lat, lng: data.lng }
                    }));
                }
            };
            fetchFullPubData();
        } else {
            // It's unrated, likely a new pub from OSM. Reverse geocode to get country.
            const reverseGeocodeForCountry = async () => {
                try {
                    const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pub.location.lat}&lon=${pub.location.lng}&addressdetails=1`;
                    const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
                    const data = await response.json();
                    
                    if (data && data.address) {
                        setLocalPub(prevPub => ({
                            ...prevPub,
                            country_code: data.address.country_code,
                            country_name: data.address.country,
                        }));
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
        if (highlightedCommentId) {
            const commentRatingId = Object.keys(commentsByRating.get(localPub.id) || {}).find(ratingId =>
                commentsByRating.get(localPub.id)[ratingId]?.some(c => c.id === highlightedCommentId)
            );

            // Automatically open the comment section for the relevant rating
            if (commentRatingId && !visibleComments[commentRatingId]) {
                 toggleComments(commentRatingId);
            }
            
            setTimeout(() => {
                const element = document.getElementById(`comment-${highlightedCommentId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('highlight-comment');
                    setTimeout(() => {
                        element.classList.remove('highlight-comment');
                    }, 2500);
                }
            }, 400); // Delay to allow for comment section to open
        }
    }, [highlightedCommentId, commentsByRating, localPub.id, visibleComments]);

  const handleScrollToRatings = () => {
    if (ratingsListRef.current) {
        ratingsListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        trackEvent('click_scroll_to_ratings', { pub_id: localPub.id });
    }
  };

  const avgQuality = getAverageRating(localPub.ratings, 'quality');
  const avgPrice = getAverageRating(localPub.ratings, 'price');
  
  const currencyInfo = getCurrencyInfo(localPub);
  
  const priceInfo = useMemo(() => {
    const ratingsWithPrice = localPub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
    if (ratingsWithPrice.length === 0) return { text: `${avgPrice.toFixed(1)} / 5`, stars: avgPrice };

    const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
    const average = total / ratingsWithPrice.length;

    return { text: `${currencyInfo.symbol}${average.toFixed(2)}`, stars: avgPrice };
  }, [localPub.ratings, avgPrice, currencyInfo]);

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
    onRate(localPub.id, localPub.name, localPub.address, ratingData);
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
    
    const currentUserVote = userZeroVotes ? userZeroVotes.get(localPub.id) : undefined;
    
    return (
        <Section title="Guinness 0.0 Status">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex items-center space-x-3 mb-3">
                    <i className={`fas ${statusIcon} text-2xl ${statusColor}`}></i>
                    <div>
                        <h4 className={`text-lg font-bold ${statusColor}`}>{status}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
                    </div>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Is this correct?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onGuinnessZeroVote(localPub.id, true)}
                            disabled={currentUserVote === true}
                            className={`w-1/3 py-2 text-sm rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed ${
                                currentUserVote === true 
                                ? 'bg-green-500 text-white shadow' 
                                : 'bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                            }`}
                        >
                            <i className="fas fa-check"></i>
                            <span>Yes</span>
                        </button>
                        <button
                            onClick={() => onGuinnessZeroVote(localPub.id, false)}
                            disabled={currentUserVote === false}
                            className={`w-1/3 py-2 text-sm rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed ${
                                currentUserVote === false 
                                ? 'bg-red-500 text-white shadow' 
                                : 'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                            }`}
                        >
                             <i className="fas fa-times"></i>
                            <span>No</span>
                        </button>
                        <button
                            onClick={() => onClearGuinnessZeroVote(localPub.id)}
                            disabled={currentUserVote === undefined}
                            className={`w-1/3 py-2 text-sm rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed ${
                                currentUserVote === undefined
                                ? 'bg-gray-500 text-white shadow'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                             <i className="fas fa-question"></i>
                            <span>Not Sure</span>
                        </button>
                    </div>
                </div>
            </div>
        </Section>
    );
  };

  const renderYourRatingSection = () => {
    if (localPub.is_closed) return null;

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
            <Section title="Your Rating">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    {!isRatingFormExpanded && (
                         <button 
                            onClick={() => setIsRatingFormExpanded(true)}
                            className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex justify-between items-center"
                         >
                            <div>
                                <h4 className="font-bold text-lg text-gray-800 dark:text-white">Update Your Rating</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">You rated this pub on {new Date(existingUserRating.timestamp).toLocaleDateString()}.</p>
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
                            currencySymbol={currencyInfo.symbol}
                            isSubmitting={isSubmittingRating}
                            userZeroVote={userZeroVotes.get(localPub.id)}
                            isLondon={isLondonNonDynamic}
                        />
                    )}
                </div>
            </Section>
        );
    }

    // New rating, form is inside a collapsible section
    return (
        <Section title="Your Rating">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                {!isRatingFormExpanded && (
                    <button 
                        onClick={() => setIsRatingFormExpanded(true)}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex justify-between items-center"
                    >
                        <div>
                            <h4 className="font-bold text-lg text-gray-800 dark:text-white">Rate This Pub</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Share your experience with the community.</p>
                        </div>
                         <i className="fas fa-chevron-down text-gray-500 dark:text-gray-400"></i>
                    </button>
                )}
                 {isRatingFormExpanded && (
                    <RatingForm
                        onSubmit={handleRatingSubmit}
                        currencySymbol={currencyInfo.symbol}
                        isSubmitting={isSubmittingRating}
                        userZeroVote={userZeroVotes.get(localPub.id)}
                        isLondon={isLondonNonDynamic}
                    />
                 )}
            </div>
        </Section>
    );
  };


  return (
    <>
    {imageToView && <ImageModal rating={imageToView} onClose={() => setImageToView(null)} onReport={() => handleInitiateReport(imageToView)} canReport={loggedInUserProfile && loggedInUserProfile.id !== imageToView.user.id} canAdminRemove={isDeveloper} onAdminRemove={confirmAdminRemoveImage} />}
    {reportModalInfo.isOpen && <ReportImageModal onClose={() => setReportModalInfo({ isOpen: false, rating: null })} onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)} />}
    {confirmation.isOpen && <ConfirmationModal {...confirmation} isLoading={isActionLoading} onClose={() => setConfirmation({ isOpen: false })} />}
    {isCertifiedModalOpen && <CertifiedExplanationModal isOpen={isCertifiedModalOpen} onClose={() => setIsCertifiedModalOpen(false)} />}

    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <header className="p-4 bg-white dark:bg-gray-800 shadow-md z-10 flex-shrink-0">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={localPub.address}>
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
                    onClick={() => onOpenShareModal(localPub)}
                    className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors h-10 w-10 flex items-center justify-center rounded-full"
                    aria-label="Share pub"
                >
                    <i className="fas fa-share-alt fa-lg"></i>
                </button>
            </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 space-y-6">
            {isDevInfoVisible && isDeveloper && (
                <Section>
                    <div className="p-3 bg-gray-200 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 break-all animate-fade-in-down">
                        <p><strong>Pub ID:</strong> {localPub.id}</p>
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
                            {isCertified && (
                                <div className="mt-4 flex flex-col items-center animate-fade-in-down">
                                    <CertifiedBadge certifiedSince={localPub.certified_since} className="w-10 h-10" />
                                    <p className="font-bold text-green-600 dark:text-green-400 mt-2 text-sm">Stoutly Certified</p>
                                    <button 
                                        onClick={() => setIsCertifiedModalOpen(true)}
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
                        <div className="flex gap-4">
                            {/* Quality Card */}
                            <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                                <i className="fas fa-beer text-3xl text-amber-500 mb-2"></i>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{avgQuality.toFixed(1)} / 5</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mt-1">Quality</div>
                            </div>

                            {/* Avg. Price Card */}
                            <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                                <i className="fas fa-tag text-3xl text-green-500 mb-2"></i>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{priceInfo.text}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mt-1 flex items-center justify-center gap-1">
                                    <span>Avg. Price</span>
                                    {(isLondonNonDynamic || localPub.is_dynamic_price_area || localPub.area_identifier) && <i className="fas fa-hourglass-half text-xs"></i>}
                                </div>
                            </div>

                            {/* Ratings Card */}
                            <button
                                onClick={handleScrollToRatings}
                                className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center flex flex-col items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
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

            <GuinnessZeroStatus />

            <div className="text-center mt-2">
                <button
                    onClick={() => onOpenSuggestEditModal(localPub)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                >
                    <i className="fas fa-edit mr-1"></i>Suggest an edit
                </button>
            </div>

            {renderYourRatingSection()}
            
            <PintGallery ratings={localPub.ratings} onViewImage={setImageToView} />

            <Section title="Community Ratings" className="mt-4">
                <div ref={ratingsListRef} className="space-y-3">
                    {
                        (() => {
                            // We now show the user's own rating in this list.
                            // We sort them to show the user's rating first, followed by the newest ratings.
                            const sortedRatings = [...localPub.ratings].sort((a, b) => {
                                if (existingUserRating) {
                                    if (a.id === existingUserRating.id) return -1; // a comes first
                                    if (b.id === existingUserRating.id) return 1;  // b comes first
                                }
                                // For all other ratings, sort by date (newest first)
                                return new Date(b.created_at) - new Date(a.created_at);
                            });

                            if (sortedRatings.length > 0) {
                                return sortedRatings.map(rating => (
                                    <RatingCard 
                                        key={rating.id}
                                        rating={rating}
                                        userLikes={userLikes}
                                        onToggleLike={onToggleLike}
                                        onViewProfile={onViewProfile}
                                        onLoginRequest={onLoginRequest}
                                        onViewImage={setImageToView}
                                        onViewPub={null} // Already on the pub page
                                        loggedInUserProfile={loggedInUserProfile}
                                        comments={commentsByRating.get(rating.id)}
                                        isCommentsLoading={isCommentsLoading}
                                        onFetchComments={onFetchComments}
                                        onAddComment={onAddComment}
                                        onDeleteComment={onDeleteComment}
                                        onReportComment={onReportComment}
                                        onOpenShareRatingModal={onOpenShareRatingModal}
                                        fallbackLocationData={localPub}
                                    />
                                ));
                            } else {
                                return (
                                    <div className="text-center p-4 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                        <p>No community ratings yet. Be the first!</p>
                                    </div>
                                );
                            }
                        })()
                    }
                </div>
            </Section>
        </main>
    </div>
    </>
  );
};

export default PubDetails;