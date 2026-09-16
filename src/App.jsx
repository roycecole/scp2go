import { useEffect, useReducer } from 'react'
import { reducer, initialState } from './state/reducer.js'
import { loadState, saveState } from './lib/storage.js'
import { useTheme } from './hooks/useTheme.js'
import { Header } from './components/Header.jsx'
import { AccessKeyHelp } from './components/AccessKeyHelp.jsx'
import { ConnectionForm } from './components/ConnectionForm.jsx'
import { PresetBar } from './components/PresetBar.jsx'
import { ProfileBar } from './components/ProfileBar.jsx'
import { FileSourceSection } from './components/FileSourceSection.jsx'
import { OptionsPanel } from './components/OptionsPanel.jsx'
import { DeploySection } from './components/DeploySection.jsx'
import { OutputPanel } from './components/OutputPanel.jsx'
import { SshConfigBlock } from './components/SshConfigBlock.jsx'
import { TransferVisualizer } from './components/TransferVisualizer.jsx'
import { t } from './lib/i18n.js'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? initialState)

  useTheme(state.theme)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.lang = state.lang
    document.title = t(state.lang, 'app.title')
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) metaDescription.setAttribute('content', t(state.lang, 'app.tagline'))
  }, [state.lang])

  return (
    <div className="app">
      <Header
        theme={state.theme}
        lang={state.lang}
        onThemeChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
        onLangChange={(lang) => dispatch({ type: 'SET_LANG', lang })}
      />
      <main className="app__main">
        <AccessKeyHelp lang={state.lang} />
        <PresetBar state={state} dispatch={dispatch} />
        <ProfileBar state={state} dispatch={dispatch} />
        <ConnectionForm state={state} dispatch={dispatch} />
        <FileSourceSection state={state} dispatch={dispatch} />
        <OptionsPanel state={state} dispatch={dispatch} />
        <DeploySection state={state} dispatch={dispatch} />
        <OutputPanel state={state} />
        <SshConfigBlock state={state} dispatch={dispatch} />
      </main>
      <TransferVisualizer state={state} />
    </div>
  )
}
