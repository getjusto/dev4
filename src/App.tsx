import {Route, Routes} from 'react-router-dom'
import './App.css'
import Settings from './pages/Settings'
import Home from './pages/Home'
import Layout from './pages/Layout'
import {SettingsContext} from './pages/Settings/Context'
import {useCreateSettingsContext} from './pages/Settings/useSettings'
import LoadingFullScreen from './pages/Layout/LoadingFullScreen'
import Service from './pages/Service'
import {useEffect} from 'react'
import {checkForAppUpdates} from './pages/Settings/Updates/check'

function App() {
  const settings = useCreateSettingsContext()

  useEffect(() => {
    checkForAppUpdates(false)
  }, [])

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
