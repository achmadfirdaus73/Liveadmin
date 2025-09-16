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
                markers: {},
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
                                        this.listenForUsersAndLocations();
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
                            this.users = {};
                            this.mergedData = [];
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
                        const location = this.locations[user.userId] ? this.locations[user.userId].latest : null;
                        const status = location ? location.status : 'offline';
                        
                        return {
                            namaKaryawan: user.nama || 'Nama Tidak Diketahui',
                            userId: user.userId,
                            lat: location ? location.lat : null,
                            lng: location ? location.lng : null,
                            accuracy: location ? location.accuracy : null,
                            timestamp: location ? location.localTime : '-',
                            status: status,
                        };
                    });
                    this.mergedData = merged;
                    
                    this.mergedData.forEach(item => {
                        if (item.lat && item.lng) {
                            this.updateMarker(item.userId, item);
                        } else if (this.markers[item.userId]) {
                            this.map.removeLayer(this.markers[item.userId]);
                            delete this.markers[item.userId];
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
                            marker.bindPopup(`<b>${location.namaKaryawan}</b><br>Lat: ${lat ? lat.toFixed(4) : '-'}<br>Lng: ${lng ? lng.toFixed(4) : '-'}<br>Akurasi: ${location.accuracy ? location.accuracy.toFixed(2) + ' m' : '-'}<br>Waktu: ${location.timestamp}`);
                            this.markers[userId] = marker;
                        }
                    }
                },
                showLocationOnMap(location) {
                    if (this.map && location.lat && location.lng) {
                        this.map.flyTo([location.lat, location.lng], 16);
                        if (this.markers[location.userId]) {
                            this.markers[location.userId].openPopup();
                        }
                    }
                }
            }
        });
