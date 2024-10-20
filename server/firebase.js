// Client-side Firebase
const { initializeApp: initializeClientApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
const { getStorage } = require("firebase/storage");
const { getAnalytics, isSupported } = require("firebase/analytics");
const firebaseConfig = require("./firebaseConfig");
const { adminApp, adminAuth, adminDb } = require("./admin");
const db = adminDb;
const auth = adminAuth;

// Initialize client-side Firebase
const clientApp = initializeClientApp(firebaseConfig);
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);
const storage = getStorage();
// Initialize analytics only if supported
let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(clientApp);
    }
  })
  .catch(console.error);

// Export both apps and services
module.exports = {
  clientApp,
  adminApp,
  clientAuth,
  clientDb,
  analytics,
  auth,
  db,
  storage,
};

// Default export
module.exports.default = clientApp;
