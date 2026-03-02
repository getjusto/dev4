import {ThemeProvider} from 'next-themes'
import {Route, Routes} from 'react-router-dom'
import './App.css'
import {useEffect} from 'react'
import Groups from './pages/Groups'
import Home from './pages/Home'
import Layout from './pages/Layout'
import LoadingFullScreen from './pages/Layout/LoadingFullScreen'
import Service from './pages/Service'
import Settings from './pages/Settings'
import {SettingsContext} from './pages/Settings/Context'
import {checkForAppUpdates} from './pages/Settings/Updates/check'
import {useCreateSettingsContext} from './pages/Settings/useSettings'

function App() {
  const settings = useCreateSettingsContext()

  useEffect(() => {
    void checkForAppUpdates(false)
  }, [])

  if (!settings.loaded) {
    return <LoadingFullScreen />
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="dev4-theme">
      <SettingsContext.Provider value={settings}>
        <Layout>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="groups" element={<Groups />} />
            <Route path="/services/:category/:serviceName" element={<Service />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </SettingsContext.Provider>
    </ThemeProvider>
  )
}

export default App
