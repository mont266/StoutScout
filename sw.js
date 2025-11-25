const CACHE_NAME = 'stoutly-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/index.tsx',
  '/App.jsx',
  '/types.js',
  '/constants.js',
  '/storage.js',
  '/supabase.js',
  '/utils.js',
  '/analytics.js',
  '/hooks/useIsDesktop.js',
  '/hooks/useRegion.js',
  '/imageUtils.js',
  '/contexts/OnlineStatusContext.jsx',
  '/components/Map.jsx',
  '/components/FilterControls.jsx',
  '/components/PubDetails.jsx',
  '/components/PubList.jsx',
  '/components/Logo.jsx',
  '/components/SettingsPage.jsx',
  '/components/ProfilePage.jsx',
  '/components/ProfileStatsView.jsx',
  '/components/LeaderboardPage.jsx',
  '/components/XPPopup.jsx',
  '/components/LevelUpPopup.jsx',
  '/components/RankUpPopup.jsx',
  '/components/AuthPage.jsx',
  '/components/UpdatePasswordPage.jsx',
  '/components/AvatarSelectionModal.jsx',
  '/components/Avatar.jsx',
  '/components/StarRating.jsx',
  '/components/RatingForm.jsx',
  '/components/MobileLayout.jsx',
  '/components/DesktopLayout.jsx',
  '/components/DesktopNav.jsx',
  '/components/Icon.jsx',
  '/components/ModerationPage.jsx',
  '/components/TermsOfUsePage.jsx',
  '/components/PrivacyPolicyPage.jsx',
  '/components/BannedPage.jsx',
  '/components/BanUserModal.jsx',
  '/components/ImageModal.jsx',
  '/components/ImageCropper.jsx',
  '/components/ReportImageModal.jsx',
  '/components/IOSInstallInstructionsModal.jsx',
  '/components/AddPubModal.jsx',
  '/components/PlacementConfirmationBar.jsx',
  '/components/DesktopPlacementConfirmation.jsx',
  '/components/CommunityPage.jsx',
  '/components/CommunityFeed.jsx',
  '/components/FriendsFeed.jsx',
  '/components/FriendRequestsPage.jsx',
  '/components/RatingCard.jsx',
  '/components/FriendsListPage.jsx',
  '/components/DeleteConfirmationPopup.jsx',
  '/components/SubmittingRatingModal.jsx',
  '/components/ContactModal.jsx',
  '/components/FeedbackModal.jsx',
  '/components/ConfirmationModal.jsx',
  '/components/AlertModal.jsx',
  '/components/PubScoreExplanationModal.jsx',
  '/components/CoachMark.jsx',
  '/components/CookieConsentBanner.jsx',
  '/components/CommentsSection.jsx',
  '/components/ReportCommentModal.jsx',
  '/components/NotificationToast.jsx',
  '/components/CommentContent.jsx',
  '/components/SuggestEditModal.jsx',
  '/components/ShopPage.jsx',
  '/components/ShopItemCard.jsx',
  '/components/CoasterWelcomeModal.jsx',
  '/components/ShareModal.jsx',
  '/components/ShareProfileModal.jsx',
  '/components/SocialContentHub.jsx',
  '/components/GuinnessFactCard.jsx',
  '/components/PintPulseReportCard.jsx',
  '/components/PintOfTheWeekCard.jsx',
  '/components/AndroidBetaModal.jsx',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll to fetch and cache all specified resources.
        // It's atomic: if one fails, none are added.
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache during install:', error);
          // Optional: throw error to fail service worker installation
          // if core assets cannot be cached.
        });
      })
  );
});

self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests, use a network-first strategy to get the latest version of the page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For all other GET requests, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network, and cache it for next time.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches that are not in the whitelist
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});