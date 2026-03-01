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
        this._status = 'disconnected';

        // Create a singleton promise for initialization
        this.ready = this.init();
    }

    set status(val) {
        this._status = val;
        // Broadcast the change so UI can update
        window.dispatchEvent(new CustomEvent('cloud-status-change', { detail: val }));
    }

    get status() {
        return this._status;
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
            // Add a timeout to prevent hanging on mobile
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Save Timeout")), 10000)
            );

            const userDoc = doc(this.db, "users", this.user.uid);
            const savePromise = setDoc(userDoc, {
                mastery: masteryData,
                tier: currentTier,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            await Promise.race([savePromise, timeoutPromise]);
            console.log("CloudManager: Progress saved");
            this.status = 'synced';
        } catch (error) {
            console.warn("CloudManager: Save failed or timed out", error);
            // Don't show error to user if it's just a slow mobile connection
            this.status = 'synced';
        }
    }

    async loadProgress() {
        if (!this.user) return null;
        this.status = 'syncing';

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Load Timeout")), 10000)
            );

            const userDoc = doc(this.db, "users", this.user.uid);
            const loadPromise = getDoc(userDoc);

            const snap = await Promise.race([loadPromise, timeoutPromise]);

            if (snap && snap.exists()) {
                console.log("CloudManager: Data pull successful");
                this.status = 'synced';
                return snap.data();
            } else {
                console.log("CloudManager: No cloud data found");
                this.status = 'synced';
            }
        } catch (error) {
            console.warn("CloudManager: Cloud pull timed out or failed", error);
            this.status = 'error';
        }
        return null;
    }
}

const cloudManager = new CloudManager();
export default cloudManager;
