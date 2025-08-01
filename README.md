# OpenAI Realtime Client (WebRTC)

A bare-bones implementation of OpenAI's Realtime API client using WebRTC for speech-to-speech conversations.

## Features

- ✅ WebRTC connection to OpenAI Realtime API
- ✅ Real-time audio input/output 
- ✅ Text message support
- ✅ Server-side ephemeral token generation
- ✅ Event handling and logging
- ✅ Simple web interface for testing

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Environment

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Start the Server

```bash
npm start
```

### 4. Open in Browser

Navigate to `http://localhost:3000` and click "Connect" to start a realtime conversation.

## Usage

### Voice Interaction
1. Click "Connect" to establish WebRTC connection
2. Allow microphone access when prompted  
3. Start speaking - the model will respond with audio
4. Audio output plays automatically through your speakers

### Text Interaction
1. Type a message in the text input
2. Press Enter or click "Send Message"
3. The model will respond with both audio and text

## Project Structure

```
├── server.js           # Express server for token generation
├── public/
│   ├── index.html      # Web interface
│   └── client.js       # WebRTC client implementation
├── package.json
└── .env.example
```

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 3000)

## Implementation Details

### Server Side
- Express.js server that mints ephemeral tokens
- Serves static files from `/public` 
- Handles `/session` endpoint for token generation

### Client Side  
- WebRTC peer connection to OpenAI
- Audio input via `getUserMedia()`
- Audio output via remote media streams
- Data channel for JSON event messaging
- Event-driven architecture for extensibility

## Security

This implementation uses ephemeral tokens generated server-side to avoid exposing your OpenAI API key in the browser. The ephemeral tokens expire after 1 minute for security.

## Browser Requirements

- Modern browser with WebRTC support
- Microphone access permission
- HTTPS (required for microphone access in production)

## Troubleshooting

- Ensure your OpenAI API key is valid and has Realtime API access
- Check browser console for WebRTC connection errors
- Verify microphone permissions are granted
- Use HTTPS in production environments
