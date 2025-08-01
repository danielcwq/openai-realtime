class OpenAIRealtimeClient {
  constructor() {
    this.pc = null;
    this.dc = null;
    this.audioElement = null;
    this.isConnected = false;
    this.isRecording = false;
    this.eventHandlers = {};
  }

  async init() {
    try {
      console.log("Getting ephemeral token...");
      const tokenResponse = await fetch("/session");
      if (!tokenResponse.ok) {
        throw new Error(`Failed to get token: ${tokenResponse.status}`);
      }
      
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret.value;
      console.log("Got ephemeral token");

      this.pc = new RTCPeerConnection();
      
      this.setupAudioOutput();
      await this.setupAudioInput();
      this.setupDataChannel();
      
      await this.connect(EPHEMERAL_KEY);
      
      console.log("OpenAI Realtime client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize client:", error);
      throw error;
    }
  }

  setupAudioOutput() {
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.controls = true;
    document.body.appendChild(this.audioElement);
    
    this.pc.ontrack = (event) => {
      console.log("Received remote audio track");
      this.audioElement.srcObject = event.streams[0];
    };
  }

  async setupAudioInput() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });
      
      const audioTrack = mediaStream.getTracks()[0];
      this.pc.addTrack(audioTrack, mediaStream);
      console.log("Added local audio track");
      
      return mediaStream;
    } catch (error) {
      console.error("Failed to get microphone access:", error);
      throw error;
    }
  }

  setupDataChannel() {
    this.dc = this.pc.createDataChannel("oai-events");
    
    this.dc.addEventListener("open", () => {
      console.log("Data channel opened");
      this.isConnected = true;
      this.emit("connected");
    });
    
    this.dc.addEventListener("message", (event) => {
      try {
        const serverEvent = JSON.parse(event.data);
        console.log("Server event:", serverEvent.type, serverEvent);
        this.handleServerEvent(serverEvent);
      } catch (error) {
        console.error("Failed to parse server message:", error);
      }
    });
    
    this.dc.addEventListener("close", () => {
      console.log("Data channel closed");
      this.isConnected = false;
      this.emit("disconnected");
    });
    
    this.dc.addEventListener("error", (error) => {
      console.error("Data channel error:", error);
      this.emit("error", error);
    });
  }

  async connect(ephemeralKey) {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2025-06-03";
    
    console.log("Sending SDP offer to OpenAI...");
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp"
      },
    });

    if (!sdpResponse.ok) {
      throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
    }

    const answerSdp = await sdpResponse.text();
    const answer = {
      type: "answer",
      sdp: answerSdp,
    };
    
    await this.pc.setRemoteDescription(answer);
    console.log("WebRTC connection established");
  }

  handleServerEvent(event) {
    switch (event.type) {
      case "session.created":
        console.log("Session created:", event.session);
        this.emit("session.created", event.session);
        break;
        
      case "session.updated":
        console.log("Session updated:", event.session);
        this.emit("session.updated", event.session);
        break;
        
      case "input_audio_buffer.speech_started":
        console.log("Speech started");
        this.isRecording = true;
        this.emit("speech.started");
        break;
        
      case "input_audio_buffer.speech_stopped":
        console.log("Speech stopped");
        this.isRecording = false;
        this.emit("speech.stopped");
        break;
        
      case "response.created":
        console.log("Response created:", event.response);
        this.emit("response.created", event.response);
        break;
        
      case "response.done":
        console.log("Response done:", event.response);
        this.emit("response.done", event.response);
        break;
        
      case "response.text.delta":
        console.log("Text delta:", event.delta);
        this.emit("response.text.delta", event.delta);
        break;
        
      case "response.audio.delta":
        console.log("Audio delta received");
        this.emit("response.audio.delta", event);
        break;
        
      default:
        console.log("Unhandled server event:", event.type, event);
        this.emit("server.event", event);
    }
  }

  sendEvent(event) {
    if (!this.isConnected || !this.dc) {
      console.warn("Cannot send event - not connected");
      return false;
    }
    
    try {
      this.dc.send(JSON.stringify(event));
      console.log("Sent event:", event.type, event);
      return true;
    } catch (error) {
      console.error("Failed to send event:", error);
      return false;
    }
  }

  updateSession(sessionConfig) {
    return this.sendEvent({
      type: "session.update",
      session: sessionConfig
    });
  }

  createResponse(responseConfig = {}) {
    return this.sendEvent({
      type: "response.create",
      response: responseConfig
    });
  }

  sendTextMessage(text) {
    const success = this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text
          }
        ]
      }
    });
    
    if (success) {
      this.createResponse();
    }
    
    return success;
  }

  on(eventType, handler) {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }
    this.eventHandlers[eventType].push(handler);
  }

  emit(eventType, data = null) {
    if (this.eventHandlers[eventType]) {
      this.eventHandlers[eventType].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.pc) {
      this.pc.close();
    }
    this.isConnected = false;
    console.log("Disconnected from OpenAI Realtime API");
  }
}

window.OpenAIRealtimeClient = OpenAIRealtimeClient;