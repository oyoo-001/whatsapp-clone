# WhatsApp Clone

A full-stack WhatsApp clone with real-time messaging, voice/video calls, media sharing, and PWA support.

## Features

### Messaging
- Real-time one-on-one messaging via Socket.IO
- Message status indicators: sent (✓), delivered (✓✓ grey), read (✓✓ blue)
- Typing indicators and read receipts
- Reply, edit, forward, and delete messages (for me / for everyone)
- Emoji picker with 1500+ emojis and GIF search (via Giphy API)
- Voice notes recording (WebM/Opus, 3-min limit)
- Media sharing: images, videos, audio files, documents (50MB limit via multer)
- Image preview modal with zoom controls

### Calls
- Voice and video calls via WebRTC
- ICE restart on failure, multiple STUN/TURN servers
- Call hold/resume
- Call waiting — busy users are notified
- Call logs with status (missed, answered, rejected) and duration
- Conference calls with participant management

### User & Contact Management
- Phone number registration with country code auto-detection (ipapi.co)
- Add contacts by phone number search
- Block/unblock contacts
- Profile editing: avatar upload, username, status
- Last seen and online status

### Security & Privacy
- JWT-based authentication
- Chat lock with 4-digit PIN (per-chat, persisted via localStorage)
- Dark/light theme with CSS custom properties

### PWA
- Installable (manifest.json + service worker)
- Badge count on app icon (unread messages)
- Browser notifications for new messages
- Service worker caching for offline assets
- Install prompt in Settings

### UI/UX
- Modern design with Lucide icons
- Smooth animations (fadeInUp, scaleIn, slideUp, slideDown)
- Skeleton loaders
- Toast notifications
- Notification popups (floating green banner on new messages)
- Settings page with privacy, appearance, and app controls
- Responsive layout

## Tech Stack

| Layer        | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | React 18 + Vite, Zustand, React Router v6       |
| Backend     | Node.js, Express, Socket.IO                     |
| Database    | MySQL with Sequelize ORM                        |
| Realtime    | Socket.IO (messaging, call signaling, typing)   |
| WebRTC      | Voice/video calls with STUN + TURN relay        |
| Storage     | Local filesystem via multer                      |
| Auth        | JWT (jsonwebtoken + bcryptjs)                   |
| PWA         | Web App Manifest, Service Worker, Badge API     |

## Project Structure

```
whatsapp-clone/
├── server/
│   ├── config/          # DB & app config
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # Express routes
│   ├── socket/          # Socket.IO handlers
│   ├── .env             # Environment variables
│   └── server.js        # Entry point
├── web/
│   ├── public/          # Static assets, manifest, SW
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Route pages
│   │   ├── services/    # API, WebRTC, socket, sounds
│   │   ├── stores/      # Zustand stores
│   │   └── styles/      # CSS & theme
│   ├── index.html
│   └── vite.config.js
├── uploads/             # Uploaded media files
├── package.json         # Root (runs `node server.js`)
├── server.js            # Root server starter
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/whatsapp-clone.git
cd whatsapp-clone
npm install
cd web && npm install && cd ..
```

### 2. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE whatsapp_clone;
```

### 3. Configure Environment

Edit `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=whatsapp_clone
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### 4. Uploads Directory

```bash
mkdir -p uploads
```

### 5. Start

```bash
# From project root — starts backend on port 5000
node server.js

# In another terminal — starts frontend on port 3000
cd web && npm run dev
```

The Vite dev server proxies `/api`, `/uploads`, and `/socket.io` to the backend on port 5000.

## API Endpoints

### Auth
| Method | Endpoint              | Description          |
|--------|----------------------|----------------------|
| POST   | /api/auth/register   | Register new user    |
| POST   | /api/auth/login      | Login                |
| GET    | /api/auth/me         | Get current user     |
| PUT    | /api/auth/profile    | Update profile       |

### Users
| Method | Endpoint                          | Description              |
|--------|----------------------------------|--------------------------|
| GET    | /api/users/search?query=         | Search users             |
| GET    | /api/users/search-by-phone?phone= | Find user by phone       |
| GET    | /api/users/contacts              | List contacts            |
| POST   | /api/users/contacts              | Add contact              |
| DELETE | /api/users/contacts/:id          | Remove contact           |
| PUT    | /api/users/contacts/:id/block    | Toggle block             |
| GET    | /api/users/:userId               | Get user profile         |

### Messages
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| GET    | /api/messages/:userId       | Get conversation    |
| POST   | /api/messages               | Send message        |
| PUT    | /api/messages/:id/edit      | Edit message        |
| DELETE | /api/messages/:id?mode=me|all | Delete message      |
| POST   | /api/messages/forward       | Forward message     |

### Calls
| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | /api/calls/initiate               | Create call log       |
| PUT    | /api/calls/:id/status             | Update call status    |
| GET    | /api/calls/history                | Get call history      |

### Upload
| Method | Endpoint       | Description      |
|--------|---------------|------------------|
| POST   | /api/upload   | Upload file      |

## Socket.IO Events

### Client → Server
| Event                  | Payload                              | Description              |
|------------------------|--------------------------------------|--------------------------|
| chat:message           | { to, message }                      | Send message             |
| chat:typing            | { to, isTyping }                     | Typing indicator         |
| chat:read              | { to }                               | Mark as read             |
| call:start             | { to, callType, callLogId }          | Start a call             |
| call:accept            | { to }                               | Accept incoming call     |
| call:reject            | { to }                               | Reject incoming call     |
| call:end               | { to }                               | End call                 |
| signal:offer           | { to, offer }                        | WebRTC offer             |
| signal:answer          | { to, answer }                       | WebRTC answer            |
| signal:ice-candidate   | { to, candidate }                    | ICE candidate            |

### Server → Client
| Event                  | Payload                              | Description              |
|------------------------|--------------------------------------|--------------------------|
| chat:message           | { from, message, user }              | New message received     |
| chat:delivered         | { from }                             | Message delivered        |
| chat:read              | { from }                             | Message read             |
| chat:typing            | { from, isTyping }                   | Peer typing status       |
| call:incoming          | { from, callType, user, callLogId }  | Incoming call            |
| call:ringing           | { to }                               | Call is ringing          |
| call:accepted          | { from, user, connectedAt }          | Call accepted (caller)   |
| call:connected         | { from, connectedAt }                | Call connected (receiver)|
| call:ended             | { from }                             | Call ended               |
| call:waiting           | { from, ... }                        | Peer is busy (call waiting)|
| signal:offer           | { from, offer }                      | WebRTC offer received    |
| signal:answer          | { from, answer }                     | WebRTC answer received   |
| signal:ice-candidate   | { from, candidate }                  | ICE candidate received   |

## Mobile Access (Development)

To test on mobile devices over LAN:

1. Find your LAN IP: `ipconfig` → `IPv4 Address`
2. Start frontend: `cd web && npx vite --host 0.0.0.0`
3. Access from mobile: `http://192.168.0.100:3000`
4. **Chrome only**: Enable `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and add `http://192.168.0.100:3000`

## Deployment

### Build Frontend

```bash
cd web && npm run build
```

This generates `web/dist/` with the production build. Serve it from the backend by configuring Express to serve static files from this directory.

### Production Considerations

- Set strong `JWT_SECRET` and `DB_PASSWORD` in `.env`
- Set `NODE_ENV=production`
- Use a production MySQL instance
- Configure proper TURN server credentials for WebRTC
- Set up HTTPS (required for WebRTC on mobile outside localhost)
- Configure your TURN server URL/credentials in `server/.env`:
  ```
  TURN_URL=turn:your-turn-server.com:3478
  TURN_USERNAME=username
  TURN_CREDENTIAL=credential
  ```
- Replace the Giphy API key in `web/src/components/EmojiPicker.jsx` with your own from [Giphy Developers](https://developers.giphy.com/)

## Environment Variables

| Variable        | Default          | Description               |
|----------------|-------------------|---------------------------|
| PORT           | 5000              | Server port               |
| DB_HOST        | localhost         | MySQL host                |
| DB_PORT        | 3306              | MySQL port                |
| DB_USER        | root              | MySQL user                |
| DB_PASSWORD    |                   | MySQL password            |
| DB_NAME        | whatsapp_clone    | MySQL database name       |
| JWT_SECRET     | fallback_secret   | JWT signing secret        |
| NODE_ENV       | development       | Environment               |
| TURN_URL       |                   | TURN server URL           |
| TURN_USERNAME  |                   | TURN username             |
| TURN_CREDENTIAL|                   | TURN credential           |

## License

MIT
