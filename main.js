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

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();

        // DOM Elements
        const loginScreen = document.getElementById('loginScreen');
        const dashboardScreen = document.getElementById('dashboardScreen');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const adminProfilePicture = document.getElementById('adminProfilePicture');
        const adminName = document.getElementById('adminName');
        const totalUsers = document.getElementById('totalUsers');
        const activeUsers = document.getElementById('activeUsers');
        const inactiveUsers = document.getElementById('inactiveUsers');
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const exportBtn = document.getElementById('exportBtn');
        const userTableBody = document.getElementById('userTableBody');
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        // State
        let currentUser = null;
        let users = [];
        let filteredUsers = [];
        let map = null;
        let markers = [];
        let statusChart = null;
        let hourlyChart = null;
        let isDarkMode = localStorage.getItem('darkMode') === 'true';

        // Initialize Dark Mode
        if (isDarkMode) {
            document.body.classList.add('dark');
            darkModeToggle.innerHTML = '<i class="fas fa-sun text-yellow-400"></i>';
        }

        // Show Toast Notification
        function showToast(message, duration = 3000) {
            toastMessage.textContent = message;
            toast.classList.remove('translate-y-full', 'opacity-0');
            
            setTimeout(() => {
                toast.classList.add('translate-y-full', 'opacity-0');
            }, duration);
        }

        // Dark Mode Toggle
        darkModeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            localStorage.setItem('darkMode', isDarkMode);
            
            if (isDarkMode) {
                document.body.classList.add('dark');
                darkModeToggle.innerHTML = '<i class="fas fa-sun text-yellow-400"></i>';
            } else {
                document.body.classList.remove('dark');
                darkModeToggle.innerHTML = '<i class="fas fa-moon text-gray-700"></i>';
            }
        });

        // Login with Google
        loginBtn.addEventListener('click', async () => {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                await auth.signInWithPopup(provider);
            } catch (error) {
                showToast('Login gagal: ' + error.message);
            }
        });

        // Logout
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                showToast('Logout berhasil!');
            } catch (error) {
                showToast('Logout gagal: ' + error.message);
            }
        });

        // Export to CSV
        exportBtn.addEventListener('click', () => {
            const csv = Papa.unparse(filteredUsers);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'users.csv';
            link.click();
            showToast('Data berhasil diexport');
        });

        // Filter Users
        function filterUsers() {
            const searchTerm = searchInput.value.toLowerCase();
            const statusValue = statusFilter.value;
            
            filteredUsers = users.filter(user => {
                const matchesSearch = user.name?.toLowerCase().includes(searchTerm) || 
                                      user.email?.toLowerCase().includes(searchTerm);
                const matchesStatus = statusValue === 'all' || user.status === statusValue;
                return matchesSearch && matchesStatus;
            });
            
            renderUserTable();
            updateUserMarkers();
        }

        searchInput.addEventListener('input', filterUsers);
        statusFilter.addEventListener('change', filterUsers);

        // Render User Table
        function renderUserTable() {
            if (filteredUsers.length === 0) {
                userTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                            No users found
                        </td>
                    </tr>
                `;
                return;
            }
            
            userTableBody.innerHTML = filteredUsers.map(user => `
                <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                                ${user.photoURL ? 
                                    `<img className="h-10 w-10 rounded-full" src="${user.photoURL}" alt="" />` :
                                    `<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                        <i class="fas fa-user text-gray-500"></i>
                                    </div>`
                                }
                            </div>
                            <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">${user.name || 'Unknown'}</div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${user.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${user.status || 'inactive'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.location ? 
                            `<span>${user.location.lat?.toFixed(4)}, ${user.location.lng?.toFixed(4)}</span>` : 
                            `<span>N/A</span>`
                        }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.location?.timestamp ? 
                            new Date(user.location.timestamp).toLocaleString() : 
                            user.updatedAt ? 
                            new Date(user.updatedAt).toLocaleString() : 
                            'Never'
                        }
                    </td>
                </tr>
            `).join('');
        }

        // Initialize Map
        function initMap() {
            map = L.map('map').setView([-6.2088, 106.8456], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }

        // Update User Markers
        function updateUserMarkers() {
            // Clear existing markers
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
            
            // Add new markers
            filteredUsers.forEach(user => {
                if (user.location?.lat && user.location?.lng) {
                    const marker = L.marker([user.location.lat, user.location.lng])
                        .bindPopup(`
                            <div>
                                <h3 class="font-bold">${user.name || 'Unknown'}</h3>
                                <p>Email: ${user.email || 'N/A'}</p>
                                <p>Status: 
                                    <span class="font-semibold ${
                                        user.status === 'active' ? 'text-green-600' : 'text-red-600'
                                    }">
                                        ${user.status}
                                    </span>
                                </p>
                                <p>Accuracy: ${user.location.accuracy?.toFixed(2)}m</p>
                                <p>Last Update: ${user.location.timestamp ? 
                                    new Date(user.location.timestamp).toLocaleString() : 'N/A'}</p>
                            </div>
                        `)
                        .addTo(map);
                    
                    markers.push(marker);
                }
            });
            
            // Adjust map view to show all markers
            if (markers.length > 0) {
                const group = new L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }

        // Update Charts
        function updateCharts() {
            // Status Chart
            const activeCount = users.filter(u => u.status === 'active').length;
            const inactiveCount = users.filter(u => u.status === 'inactive').length;
            
            if (statusChart) {
                statusChart.destroy();
            }
            
            const statusCtx = document.getElementById('statusChart').getContext('2d');
            statusChart = new Chart(statusCtx, {
                type: 'pie',
                data: {
                    labels: ['Active', 'Inactive'],
                    datasets: [{
                        data: [activeCount, inactiveCount],
                        backgroundColor: ['#10B981', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            
            // Hourly Chart
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const hourlyData = hours.map(hour => {
                return users.filter(user => {
                    if (!user.location?.timestamp) return false;
                    const date = new Date(user.location.timestamp);
                    return date.getHours() === hour;
                }).length;
            });
            
            if (hourlyChart) {
                hourlyChart.destroy();
            }
            
            const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
            hourlyChart = new Chart(hourlyCtx, {
                type: 'bar',
                data: {
                    labels: hours.map(h => `${h}:00`),
                    datasets: [{
                        label: 'Active Users',
                        data: hourlyData,
                        backgroundColor: '#3B82F6',
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        // Update Stats
        function updateStats() {
            totalUsers.textContent = users.length;
            activeUsers.textContent = users.filter(u => u.status === 'active').length;
            inactiveUsers.textContent = users.filter(u => u.status === 'inactive').length;
        }

        // Auth State Observer
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                
                // Update admin profile
                if (user.photoURL) {
                    adminProfilePicture.innerHTML = `<img src="${user.photoURL}" alt="Profile" class="w-8 h-8 rounded-full object-cover">`;
                }
                
                adminName.textContent = user.displayName || 'Admin';
                
                // Check if user is admin
                database.ref(`admins/${user.uid}`).once('value').then((snapshot) => {
                    const isAdmin = snapshot.val();
                    
                    if (isAdmin === true) {
                        // Show dashboard
                        loginScreen.classList.add('hidden');
                        dashboardScreen.classList.remove('hidden');
                        
                        // Initialize map
                        if (!map) {
                            setTimeout(initMap, 100);
                        }
                        
                        // Load users data
                        loadUsersData();
                    } else {
                        showToast('Akses ditolak. Anda bukan admin.');
                        auth.signOut();
                    }
                }).catch((error) => {
                    showToast('Error: ' + error.message);
                });
            } else {
                currentUser = null;
                loginScreen.classList.remove('hidden');
                dashboardScreen.classList.add('hidden');
            }
        });

        // Load Users Data
        function loadUsersData() {
            database.ref('users').on('value', (snapshot) => {
                const data = snapshot.val();
                
                if (data) {
                    users = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    
                    filterUsers();
                    updateStats();
                    updateCharts();
                }
            });
        }
