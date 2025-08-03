import React, { useMemo, useState } from 'react';
import StarRating from './StarRating.jsx';
import RatingForm from './RatingForm.jsx';
import ImageModal from './ImageModal.jsx';
import ReportImageModal from './ReportImageModal.jsx';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import { formatTimeAgo, getCurrencyInfo } from '../utils.js';
import Avatar from './Avatar.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';

const StatCard = ({ label, value, icon, color }) => (
    <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col items-center justify-center text-center">
        <div className={`text-3xl mb-2 ${color}`}>
            <i className={`fas ${icon}`}></i>
        </div>
        <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        </div>
    </div>
);

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


const PubDetails = ({ pub, onClose, onRate, getAverageRating, existingUserRating, session, onLoginRequest, onViewProfile, loggedInUserProfile, onDataRefresh, userLikes, onToggleLike, isSubmittingRating, onOpenScoreExplanation }) => {
  const [imageToView, setImageToView] = useState(null);
  const [reportModalInfo, setReportModalInfo] = useState({ isOpen: false, rating: null });
  const [isRatingFormExpanded, setIsRatingFormExpanded] = useState(!existingUserRating && !!session);
  const [confirmation, setConfirmation] = useState({ isOpen: false });
  const [alertInfo, setAlertInfo] = useState({ isOpen: false });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const avgPrice = getAverageRating(pub.ratings, 'price');
  const avgQuality = getAverageRating(pub.ratings, 'quality');
  
  const currencyInfo = getCurrencyInfo(pub.address);
  
  const imageRatings = useMemo(() => pub.ratings.filter(r => !!r.image_url), [pub.ratings]);
  
  const priceInfo = useMemo(() => {
    const ratingsWithPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
    if (ratingsWithPrice.length === 0) return { text: `${avgPrice.toFixed(1)} / 5`, stars: avgPrice };

    const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
    const average = total / ratingsWithPrice.length;

    return { text: `${currencyInfo.symbol}${average.toFixed(2)}`, stars: avgPrice };
  }, [pub.ratings, avgPrice, currencyInfo]);

  const DYNAMIC_PRICING_THRESHOLD = 26; // Needs > 25 ratings

  const priceLabel = (
    <div className="flex items-center justify-center gap-1.5 uppercase tracking-wider">
        <span>Avg. Price</span>
        {pub.is_dynamic_price_area && (
            <div className="group relative flex items-center normal-case">
                <i className="fas fa-globe-europe text-gray-400 dark:text-gray-500 cursor-help"></i>
                <div className="absolute bottom-full mb-2 w-max max-w-[200px] left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900/90 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                    <span className="font-bold block">Dynamic Price Rating</span>
                    This rating compares prices to the local average, not a global standard.
                </div>
            </div>
        )}
        {!pub.is_dynamic_price_area && pub.area_identifier && (
            <div className="group relative flex items-center normal-case">
                <i className="fas fa-hourglass-half text-gray-400 dark:text-gray-500 cursor-help"></i>
                <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900/90 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                    <span className="font-bold block">Dynamic Pricing Pending</span>
                    Area stats are updated periodically to ensure accuracy.
                    <br />
                    This area has <span className="font-bold text-amber-400">{pub.area_rating_count}</span> of the <span className="font-bold">{DYNAMIC_PRICING_THRESHOLD}</span> exact price ratings needed to activate this feature.
                </div>
            </div>
        )}
        {!pub.is_dynamic_price_area && !pub.area_identifier && (
            <div className="group relative flex items-center normal-case">
                <i className="fas fa-hourglass-half text-gray-400 dark:text-gray-500 cursor-help"></i>
                <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900/90 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                    <span className="font-bold block">Dynamic Pricing Inactive</span>
                    Submit ratings with an exact price in this area to help create a new dynamic pricing zone.
                </div>
            </div>
        )}
    </div>
  );
  
  const isDeveloper = loggedInUserProfile?.is_developer;

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
    onRate(pub.id, pub.name, pub.address, ratingData);
    // Collapse the form after a new submission, but not after an update.
    if (!existingUserRating) {
        setIsRatingFormExpanded(false);
    }
  }

  const renderYourRatingSection = () => {
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

    const buttonText = existingUserRating ? "Update Your Rating" : "Rate This Pint";
    
    return (
        <Section title="Your Rating">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <button
                    onClick={() => setIsRatingFormExpanded(prev => !prev)}
                    className="w-full p-4 text-left font-bold text-lg text-amber-600 dark:text-amber-400 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <span>{buttonText}</span>
                    <i className={`fas transition-transform duration-300 ${isRatingFormExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </button>
                {isRatingFormExpanded && (
                     <RatingForm 
                        onSubmit={handleRatingSubmit}
                        existingRating={existingUserRating?.rating}
                        currencySymbol={currencyInfo.symbol}
                        existingImageUrl={existingUserRating?.image_url}
                        existingIsPrivate={existingUserRating?.is_private}
                        isSubmitting={isSubmittingRating}
                    />
                )}
            </div>
        </Section>
    );
  };


  return (
    <>
      {alertInfo.isOpen && (
        <AlertModal 
            onClose={() => setAlertInfo({ isOpen: false })}
            title={alertInfo.title}
            message={alertInfo.message}
            theme={alertInfo.theme}
        />
      )}
      {confirmation.isOpen && (
          <ConfirmationModal
              onClose={() => setConfirmation({ isOpen: false })}
              onConfirm={confirmation.onConfirm}
              isLoading={isActionLoading}
              title={confirmation.title}
              message={confirmation.message}
              confirmText={confirmation.confirmText}
              theme={confirmation.theme}
          />
      )}
      {imageToView && (
          <ImageModal
              rating={imageToView}
              onClose={() => setImageToView(null)}
              onReport={() => handleInitiateReport(imageToView)}
              canReport={session && session.user.id !== imageToView.user.id}
              canAdminRemove={loggedInUserProfile?.is_developer && session?.user.id !== imageToView.user.id}
              onAdminRemove={confirmAdminRemoveImage}
          />
      )}
      {reportModalInfo.isOpen && (
        <ReportImageModal
            onClose={() => setReportModalInfo({ isOpen: false, rating: null })}
            onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)}
        />
      )}
      
      <div className="flex flex-col h-full w-full bg-gray-100 dark:bg-gray-900">
        <header className="sticky top-0 z-10 flex items-center p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-full transition-colors w-12 h-12 flex items-center justify-center">
                <i className="fas fa-arrow-left fa-lg"></i>
            </button>
            <div className="flex-1 text-center pr-12 min-w-0">
                <h2 className="text-lg font-bold truncate text-gray-900 dark:text-white" title={pub.name}>{pub.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={pub.address}>{pub.address}</p>
            </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 space-y-6 pb-safe">
            {isDeveloper && (
                <Section>
                    <div className="flex justify-center items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-red-500 dark:text-red-400">Admin Info</h3>
                    </div>
                    <div className="p-3 bg-red-500/10 text-red-700 dark:text-red-300 rounded-lg text-xs font-mono space-y-1">
                        <p><strong>Pub ID:</strong> {pub.id}</p>
                        <p><strong>Area ID:</strong> {pub.area_identifier || 'N/A'}</p>
                        <p><strong>Area Status:</strong> {pub.is_dynamic_price_area ? <span className="font-bold text-green-600 dark:text-green-400">Active</span> : 'Inactive'}</p>
                        <p><strong>Area Ratings:</strong> {pub.area_rating_count || 0}</p>
                    </div>
                </Section>
            )}

            {pub.pub_score !== null && (
                <Section>
                    <div className="flex justify-center items-center gap-2 mb-2">
                        <h3 id="pub-score-heading" className="text-xl font-bold text-gray-900 dark:text-white">Pub Score</h3>
                        <button
                            onClick={onOpenScoreExplanation}
                            className="text-gray-400 dark:text-gray-500 hover:text-amber-500 transition-colors"
                            aria-label="Learn more about Pub Score"
                            aria-describedby="pub-score-heading"
                        >
                            <i className="fas fa-info-circle"></i>
                        </button>
                    </div>
                    <div className="flex justify-center">
                         <ScoreGauge score={pub.pub_score} />
                    </div>
                </Section>
            )}

            {pub.ratings.length > 0 ? (
                <Section>
                    <div className="flex space-x-3">
                        <StatCard label={<span className="uppercase tracking-wider">Quality</span>} value={`${avgQuality.toFixed(1)} / 5`} icon="fa-beer" color="text-amber-500" />
                        <StatCard label={priceLabel} value={priceInfo.text} icon="fa-tag" color="text-green-500" />
                        <StatCard label={<span className="uppercase tracking-wider">Ratings</span>} value={pub.ratings.length} icon="fa-users" color="text-blue-500" />
                    </div>
                </Section>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 italic text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">No Guinness ratings yet. Be the first!</p>
            )}

            {renderYourRatingSection()}
            
            {imageRatings.length > 0 && (
                <Section title="Pint Gallery">
                    <div className="flex overflow-x-auto space-x-3 py-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {imageRatings.map((rating) => (
                            <button
                                key={rating.id}
                                onClick={() => setImageToView({ ...rating, uploaderName: rating.user.username })}
                                className="relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden group focus:outline-none focus:ring-4 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                aria-label={`View image by ${rating.user.username}`}
                            >
                                <img src={rating.image_url} alt={`Pint by ${rating.user.username}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <p className="absolute bottom-1 left-2 text-white text-xs font-semibold truncate w-[calc(100%-1rem)]">
                                    by {rating.user.username}
                                </p>
                            </button>
                        ))}
                    </div>
                </Section>
            )}
            
            {pub.ratings.length > 0 && (
                 <Section title="Recent Ratings">
                    <ul className="space-y-3">
                        {pub.ratings.slice(0, 5).map((rating) => {
                            const isOwnRating = session?.user?.id === rating.user.id;
                            const canAdminRemove = loggedInUserProfile?.is_developer && !isOwnRating;
                            const isLiked = userLikes && userLikes.has(rating.id);

                            return (
                            <li key={rating.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg flex items-start space-x-3 shadow-md">
                                <button
                                    onClick={() => onViewProfile && onViewProfile(rating.user.id, 'pubDetails')}
                                    disabled={!onViewProfile}
                                    className={`rounded-full flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isOwnRating ? 'ring-2 ring-amber-500' : 'ring-transparent focus:ring-amber-500'}`}
                                    aria-label={`View profile for ${rating.user.username}`}
                                >
                                    <Avatar avatarId={rating.user.avatar_id} className="w-10 h-10" />
                                </button>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => onViewProfile && onViewProfile(rating.user.id, 'pubDetails')}
                                            disabled={!onViewProfile}
                                            className="font-semibold text-gray-800 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                                            aria-label={`View profile for ${rating.user.username}`}
                                        >
                                            {rating.user.username}
                                        </button>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(new Date(rating.created_at).getTime())}</span>
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1">
                                        <div className="flex items-center space-x-1 text-sm" title="Price">
                                            <i className="fas fa-tag text-green-500/80"></i>
                                            <StarRating rating={rating.price} color="text-green-400" />
                                        </div>
                                         <div className="flex items-center space-x-1 text-sm" title="Quality">
                                            <i className="fas fa-beer text-amber-500/80"></i>
                                            <StarRating rating={rating.quality} color="text-amber-400" />
                                        </div>
                                    </div>
                                    {rating.exact_price > 0 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                                            Paid: <span className="font-bold text-gray-700 dark:text-white">{currencyInfo.symbol}{rating.exact_price.toFixed(2)}</span>
                                        </p>
                                    )}
                                    <div className="mt-2 flex justify-between items-end">
                                      {rating.image_url ? (
                                        <div className="flex items-end space-x-2">
                                          <button onClick={() => setImageToView({ ...rating, uploaderName: rating.user.username })} className="rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none transition">
                                            <img src={rating.image_url} alt="Pint of Guinness" className="w-20 h-20 object-cover" />
                                          </button>
                                          <div className="flex flex-col gap-1">
                                            {session && !isOwnRating && (
                                                <button 
                                                  onClick={() => setReportModalInfo({ isOpen: true, rating })}
                                                  className="h-8 px-2 flex items-center justify-center bg-gray-200 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                  aria-label="Report image"
                                                  title="Report image"
                                                >
                                                  <i className="fas fa-flag"></i>
                                                </button>
                                            )}
                                            {canAdminRemove && (
                                                <button 
                                                    onClick={() => confirmAdminRemoveImage(rating)}
                                                    className="h-8 px-2 flex items-center justify-center bg-red-200 dark:bg-red-700/80 text-red-600 dark:text-red-300 rounded-md hover:bg-red-300 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                                    aria-label="Admin: Remove Photo"
                                                    title="Admin: Remove Photo"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            )}
                                          </div>
                                        </div>
                                      ) : <div></div> /* Empty div to maintain layout */}
                                      <button
                                          onClick={() => onToggleLike({ ...rating, pub_id: pub.id })}
                                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold ${
                                              isLiked
                                              ? 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-300'
                                              : 'bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-800/50'
                                          }`}
                                          aria-pressed={isLiked}
                                          aria-label={isLiked ? `Unlike rating, currently ${rating.like_count} likes` : `Like rating, currently ${rating.like_count} likes`}
                                      >
                                          <i className={`${isLiked ? 'fas' : 'far'} fa-heart transition-transform ${isLiked ? 'scale-110' : ''}`}></i>
                                          <span>{rating.like_count || 0}</span>
                                      </button>
                                    </div>
                                </div>
                            </li>
                        )})}
                    </ul>
                 </Section>
            )}
        </main>
      </div>
    </>
  );
};

export default PubDetails;