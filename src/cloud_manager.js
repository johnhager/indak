import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, initializeFirestore, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Debug: Verify config presence (values hidden)
Object.entries(firebaseConfig).forEach(([key, val]) => {
    if (!val) console.warn(`CloudManager: Missing config for ${key}`);
});

class CloudManager {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);

        // Force long-polling for better mobile reliability
        this.db = initializeFirestore(this.app, {
            experimentalAutoDetectLongPolling: true
        });

        this.user = null;
        this.lastError = null;
        this._status = 'disconnected';

        // Create a singleton promise for initialization
        this.ready = this.init();
    }

    set status(val) {
        this._status = val;
        // Broadcast the change so UI can update
        window.dispatchEvent(new CustomEvent('cloud-status-change', {
            detail: { status: val, error: this.lastError }
        }));
    }

    get status() {
        return this._status;
    }

    async init() {
        if (this.isInitialized && this.user) return this.user;

        return new Promise((resolve) => {
            // Increase to 30s for poor mobile connections
            const timeout = setTimeout(() => {
                console.warn("CloudManager: Auth initialization timed out");
                this.lastError = "Auth Timeout (30s)";
                this.status = 'error';
                resolve(null);
            }, 30000);

            const unsubscribe = onAuthStateChanged(this.auth, async (user) => {
                clearTimeout(timeout);
                if (user) {
                    this.user = user;
                    this.isInitialized = true;
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
        if (!this.user) {
            console.warn("CloudManager: Save attempt without an authenticated user.");
            this.status = 'error';
            return;
        }
        this.status = 'syncing';

        try {
            // Sanitize data to ensure no undefined values reach Firestore
            const cleanMastery = JSON.parse(JSON.stringify(masteryData));

            // Add a timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Save Timeout (30s)")), 30000)
            );

            const userDoc = doc(this.db, "users", this.user.uid);
            const savePromise = setDoc(userDoc, {
                mastery: cleanMastery,
                tier: currentTier,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            await Promise.race([savePromise, timeoutPromise]);
            console.log("CloudManager: Cloud Save Successful");
            this.status = 'synced';
        } catch (error) {
            console.error("CloudManager: Save failed detail -", error);
            this.lastError = error.code || error.message;
            this.status = 'error';
        }
    }

    async loadProgress() {
        if (!this.user) {
            console.warn("CloudManager: Load attempt without an authenticated user.");
            this.status = 'error';
            return null;
        }
        this.status = 'syncing';

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Load Timeout (30s)")), 30000)
            );

            const userDoc = doc(this.db, "users", this.user.uid);
            // Use getDocFromServer to bypass potentially buggy mobile IndexedDB cache
            const loadPromise = getDocFromServer(userDoc);

            const snap = await Promise.race([loadPromise, timeoutPromise]);

            if (snap && snap.exists()) {
                console.log("CloudManager: Cloud Data Pulled for UID:", this.user.uid);
                this.status = 'synced';
                return snap.data();
            } else {
                console.log("CloudManager: No existing cloud data for this user.");
                this.status = 'synced';
            }
        } catch (error) {
            console.error("CloudManager: Load failed - ", error);
            this.lastError = error.message;
            this.status = 'error';
        }
        return null;
    }
}

const cloudManager = new CloudManager();
export default cloudManager;
