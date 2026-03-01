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
        this.status = 'disconnected';

        // Create a singleton promise for initialization
        this.ready = this.init();
    }

    async init() {
        if (this.isInitialized) return this.user;

        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.user = user;
                    this.isInitialized = true;
                    // Trigger a sync check immediately when auth changes
                    this.status = 'syncing';
                    console.log("CloudManager: Active User", user.uid);
                    unsubscribe();
                    resolve(user);
                } else {
                    console.log("CloudManager: Signing in anonymously...");
                    try {
                        const cred = await signInAnonymously(this.auth);
                        this.user = cred.user;
                        this.isInitialized = true;
                        unsubscribe();
                        resolve(this.user);
                    } catch (error) {
                        console.error("CloudManager: Auth failed", error);
                        this.status = 'error';
                        unsubscribe();
                        resolve(null);
                    }
                }
            });
        });
    }

    async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        try {
            this.status = 'syncing';
            const result = await signInWithPopup(this.auth, provider);
            this.user = result.user;
            this.isInitialized = true;
            return this.user;
        } catch (error) {
            console.error("CloudManager: Google login failed", error);
            this.status = 'error';
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
        this.status = 'syncing';

        try {
            const userDoc = doc(this.db, "users", this.user.uid);
            const snap = await getDoc(userDoc);
            if (snap.exists()) {
                console.log("CloudManager: Sync complete (Loaded)");
                this.status = 'synced';
                return snap.data();
            } else {
                this.status = 'synced'; // Nothing in cloud is a valid "synced" state
            }
        } catch (error) {
            console.error("CloudManager: Failed to load", error);
            this.status = 'error';
        }
        return null;
    }
}

const cloudManager = new CloudManager();
export default cloudManager;
