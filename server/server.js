const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config({ path: __dirname + "/.env" });
const { connectDB } = require("./config/database");
const config = require("./config/config");
const { setupSocket } = require("./socket/index");
const { auth } = require("./middleware/auth");
const { runMigrations } = require("./migrate");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const callRoutes = require("./routes/calls");
const uploadRoutes = require("./routes/upload");
const linkRoutes = require("./routes/links");
const groupRoutes = require("./routes/groups");
const channelRoutes = require("./routes/channels");
const statusRoutes = require("./routes/status");
const { Channel, Group, User } = require("./models");
const adminRoutes = require("./routes/admin");
const supportRoutes = require("./routes/support");

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === "production";

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"],
    },
  } : false,
}));

// CORS
const corsOrigin = isProduction ? config.frontendUrl : "*";
app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: !isProduction ? undefined : true,
}));

const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: !isProduction ? undefined : true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Body parsing with reasonable limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));

// Global rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);

// Static uploads - served via authenticated route instead of public


if (isProduction) {
  const frontendDist = path.join(__dirname, "..", "web", "dist");
  app.use(express.static(frontendDist));

  // OG meta for invite link previews
  app.get(["/channel/invite/:code", "/group/invite/:code"], async (req, res, next) => {
    try {
      const isChannel = req.path.startsWith("/channel");
      let title = "TuChat";
      let description = "Join on TuChat";
      let icon = "/pwa-icon.svg";

      if (isChannel) {
        const ch = await Channel.findOne({
          where: { inviteCode: req.params.code },
          include: [{ model: User, as: 'creator', attributes: ['username'] }],
        });
        if (ch) {
          title = `${ch.name} · TuChat Channel`;
          description = ch.description || `Channel by ${ch.creator?.username || 'Unknown'}`;
          if (ch.avatar) icon = ch.avatar;
        }
      } else {
        const grp = await Group.findOne({
          where: { inviteCode: req.params.code },
          include: [{ model: User, as: 'creator', attributes: ['username'] }],
        });
        if (grp) {
          title = `${grp.name} · TuChat Group`;
          description = grp.description || `Group by ${grp.creator?.username || 'Unknown'}`;
          if (grp.avatar) icon = grp.avatar;
        }
      }

      const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="${description.replace(/"/g, '&quot;')}"/>
<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"/>
<meta property="og:description" content="${description.replace(/"/g, '&quot;')}"/>
<meta property="og:image" content="${icon}"/>
<meta property="og:image:width" content="400"/>
<meta property="og:image:height" content="400"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}"/>
<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}"/>
<meta name="twitter:image" content="${icon}"/>
<meta http-equiv="refresh" content="0;url=${req.originalUrl}"/>
<title>${title}</title>
</head><body><script>location.href='${req.originalUrl}'</script></body></html>`;
      res.send(html);
    } catch { next(); }
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "TuChat API",
    version: "1.2.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      messages: "/api/messages",
      calls: "/api/calls",
      upload: "/api/upload",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/ice-servers", auth, (req, res) => {
  const servers = [...config.stunServers];
  if (config.turnServer) {
    servers.push({
      urls: config.turnServer.urls,
      username: config.turnServer.username,
      credential: config.turnServer.credential,
    });
  }
  res.json({ iceServers: servers });
});

app.set("io", io);
setupSocket(io);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
});

const PORT = config.port;

const startServer = async () => {
  await connectDB();
  await runMigrations();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

startServer();
