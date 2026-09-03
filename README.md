# Study Tracker Pro

A complete responsive study management website using:

- HTML5
- CSS3
- JavaScript
- Chart.js
- Firebase Authentication
- Firebase Firestore
- GitHub Pages

## 1. Run immediately

Open `index.html` through a local static server or publish the repository to GitHub Pages.

You can use **Demo mode** without Firebase. Demo data is saved in browser localStorage.

## 2. Connect Firebase

1. Create a Firebase project.
2. Add a Web App.
3. Copy the Firebase configuration into `firebase-config.js`.
4. Enable Authentication > Sign-in method > Email/Password.
5. Create a Firestore database.
6. Add the rules from `firestore.rules`.
7. Commit the files to GitHub.
8. Enable GitHub Pages from the repository's `main` branch and `/root`.

## 3. Important GitHub Pages note

Do not put private service-account JSON files in GitHub. The web Firebase config is designed to be used by browser apps; security comes from Firebase Authentication and Firestore Security Rules.

## 4. Main features

Dashboard, tasks, chapter progress, weak/strong analysis, weekly timetable, exams, analytics, export, subjects, profile settings, dark mode, responsive mobile UI, Firebase cloud sync and demo/localStorage fallback.

## 5. Suggested next upgrades

- Google sign-in
- Push notifications
- recurring tasks
- Pomodoro study timer
- spaced-revision engine
- richer daily/weekly reports
- per-user subcollections for very large datasets
- AI-generated focus plans


## Fix included in this version
Demo Mode no longer depends on Firebase loading successfully. Firebase modules are loaded only when a real Firebase configuration is present, and charts are optional. This prevents the login screen from becoming unresponsive when Firebase/CDN resources are unavailable.
