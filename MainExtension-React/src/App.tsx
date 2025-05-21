/// <reference types="chrome"/>
import { useState, useEffect } from 'react'
import './App.css'

interface TimeData {
  [key: string]: string[];
}

interface StorageData {
  userId?: string;
  timeData?: TimeData;
}

function App() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [timeData, setTimeData] = useState<TimeData>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved user ID
    chrome.storage.local.get('userId', (data: StorageData) => {
      if (data.userId) {
        setUserId(data.userId)
      }
    })

    // Load time data if available
    chrome.storage.local.get('timeData', (data: StorageData) => {
      if (data.timeData) {
        setTimeData(data.timeData)
      }
    })
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    // Save user ID
    await chrome.storage.local.set({ userId })

    // Send message to background script
    chrome.runtime.sendMessage({
      action: "openAndScrape",
      userId,
      password
    })

    // Clear password field
    setPassword('')
    setLoading(false)
  }

  const formatTime = (timeArray: string[]) => {
    return timeArray.join(', ')
  }

  return (
    <div className="container">
      <h1>Auto Login</h1>
      
      <div className="form-group">
        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <div className="form-group">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button 
        onClick={handleLogin}
        disabled={loading || !userId || !password}
      >
        {loading ? 'Processing...' : 'Login'}
      </button>

      {Object.keys(timeData).length > 0 && (
        <div className="time-data">
          <h2>Punch Times</h2>
          {Object.entries(timeData).map(([date, times]) => (
            <div key={date} className="time-entry">
              <strong>{date}:</strong> {formatTime(times)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
