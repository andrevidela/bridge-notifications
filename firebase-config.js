// Firebase Configuration
// Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps

const firebaseConfig = {
  apiKey: "AIzaSyDvmtuC1C4LCF8jSxHnjD8CNYbAbtZcj3k",
  authDomain: "bridge-notifications.firebaseapp.com",
  projectId: "bridge-notifications",
  storageBucket: "bridge-notifications.firebasestorage.app",
  messagingSenderId: "967987065423",
  appId: "1:967987065423:web:1915034b4a78afaa46f03a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const messaging = firebase.messaging();
const db = firebase.firestore();

// Export for use in other files
window.firebaseServices = {
    messaging,
    db
};
