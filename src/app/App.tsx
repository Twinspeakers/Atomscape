import { Navigate, Route, Routes } from 'react-router-dom'
import { GameScreen } from '@app/routes/GameScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<GameScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

