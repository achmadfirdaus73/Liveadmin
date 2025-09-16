const firebaseConfig = {
    apiKey: "AIzaSyCdT2nWv0fF6jZmDfslIUvRKFun18rStWs",
    authDomain: "tracking-654e3.firebaseapp.com",
    databaseURL: "https://tracking-654e3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tracking-654e3",
    storageBucket: "tracking-654e3.firebasestorage.app",
    messagingSenderId: "61074342637",
    appId: "1:61074342637:web:ee566c965c595668b5c2e4",
    measurementId: "G-Q5ZXKE7PTL"
};
firebase.initializeApp(firebaseConfig);

const app = new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data: () => ({
        userLoggedIn: false,
        userEmail: '',
        locations: {},
        users: {},
        mergedData: [],
        map: null,
        source: null,
        vectorLayer: null,
        headers: [
            { text: 'Nama Karyawan', value: 'namaKaryawan' },
            { text: 'User ID', value: 'userId' },
            { text: 'Lat', value: 'lat' },
            { text: 'Lng', value: 'lng' },
            { text: 'Akurasi', value: 'accuracy' },
            { text: 'Waktu', value: 'timestamp' },
            { text: 'Status', value: 'status' },
            { text: 'Aksi', value: 'actions', sortable: false }
        ],
        snackbar: {
            show: false,
            message: '',
            color: 'info',
            timeout: 3000
        }
    }),
    mounted() {
        this.monitorAuthStatus();
    },
    methods: {
        addNotification(color, message) {
            this.snackbar.color = color;
            this.snackbar.message = message;
            this.snackbar.show = true;
        },
        async loginWithGoogle() {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await firebase.auth().signInWithPopup(provider);
            } catch (error) {
                this.addNotification('red', 'Gagal login: ' + error.message);
            }
        },
        async logout() {
            try {
                await firebase.auth().signOut();
                this.addNotification('info', 'Berhasil logout!');
            } catch (error) {
                this.addNotification('red', 'Gagal logout: ' + error.message);
            }
        },
        monitorAuthStatus() {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    const userId = user.uid;
                    firebase.database().ref('admins/' + userId).once('value')
                        .then(snapshot => {
                            const isAdmin = snapshot.val();
                            if (isAdmin === true) {
                                this.userLoggedIn = true;
                                this.userEmail = user.email;
                                this.addNotification('green', 'Berhasil login sebagai admin!');

                                // Map baru di-init setelah login & DOM siap
                                this.$nextTick(() => {
                                    this.initializeMap();
                                });

                                this.listenForUsersAndLocations();
                            } else {
                                this.userLoggedIn = false;
                                firebase.auth().signOut();
                                this.addNotification('red', 'Akses ditolak. Anda bukan admin.');
                            }
                        });
                } else {
                    this.userLoggedIn = false;
                    this.locations = {};
                    this.users = {};
                    this.mergedData = [];
                }
            });
        },
        initializeMap() {
            if (this.map) {
                this.$nextTick(() => this.map.updateSize());
                return;
            }

            this.source = new ol.source.Vector();
            this.vectorLayer = new ol.layer.Vector({
                source: this.source,
                style: new ol.style.Style({
                    image: new ol.style.Icon({
                        src: 'https://cdn.rawgit.com/openlayers/ol3/v3.13.1/examples/data/icon.png',
                        scale: 0.6
                    })
                })
            });

            this.map = new ol.Map({
                target: 'map',
                layers: [
                    new ol.layer.Tile({ source: new ol.source.OSM() }),
                    this.vectorLayer
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([106.8456, -6.2088]),
                    zoom: 13
                })
            });

            // Fix map blank putih
            this.$nextTick(() => {
                this.map.updateSize();
            });
        },
        listenForUsersAndLocations() {
            const usersRef = firebase.database().ref('users');
            const locationsRef = firebase.database().ref('location-data');

            usersRef.on('value', snapshot => {
                const allUsers = snapshot.val() || {};
                this.users = allUsers;
                this.mergeData();
            });

            locationsRef.on('value', snapshot => {
                const allLocations = snapshot.val() || {};
                this.locations = allLocations;
                this.mergeData();
            });
        },
        mergeData() {
            const merged = Object.values(this.users).map(user => {
                const uid = user.userId || 'unknown';
                const location = this.locations[uid]?.latest || null;
                const status = location ? location.status : 'offline';

                return {
                    namaKaryawan: user.nama || 'Nama Tidak Diketahui',
                    userId: uid,
                    lat: location ? location.lat : null,
                    lng: location ? location.lng : null,
                    accuracy: location ? location.accuracy : null,
                    timestamp: location ? location.localTime : '-',
                    status: status,
                };
            });
            this.mergedData = merged;
            this.updateMarkers();
        },
        updateMarkers() {
            if (!this.source) return;
            this.source.clear();
            this.mergedData.forEach(item => {
                if (item.lat && item.lng) {
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lng, item.lat]))
                    });
                    feature.set('name', item.namaKaryawan);
                    feature.set('id', item.userId);
                    this.source.addFeature(feature);
                }
            });
            this.$nextTick(() => {
                this.map?.updateSize();
            });
        },
        showLocationOnMap(location) {
            if (this.map && location.lat && location.lng) {
                const view = this.map.getView();
                view.animate({
                    center: ol.proj.fromLonLat([location.lng, location.lat]),
                    zoom: 16,
                    duration: 1500
                });
            }
        }
    }
});
