# Auto Login Chrome Extension (React Version)

This is a Chrome extension built with React and Vite for automating the login process and tracking punch times.

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder from this project

## Features

- Automated login to the COSEC system
- Tracks and displays punch times
- Secure password handling
- Modern React-based UI
- Real-time data updates

## Project Structure

- `src/App.tsx` - Main React component
- `public/background.js` - Chrome extension background script
- `public/manifest.json` - Extension manifest file

## Development Notes

- The extension uses Chrome's Storage API for persistence
- Background script handles API calls and authentication
- React components manage the UI and user interactions

## Security

- Passwords are never stored, only used during login
- Uses secure communication with the COSEC system
- Follows Chrome extension security best practices
