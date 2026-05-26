CREATE DATABASE IF NOT EXISTS whatsapp_clone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE whatsapp_clone;

CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phoneNumber VARCHAR(20) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  status VARCHAR(150) DEFAULT 'Hey there! I am using WhatsApp Clone',
  isOnline BOOLEAN DEFAULT false,
  lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
  publicKey TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (replyToId) REFERENCES Messages(id) ON DELETE SET NULL,
  INDEX idx_sender_receiver (senderId, receiverId),
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
