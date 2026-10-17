/**
 * Firebase Firestore Cloud Configuration & Real-Time Sync
 * Đồng bộ kho tài liệu Etron Sales Hub giữa tất cả nhân viên kinh doanh theo thời gian thực
 */

const firebaseConfig = {
    apiKey: "AIzaSyDNm3AnbFNux9Pu9KURnrTx99xC9qmWclo",
    authDomain: "etron-sales-hub-ec234.firebaseapp.com",
    projectId: "etron-sales-hub-ec234",
    storageBucket: "etron-sales-hub-ec234.firebasestorage.app",
    messagingSenderId: "1088390465989",
    appId: "1:1088390465989:web:517209632dfb28a7bd63ac",
    measurementId: "G-488GKBPZ20"
};

let firebaseDb = null;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseDb = firebase.firestore();
        console.log('✅ Đã khởi tạo Firebase Firestore (etron-sales-hub)!');
    }
} catch (e) {
    console.warn('⚠️ Không thể khởi tạo Firebase, đang sử dụng bộ nhớ cục bộ:', e);
}

window.firebaseDb = firebaseDb && window.syncStatus ? window.syncStatus.wrap(firebaseDb) : firebaseDb;
