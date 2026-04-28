var w=Object.defineProperty;var k=(a,e,t)=>e in a?w(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var r=(a,e,t)=>(k(a,typeof e!="symbol"?e+"":e,t),t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function t(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(n){if(n.ep)return;n.ep=!0;const s=t(n);fetch(n.href,s)}})();class M{constructor(e,t){r(this,"socket",null);r(this,"url");r(this,"userId");r(this,"handlers",new Map);r(this,"connected",!1);this.url=e,this.userId=t||"user-"+Math.random().toString(36).substring(2,10)}get userIdValue(){return this.userId}async connect(){return new Promise((e,t)=>{try{this.socket=new WebSocket(this.url),this.socket.onopen=()=>{console.log("[Socket] Connected"),this.connected=!0,e()},this.socket.onmessage=o=>{try{const n=JSON.parse(o.data);this.handleMessage(n)}catch(n){console.error("[Socket] Parse error:",n)}},this.socket.onclose=o=>{console.log("[Socket] Disconnected:",o.code),this.connected=!1},this.socket.onerror=o=>{console.error("[Socket] Error:",o),this.connected||t(o)}}catch(o){t(o)}})}disconnect(){this.socket&&(this.socket.close(1e3,"User disconnected"),this.socket=null),this.connected=!1}send(e){if(!this.socket||this.socket.readyState!==WebSocket.OPEN){console.warn("[Socket] Not connected");return}const t={type:e.type||"unknown",roomId:e.roomId,userId:this.userId,targetUserId:e.targetUserId,payload:e.payload};this.socket.send(JSON.stringify(t))}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}handleMessage(e){const t=this.handlers.get(e.type);t&&t.forEach(o=>o(e))}get isConnected(){return this.connected}}const C=[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"},{urls:"stun:stun2.l.google.com:19302"},{urls:"stun:stun3.l.google.com:19302"}],S={echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0,channelCount:1,sampleRate:48e3};class I{constructor(e,t){r(this,"peers",new Map);r(this,"localStream",null);r(this,"socketManager");r(this,"roomId");r(this,"isMuted",!1);r(this,"onPeerConnected",null);r(this,"onPeerDisconnected",null);r(this,"onSpeaking",null);this.socketManager=e,this.roomId=t,this.setupSignaling()}setLocalStream(e){this.localStream=e}setOnPeerConnected(e){this.onPeerConnected=e}setOnPeerDisconnected(e){this.onPeerDisconnected=e}setOnSpeaking(e){this.onSpeaking=e}setupSignaling(){this.socketManager.on("user-joined",async e=>{e.userId&&await this.createPeer(e.userId,!0)}),this.socketManager.on("room-users",async e=>{const t=e.payload;for(const o of t)await this.createPeer(o,!1)}),this.socketManager.on("user-left",e=>{e.userId&&this.removePeer(e.userId)}),this.socketManager.on("offer",async e=>{if(!e.userId)return;const t=await this.createPeer(e.userId,!1);if(!t)return;const o=new RTCSessionDescription(e.payload);await t.connection.setRemoteDescription(o);const n=await t.connection.createAnswer();await t.connection.setLocalDescription(n),this.socketManager.send({type:"answer",roomId:this.roomId,targetUserId:e.userId,payload:n})}),this.socketManager.on("answer",async e=>{if(!e.userId)return;const t=this.peers.get(e.userId);if(!t)return;const o=new RTCSessionDescription(e.payload);await t.connection.setRemoteDescription(o)}),this.socketManager.on("ice-candidate",async e=>{if(!e.userId)return;const t=this.peers.get(e.userId);if(!t)return;const o=new RTCIceCandidate(e.payload);await t.connection.addIceCandidate(o)})}async createPeer(e,t){if(this.peers.has(e))return this.peers.get(e);console.log("[WebRTC] Creating peer:",e,t?"initiator":"receiver");const o=new RTCPeerConnection({iceServers:C,iceCandidatePoolSize:10});this.localStream&&this.localStream.getTracks().forEach(s=>{o.addTrack(s,this.localStream)}),o.ontrack=s=>{var m;const[i]=s.streams;console.log("[WebRTC] Track received from:",e);const l=new Audio;l.srcObject=i,l.autoplay=!0,l.playsInline=!0,l.volume=1;try{const d=new AudioContext,u=d.createAnalyser();d.createMediaStreamSource(i).connect(u),u.fftSize=256;const h=new Uint8Array(u.frequencyBinCount),f=()=>{var b;if(!this.peers.has(e)){d.close();return}u.getByteFrequencyData(h);const v=h.reduce((y,x)=>y+x)/h.length;(b=this.onSpeaking)==null||b.call(this,e,v>25),requestAnimationFrame(f)};f()}catch{}const p=this.peers.get(e);p&&(p.audioElement=l),(m=this.onPeerConnected)==null||m.call(this,e)},o.onicecandidate=s=>{s.candidate&&this.socketManager.send({type:"ice-candidate",roomId:this.roomId,targetUserId:e,payload:s.candidate.toJSON()})},o.onconnectionstatechange=()=>{console.log("[WebRTC] State:",e,o.connectionState),(o.connectionState==="failed"||o.connectionState==="disconnected")&&this.removePeer(e)};const n={peerId:e,connection:o,audioElement:null};if(this.peers.set(e,n),t){const s=await o.createOffer({offerToReceiveAudio:!0,offerToReceiveVideo:!1});await o.setLocalDescription(s),this.socketManager.send({type:"offer",roomId:this.roomId,targetUserId:e,payload:s})}return n}removePeer(e){var o,n;const t=this.peers.get(e);t&&(console.log("[WebRTC] Removing peer:",e),t.connection.close(),(o=t.audioElement)==null||o.remove(),this.peers.delete(e),(n=this.onPeerDisconnected)==null||n.call(this,e))}mute(){this.localStream&&(this.localStream.getAudioTracks().forEach(e=>{e.enabled=!1}),this.isMuted=!0)}unmute(){this.localStream&&(this.localStream.getAudioTracks().forEach(e=>{e.enabled=!0}),this.isMuted=!1)}get muted(){return this.isMuted}get peerCount(){return this.peers.size}async cleanup(){for(const e of this.peers.keys())this.removePeer(e);this.localStream&&(this.localStream.getTracks().forEach(e=>e.stop()),this.localStream=null)}static getAudioConstraints(){return S}}const c={mic:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',copy:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',phoneOff:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.31 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.31-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>',users:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',volume2:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',volumeX:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',plus:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'};class L{constructor(){r(this,"state",{roomId:null,userCount:1,isMuted:!1,isConnected:!1});r(this,"elements",{});r(this,"callbacks",{onCreateRoom:null,onCopyLink:null,onToggleMute:null,onLeave:null});this.init()}init(){document.getElementById("app")&&(this.injectStyles(),this.createLandingPage(),this.createRoomPage(),this.createToast())}injectStyles(){const e=document.createElement("style");e.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      *, *::before, *::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      :root {
        --bg: #0c0c0c;
        --bg-secondary: #171717;
        --bg-tertiary: #222222;
        --border: #2e2e2e;
        --border-hover: #3e3e3e;
        --text: #e5e5e5;
        --text-secondary: #a3a3a3;
        --text-tertiary: #737373;
        --accent: #fff;
        --accent-bg: #262626;
        --success: #10b981;
        --error: #ef4444;
        --warning: #f59e0b;
        --radius: 8px;
        --radius-lg: 12px;
      }

      html, body {
        height: 100%;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      #app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .hidden { display: none !important; }
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 8px; }
      .gap-3 { gap: 12px; }
      .gap-4 { gap: 16px; }
      .gap-6 { gap: 24px; }

      /* Main container */
      .main-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      /* Card */
      .card {
        width: 100%;
        max-width: 420px;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 32px;
      }

      .card-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .logo {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .logo-icon {
        width: 40px;
        height: 40px;
        background: var(--accent);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-icon svg {
        width: 22px;
        height: 22px;
        color: var(--bg);
      }

      .logo-text {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }

      .tagline {
        color: var(--text-secondary);
        font-size: 14px;
      }

      /* Form elements */
      .form-group {
        margin-bottom: 16px;
      }

      .form-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }

      .input {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .input:focus {
        border-color: var(--text-tertiary);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.05);
      }

      .input:read-only {
        cursor: pointer;
        background: var(--bg);
      }

      .link-row {
        display: flex;
        gap: 8px;
      }

      .link-row .input {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 13px;
      }

      /* Buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        outline: none;
        text-decoration: none;
      }

      .btn-primary {
        width: 100%;
        background: var(--accent);
        color: var(--bg);
      }

      .btn-primary:hover {
        background: #f5f5f5;
      }

      .btn-primary:active {
        transform: scale(0.98);
      }

      .btn-secondary {
        background: var(--accent-bg);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .btn-secondary:hover {
        background: var(--bg-tertiary);
        border-color: var(--border-hover);
      }

      .btn-ghost {
        background: transparent;
        color: var(--text-secondary);
      }

      .btn-ghost:hover {
        color: var(--text);
        background: var(--accent-bg);
      }

      .btn-danger {
        background: rgba(239, 68, 68, 0.1);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      .btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
      }

      .btn-icon {
        padding: 0;
        width: 36px;
        height: 36px;
      }

      .btn svg {
        flex-shrink: 0;
      }

      /* User list */
      .user-list {
        margin: 24px 0;
      }

      .user-list-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .user-list-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-secondary);
      }

      .user-count {
        background: var(--accent-bg);
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
      }

      .user-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .user-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--bg);
        border-radius: var(--radius);
        transition: background 0.15s;
      }

      .user-item:hover {
        background: var(--bg-tertiary);
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        flex-shrink: 0;
      }

      .user-info {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-status {
        font-size: 12px;
        color: var(--text-tertiary);
      }

      .speaking {
        width: 8px;
        height: 8px;
        background: var(--success);
        border-radius: 50%;
        animation: pulse 1s ease-in-out infinite;
        flex-shrink: 0;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.3); }
      }

      /* Controls */
      .controls {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }

      .controls .btn {
        flex: 1;
      }

      /* Toast */
      .toast-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
      }

      .toast {
        padding: 10px 16px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 13px;
        color: var(--text);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
      }

      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .toast.success {
        border-color: var(--success);
        color: var(--success);
      }

      .toast.error {
        border-color: var(--error);
        color: var(--error);
      }

      /* Loading */
      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border);
        border-top-color: var(--text);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 24px;
        color: var(--text-tertiary);
        font-size: 13px;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .card {
          padding: 24px;
        }

        .controls {
          flex-direction: column;
        }

        .controls .btn {
          width: 100%;
        }
      }
    `,document.head.appendChild(e)}createLandingPage(){var t;const e=document.createElement("div");e.id="landing-page",e.className="main-container",e.innerHTML=`
      <div class="card">
        <div class="card-header">
          <div class="logo">
            <div class="logo-icon">${c.mic}</div>
            <span class="logo-text">PrinceVChat</span>
          </div>
          <p class="tagline">Free group voice chat. No signup. No download.</p>
        </div>
        <button id="btn-create-room" class="btn btn-primary">
          ${c.plus}
          Create Voice Room
        </button>
      </div>
    `,(t=document.getElementById("app"))==null||t.appendChild(e),this.elements["btn-create-room"]=e.querySelector("#btn-create-room")}createRoomPage(){var t;const e=document.createElement("div");e.id="room-page",e.className="main-container hidden",e.innerHTML=`
      <div class="card">
        <div class="card-header">
          <div class="logo">
            <div class="logo-icon">${c.mic}</div>
            <span class="logo-text">PrinceVChat</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">INVITE LINK</label>
          <div class="link-row">
            <input id="room-link" class="input" type="text" readonly />
            <button id="btn-copy-link" class="btn btn-secondary btn-icon" title="Copy link">
              ${c.copy}
            </button>
          </div>
        </div>

        <div class="user-list">
          <div class="user-list-header">
            <span class="user-list-title">${c.users} Participants</span>
            <span id="user-count" class="user-count">1</span>
          </div>
          <div id="user-items" class="user-items"></div>
        </div>

        <div class="controls">
          <button id="btn-mute" class="btn btn-secondary">
            <span id="mic-icon">${c.volume2}</span>
            <span id="mute-text">Mute</span>
          </button>
          <button id="btn-leave" class="btn btn-danger">
            ${c.phoneOff}
            Leave
          </button>
        </div>
      </div>
    `,(t=document.getElementById("app"))==null||t.appendChild(e),this.elements["room-link"]=e.querySelector("#room-link"),this.elements["btn-copy-link"]=e.querySelector("#btn-copy-link"),this.elements["user-count"]=e.querySelector("#user-count"),this.elements["user-items"]=e.querySelector("#user-items"),this.elements["btn-mute"]=e.querySelector("#btn-mute"),this.elements["btn-leave"]=e.querySelector("#btn-leave"),this.elements["mic-icon"]=e.querySelector("#mic-icon"),this.elements["mute-text"]=e.querySelector("#mute-text")}createToast(){var t;const e=document.createElement("div");e.className="toast-container",e.innerHTML='<div id="toast" class="toast"></div>',(t=document.getElementById("app"))==null||t.appendChild(e),this.elements.toast=e.querySelector("#toast")}showLandingPage(){var e,t;(e=document.getElementById("landing-page"))==null||e.classList.remove("hidden"),(t=document.getElementById("room-page"))==null||t.classList.add("hidden")}showRoomPage(e){var o,n;(o=document.getElementById("landing-page"))==null||o.classList.add("hidden"),(n=document.getElementById("room-page"))==null||n.classList.remove("hidden");const t=`${window.location.origin}/room/${e}`;this.elements["room-link"].value=t,this.state.roomId=e}updateUserCount(e){const t=document.getElementById("user-count");t&&(t.textContent=e.toString()),this.state.userCount=e}addUser(e,t=!1){const o=this.elements["user-items"];if(!o)return;const n=t?"You":e.substring(0,8),s=n.substring(0,2).toUpperCase(),i=document.createElement("div");i.className="user-item",i.id=`user-${e}`,i.innerHTML=`
      <div class="user-avatar">${s}</div>
      <div class="user-info">
        <div class="user-name">${n}</div>
        <div class="user-status">${t?"Host":"Connected"}</div>
      </div>
      <div class="speaking hidden"></div>
    `,o.appendChild(i),this.updateUserCount(this.state.userCount+1)}removeUser(e){const t=document.getElementById(`user-${e}`);t&&t.remove(),this.updateUserCount(Math.max(1,this.state.userCount-1))}setUserSpeaking(e,t){const o=document.getElementById(`user-${e}`);if(!o)return;const n=o.querySelector(".speaking");n&&n.classList.toggle("hidden",!t);const s=o.querySelector(".user-status");s&&(s.textContent=t?"Speaking...":"Connected")}setMuted(e){this.state.isMuted=e;const t=document.getElementById("mic-icon"),o=document.getElementById("mute-text");t&&(t.innerHTML=e?c.volumeX:c.volume2),o&&(o.textContent=e?"Unmute":"Mute")}showToast(e,t="info"){const o=document.getElementById("toast");o&&(o.textContent=e,o.className=`toast visible ${t}`,setTimeout(()=>{o.classList.remove("visible")},3e3))}setOnCreateRoom(e){this.callbacks.onCreateRoom=e;const t=document.getElementById("btn-create-room");t&&(t.onclick=()=>{var o,n;return(n=(o=this.callbacks).onCreateRoom)==null?void 0:n.call(o)})}setOnCopyLink(e){this.callbacks.onCopyLink=e;const t=document.getElementById("btn-copy-link");t&&(t.onclick=()=>{var n,s;const o=document.getElementById("room-link");o&&(o.select(),navigator.clipboard.writeText(o.value),this.showToast("Link copied!","success")),(s=(n=this.callbacks).onCopyLink)==null||s.call(n)})}setOnToggleMute(e){this.callbacks.onToggleMute=e;const t=document.getElementById("btn-mute");t&&(t.onclick=()=>{var o,n;return(n=(o=this.callbacks).onToggleMute)==null?void 0:n.call(o)})}setOnLeave(e){this.callbacks.onLeave=e;const t=document.getElementById("btn-leave");t&&(t.onclick=()=>{var o,n;return(n=(o=this.callbacks).onLeave)==null?void 0:n.call(o)})}}const E=`ws://${window.location.host}/ws`,g="/room/";class P{constructor(){r(this,"socketManager",null);r(this,"webrtcManager",null);r(this,"ui");r(this,"roomId",null);r(this,"localStream",null);this.ui=new L,this.setupRouter(),this.setupCallbacks()}setupRouter(){const e=window.location.pathname;if(e.startsWith(g)){const t=e.substring(g.length);t&&this.joinRoom(t)}else this.ui.showLandingPage()}setupCallbacks(){this.ui.setOnCreateRoom(()=>{this.createRoom()}),this.ui.setOnCopyLink(()=>{}),this.ui.setOnToggleMute(()=>{this.toggleMute()}),this.ui.setOnLeave(()=>{this.leaveRoom()})}createRoom(){const e=this.generateRoomId();window.history.replaceState(null,"",`${g}${e}`),this.joinRoom(e)}generateRoomId(){const e="abcdefghijklmnopqrstuvwxyz0123456789";let t="";for(let o=0;o<6;o++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}async joinRoom(e){this.roomId=e,console.log("[App] Joining room:",e);try{this.ui.showToast("Connecting...","info"),this.localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},video:!1}),console.log("[App] Microphone ready");const t="user-"+Math.random().toString(36).substring(2,10);this.socketManager=new M(E,t),await this.socketManager.connect(),console.log("[App] Connected to signaling server"),this.socketManager.send({type:"join",roomId:e}),this.webrtcManager=new I(this.socketManager,e),this.webrtcManager.setLocalStream(this.localStream),this.webrtcManager.setOnPeerConnected(o=>{console.log("[App] Peer connected:",o),this.ui.addUser(o,!1)}),this.webrtcManager.setOnPeerDisconnected(o=>{console.log("[App] Peer disconnected:",o),this.ui.removeUser(o)}),this.webrtcManager.setOnSpeaking((o,n)=>{this.ui.setUserSpeaking(o,n)}),this.ui.showRoomPage(e),this.ui.addUser(this.socketManager.userIdValue,!0),this.ui.showToast("Connected!","success")}catch(t){console.error("[App] Failed:",t),this.ui.showToast("Failed. Check microphone permissions.","error"),this.cleanup(),window.history.replaceState(null,"","/"),this.ui.showLandingPage()}}toggleMute(){this.webrtcManager&&(this.webrtcManager.muted?(this.webrtcManager.unmute(),this.ui.setMuted(!1)):(this.webrtcManager.mute(),this.ui.setMuted(!0)))}async leaveRoom(){console.log("[App] Leaving room"),this.cleanup(),window.history.replaceState(null,"","/"),this.ui.showLandingPage(),this.ui.showToast("Left the room","info")}cleanup(){this.webrtcManager&&(this.webrtcManager.cleanup(),this.webrtcManager=null),this.localStream&&(this.localStream.getTracks().forEach(e=>e.stop()),this.localStream=null),this.socketManager&&(this.socketManager.disconnect(),this.socketManager=null),this.roomId=null}}document.addEventListener("DOMContentLoaded",()=>{new P});
