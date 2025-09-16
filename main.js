const firebaseConfig = {
  apiKey: "AIzaSyCalf-RcByWIxdE3kyhcWwNwd8kSGX_fLE",
  authDomain: "absensi2-741f0.firebaseapp.com",
  databaseURL: "https://absensi2-741f0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi2-741f0",
  storageBucket: "absensi2-741f0.firebasestorage.app",
  messagingSenderId: "747934727309",
  appId: "1:747934727309:web:0c1fbacd980c4bdf2bb6c4",
  measurementId: "G-DGLR9P3Z33"
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
    },
    // Daftar email admin yang diizinkan
    adminEmails: ['achmadfirdaus831@gmail.com', 'achmadfirdaus0910@gmail.com'],
  }),
  mounted() {
    this.monitorAuthStatus();
  },
  methods: {
    // Menampilkan pesan notifikasi
    addNotification(color, message) {
      this.snackbar.color = color;
      this.snackbar.message = message;
      this.snackbar.show = true;
    },
    // Login Admin dengan Google
    async loginWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        if (this.adminEmails.includes(user.email)) {
          this.addNotification('green', 'Berhasil login sebagai admin!');
        } else {
          // Jika email tidak ada di daftar admin
          await firebase.auth().signOut();
          this.addNotification('red', 'Akses ditolak. Email ini tidak terdaftar sebagai admin.');
        }
      } catch (error) {
        this.addNotification('red', 'Gagal login: ' + error.message);
      }
    },
    // Logout Admin
    async logout() {
      try {
        await firebase.auth().signOut();
        this.addNotification('info', 'Berhasil logout!');
      } catch (error) {
        this.addNotification('red', 'Gagal logout: ' + error.message);
      }
    },
    // Memantau status login
    monitorAuthStatus() {
      firebase.auth().onAuthStateChanged(user => {
        this.userLoggedIn = !!user;
        if (user) {
          if (this.adminEmails.includes(user.email)) {
            this.userEmail = user.email;
            this.initializeMap();
            this.listenForLocations();
          } else {
            this.userLoggedIn = false;
            this.addNotification('red', 'Akses ditolak.');
          }
        } else {
          if (this.map) {
            this.map.remove();
            this.map = null;
          }
          this.locations = {};
        }
      });
    },
    // Inisialisasi peta Leaflet
    initializeMap() {
      if (this.map) return; // Mencegah inisialisasi ganda
      this.map = L.map('map').setView([-6.2088, 106.8456], 13); // Koordinat Jakarta
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);
    },
    // Mendengarkan data lokasi dari Firebase
    listenForLocations() {
      const locationsRef = firebase.database().ref('location-data');
      locationsRef.on('child_changed', snapshot => {
        const userId = snapshot.key;
        const latestData = snapshot.val().latest;
        
        // Perbarui data di tabel
        this.locations = { ...this.locations, [userId]: { ...latestData, userId: userId } };
        
        // Perbarui marker di peta
        this.updateMarker(userId, latestData);
      });
      
      // Ambil data awal
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
    // Memperbarui marker di peta
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
    // Menampilkan lokasi di peta saat tombol "Lihat" diklik
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
