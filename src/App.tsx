import {Route, Routes} from 'react-router-dom'
import './App.css'
import Settings from './pages/Settings'
import Home from './pages/Home'
import Layout from './pages/Layout'
import {SettingsContext} from './pages/Settings/Context'
import {useCreateSettingsContext} from './pages/Settings/useSettings'
import LoadingFullScreen from './pages/Layout/LoadingFullScreen'
import Service from './pages/Service'

function App() {
  const settings = useCreateSettingsContext()

  if (!settings.loaded) {
    return <LoadingFullScreen />
  }

  return (
    <SettingsContext.Provider value={settings}>
      <Layout>
        <Routes>
          <Route path="settings" element={<Settings />} />
          <Route path="/services/:category/:serviceName" element={<Service />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </SettingsContext.Provider>
  )
}

export default App
