import React from 'react'
import ReactDOM from 'react-dom/client'

function Settings() {
    return (
        <div style={{ padding: '10px' }}>
            <h2>Settings Page</h2>
            <p>This is your settings page inside the extension.</p>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Settings />)
