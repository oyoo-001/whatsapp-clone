CREATE DATABASE IF NOT EXISTS whatsapp_clone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE whatsapp_clone;

CREATE TABLE IF NOT EXISTS Users (
   id INT AUTO_INCREMENT PRIMARY KEY,
   username VARCHAR(50) NOT NULL,
   phoneNumber VARCHAR(20) NOT NULL UNIQUE,
   avatar VARCHAR(500),
   status VARCHAR(100),
   isOnline BOOLEAN DEFAULT false,
   lastSeen DATETIME,
   isAdmin BOOLEAN DEFAULT false,
   isBanned BOOLEAN DEFAULT false,
   createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX idx_phone (phoneNumber),
   INDEX idx_status (status)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert system user for broadcasts
  INSERT INTO Users (id, username, phoneNumber, avatar, status, isOnline, lastSeen, isAdmin, isBanned, createdAt, updatedAt)
  SELECT * FROM (SELECT 0, 'System', NULL, NULL, NULL, false, NULL, false, false, NOW(), NOW()) AS tmp
  WHERE NOT EXISTS (SELECT id FROM Users WHERE id = 0);

CREATE TABLE IF NOT EXISTS Statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  content TEXT,
  mediaUrl VARCHAR(500),
  mediaType VARCHAR(20) DEFAULT 'text',
  backgroundColor VARCHAR(20),
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_user_expires (userId, expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS StatusViews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  statusId INT NOT NULL,
  viewerId INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (statusId) REFERENCES Statuses(id) ON DELETE CASCADE,
  FOREIGN KEY (viewerId) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_status_viewer (statusId, viewerId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Channels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar VARCHAR(500),
  createdBy INT NOT NULL,
  inviteCode VARCHAR(20) UNIQUE,
  isVerified BOOLEAN DEFAULT false,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_channel_invite (inviteCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ChannelFollowers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  channelId INT NOT NULL,
  userId INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (channelId) REFERENCES Channels(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_channel_user (channelId, userId),
  INDEX idx_channel_follower_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ChannelPosts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  channelId INT NOT NULL,
  senderId INT NOT NULL,
  content TEXT,
  messageType VARCHAR(20) DEFAULT 'text',
  fileUrl VARCHAR(500),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (channelId) REFERENCES Channels(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_channel_posts (channelId, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS SupportTickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  adminId INT,
  subject VARCHAR(255),
  status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
  contactPhone VARCHAR(20),
  isBannedRequest BOOLEAN DEFAULT false,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_ticket_user_status (userId, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS SupportMessages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticketId INT NOT NULL,
  senderId INT NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ticketId) REFERENCES SupportTickets(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_ticket_messages (ticketId, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  receiverId INT NOT NULL,
  content TEXT,
  messageType ENUM('text', 'image', 'video', 'audio', 'file', 'location', 'contact') DEFAULT 'text',
  fileUrl VARCHAR(500),
  fileSize BIGINT,
  mimeType VARCHAR(100),
  isRead BOOLEAN DEFAULT false,
  isDelivered BOOLEAN DEFAULT false,
  replyToId INT,
  reactions JSON DEFAULT (JSON_OBJECT()),
  isBroadcast BOOLEAN DEFAULT false,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (replyToId) REFERENCES Messages(id) ON DELETE SET NULL,
  INDEX idx_sender_receiver (senderId, receiverId),
  INDEX idx_receiver_read (receiverId, isRead),
  INDEX idx_sender_receiver_created (senderId, receiverId, createdAt),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CallLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  callerId INT NOT NULL,
  receiverId INT,
  callType ENUM('voice', 'video') NOT NULL,
  startTime DATETIME,
  endTime DATETIME,
  duration INT COMMENT 'Duration in seconds',
  callStatus ENUM('missed', 'answered', 'rejected', 'cancelled', 'busy') DEFAULT 'missed',
  isGroupCall BOOLEAN DEFAULT false,
  groupId INT,
  participants JSON DEFAULT (JSON_ARRAY()),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (callerId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES Users(id) ON DELETE SET NULL,
  INDEX idx_caller (callerId),
  INDEX idx_receiver (receiverId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL COMMENT 'The user who owns this contact list',
  contactUserId INT NOT NULL COMMENT 'The user who is added as contact',
  customName VARCHAR(50),
  isBlocked BOOLEAN DEFAULT false,
  isFavorite BOOLEAN DEFAULT false,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (contactUserId) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_contact (userId, contactUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(500),
  description TEXT,
  createdBy INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_created_by (createdBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS GroupMembers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('admin', 'member') DEFAULT 'member',
  unreadCount INT DEFAULT 0,
  joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (groupId) REFERENCES `Groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_group_user (groupId, userId),
  INDEX idx_user_group (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS GroupMessages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL,
  senderId INT NOT NULL,
  content TEXT,
  messageType ENUM('text', 'image', 'video', 'audio', 'file') DEFAULT 'text',
  fileUrl VARCHAR(500),
  replyToId INT,
  replyToContent TEXT,
  replyToSenderId INT,
  replyToSenderName VARCHAR(50),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (groupId) REFERENCES `Groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_group_messages (groupId, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
