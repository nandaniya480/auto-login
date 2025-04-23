import React from 'react'
import ReactDOM from 'react-dom/client'

function Popup() {
    const openSettings = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') })
    }

    return (
        <div style={{ padding: '10px' }}>
            <h2>Popup Page</h2>
            <button onClick={openSettings}>Go to Settings</button>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />)
