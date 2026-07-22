import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { TVShows } from './pages/TVShows';
import { Movies } from './pages/Movies';
import { Latest } from './pages/Latest';
import { VideoPlayerProvider } from './context/VideoPlayerContext';
import { NetflixMediaPlayer } from './components/NetflixMediaPlayer';
import { Navbar } from './components/Navbar';
import { Search } from './pages/Search';
import { Login } from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VideoPlayerProvider>
          <Router>
            <div className="min-h-screen transition-colors duration-300">
              
              <Navbar />

              {/* Main Content */}
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/tv" element={<TVShows />} />
                  <Route path="/movies" element={<Movies />} />
                  <Route path="/latest" element={<Latest />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/detail/:type/:id" element={<Detail />} />
                </Routes>
              </main>

              {/* Full Screen Video Player */}
              <NetflixMediaPlayer />

            </div>
          </Router>
        </VideoPlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
