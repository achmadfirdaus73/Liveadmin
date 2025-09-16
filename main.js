const firebaseConfig = {
        apiKey: "AIzaSyCdT2nWv0fF6jZmDfslIUvRKFun18rStWs",
        authDomain: "tracking-654e3.firebaseapp.com",
        databaseURL: "https://tracking-654e3-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "tracking-654e3",
        storageBucket: "tracking-654e3.appspot.com",
        messagingSenderId: "61074342637",
        appId: "1:61074342637:web:8656c39656e9c15e8b5c2e",
        measurementId: "G-T4K8472B7Q"
    };
    firebase.initializeApp(firebaseConfig);
    
    const app = new Vue({
        el: '#app',
        vuetify: new Vuetify(),
        data: () => ({
            userLoggedIn: false,
            userEmail: '',
            locations: {},
            map: null,
            markers: {},
            headers: [{
                text: 'Nama Karyawan',
                value: 'namaKaryawan'
            }, {
                text: 'User ID',
                value: 'userId'
            }, {
                text: 'Lat',
                value: 'lat'
            }, {
                text: 'Lng',
                value: 'lng'
            }, {
                text: 'Akurasi',
                value: 'accuracy'
            }, {
                text: 'Waktu',
                value: 'timestamp'
            }, {
                text: 'Status',
                value: 'status'
            }, {
                text: 'Aksi',
                value: 'actions',
                sortable: false
            }],
            snackbar: {
                show: false,
                message: '',
                color: '',
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
                                if (isAdmin) {
                                    this.userLoggedIn = true;
                                    this.userEmail = user.email;
                                    this.addNotification('green', 'Berhasil login sebagai admin!');
                                    this.initializeMap();
                                    this.listenForLocations();
                                } else {
                                    this.userLoggedIn = false;
                                    firebase.auth().signOut();
                                    this.addNotification('red', 'Akses ditolak. Anda bukan admin.');
                                }
                            });
                    } else {
                        this.userLoggedIn = false;
                        if (this.map) {
                            this.map.remove();
                            this.map = null;
                        }
                        this.locations = {};
                    }
                });
            },
            initializeMap() {
                if (this.map) return;
                this.map = L.map('map').setView([-6.2088, 106.8456], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(this.map);
            },
            listenForLocations() {
                const locationsRef = firebase.database().ref('location-data');
                locationsRef.on('child_changed', snapshot => {
                    const userId = snapshot.key;
                    const latestData = snapshot.val().latest;
                    this.locations = { ...this.locations, [userId]: { ...latestData, userId: userId } };
                    this.updateMarker(userId, latestData);
                });
                locationsRef.once('value', snapshot => {
                    const allLocations = snapshot.val();
                    if (allLocations) {
                        Object.keys(allLocations).forEach(userId => {
                            const latestData = allLocations[userId].latest;
                            this.locations = { ...this.locations, [userId]: { ...latestData, userId: userId } };
                            this.updateMarker(userId, latestData);
                        });
                    }
                });
            },
            updateMarker(userId, location) {
                const lat = location.lat;
                const lng = location.lng;
                if (lat && lng) {
                    if (this.markers[userId]) {
                        this.markers[userId].setLatLng([lat, lng]);
                    } else {
                        const marker = L.marker([lat, lng]).addTo(this.map);
                        marker.bindPopup(`<b>${location.namaKaryawan}</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}<br>Akurasi: ${location.accuracy.toFixed(2)} m<br>Waktu: ${new Date(location.unixTime).toLocaleString()}`);
                        this.markers[userId] = marker;
                    }
                }
            },
            showLocationOnMap(location) {
                if (this.map) {
                    this.map.flyTo([location.lat, location.lng], 16);
                    if (this.markers[location.userId]) {
                        this.markers[location.userId].openPopup();
                    }
                }
            }
        }
    });
