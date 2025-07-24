
<div align="center">
  <img src="https://raw.githubusercontent.com/stoutly-app/assets/main/stoutly-icon-128.png" alt="Stoutly Logo" width="100" />
  <h1>Stoutly</h1>
  <p><strong>The ultimate companion for Guinness enthusiasts.</strong></p>
  <p>Find, rate, and share the best pints of Guinness near you and around the world.</p>
</div>

---

Stoutly is a modern, mobile-first web application designed to help users find the highest-quality and most affordable pints of Guinness. Using a community-driven rating system, users can share their experiences, upload photos of their pints, and climb the leaderboard to become a Guinness Guru.

## ✨ Core Features

-   **Interactive Map Exploration**: Find pubs and bars near you or anywhere in the world using an integrated Google Map.
-   **Community-Driven Ratings**: Rate pints based on **Quality** and **Price**. Submit exact prices to contribute to a global price index.
-   **Pint Gallery**: Upload photos of your pints and browse a gallery of submissions from other users.
-   **User Profiles & Gamification**:
    -   Create a user profile with a customizable avatar.
    -   Level up and earn new ranks by submitting ratings.
    -   Track your rating history and progress.
-   **Leaderboards**: See who the top reviewers are globally, yearly, monthly, or even daily.
-   **Advanced Filtering**: Sort pubs by **Nearest**, **Best Price**, or **Best Quality**.
-   **PWA Ready**: Install the app directly to your mobile home screen for a native-like experience.
-   **Theming**: Switch between beautiful **Light** and **Dark** modes.
-   **Developer & Admin Tools**:
    -   **Moderation Center**: A queue for reviewing flagged users and reported images.
    -   **Stats Dashboard**: In-depth application statistics on usage, ratings, and pricing.
    -   **Developer Mode**: Simulate locations to test the app from anywhere.

## 🛠️ Tech Stack

-   **Frontend**: [React](https://reactjs.org/) (with Hooks)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Mapping**: [Google Maps Platform](https://developers.google.com/maps) (Maps JavaScript API, Places API)
-   **Backend-as-a-Service**: [Supabase](https://supabase.io/)
    -   **Authentication**: Manages user sign-up and login.
    -   **Postgres Database**: Stores all user, pub, and rating data.
    -   **Storage**: Hosts user-uploaded pint images.
    -   **Edge Functions**: Powers secure, server-side logic for moderation and user management.

---