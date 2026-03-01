import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

class CloudManager {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.user = null;
        this.isInitialized = false;
        this.status = 'disconnected'; // 'disconnected', 'syncing', 'synced', 'error'

        this.init();
    }

    async init() {
        return new Promise((resolve) => {
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.user = user;
                    console.log("CloudManager: User authenticated", user.uid);
                    this.isInitialized = true;
                    resolve(user);
                } else {
                    console.log("CloudManager: No user, signing in anonymously...");
                    try {
                        const cred = await signInAnonymously(this.auth);
                        this.user = cred.user;
                        this.isInitialized = true;
                        resolve(this.user);
                    } catch (error) {
                        console.error("CloudManager: Anonymous sign-in failed", error);
                        this.status = 'error';
                        resolve(null);
                    }
                }
            });
        });
    }

    async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(this.auth, provider);
            this.user = result.user;
            return this.user;
        } catch (error) {
            console.error("CloudManager: Google login failed", error);
            return null;
        }
    }

    async saveProgress(masteryData, currentTier) {
        if (!this.user) return;
        this.status = 'syncing';

        try {
            const userDoc = doc(this.db, "users", this.user.uid);
            await setDoc(userDoc, {
                mastery: masteryData,
                tier: currentTier,
                lastUpdated: serverTimestamp()
            }, { merge: true });
            console.log("CloudManager: Progress saved to cloud");
            this.status = 'synced';
        } catch (error) {
            console.error("CloudManager: Failed to save progress", error);
            this.status = 'error';
        }
    }

    async loadProgress() {
        if (!this.user) return null;

        try {
            const userDoc = doc(this.db, "users", this.user.uid);
            const snap = await getDoc(userDoc);
            if (snap.exists()) {
                console.log("CloudManager: Progress loaded from cloud");
                return snap.data();
            }
        } catch (error) {
            console.error("CloudManager: Failed to load progress", error);
        }
        return null;
    }
}

const cloudManager = new CloudManager();
export default cloudManager;
