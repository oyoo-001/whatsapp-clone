const User = require('./User');
const Message = require('./Message');
const CallLog = require('./CallLog');
const Contact = require('./Contact');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const GroupMessage = require('./GroupMessage');
const SupportTicket = require('./SupportTicket');
const SupportMessage = require('./SupportMessage');
const Broadcast = require('./Broadcast');
const BroadcastRead = require('./BroadcastRead');
const Channel = require('./Channel');
const ChannelFollower = require('./ChannelFollower');
const ChannelPost = require('./ChannelPost');
const Status = require('./Status');
const StatusView = require('./StatusView');

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

User.hasMany(CallLog, { foreignKey: 'callerId', as: 'initiatedCalls' });
User.hasMany(CallLog, { foreignKey: 'receiverId', as: 'receivedCalls' });
CallLog.belongsTo(User, { foreignKey: 'callerId', as: 'caller' });
CallLog.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

User.hasMany(Contact, { foreignKey: 'userId', as: 'contactLists' });
User.hasMany(Contact, { foreignKey: 'contactUserId', as: 'addedInContacts' });
Contact.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
Contact.belongsTo(User, { foreignKey: 'contactUserId', as: 'contactUser' });

Group.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId', otherKey: 'userId', as: 'participants' });
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId', otherKey: 'groupId', as: 'groups' });
Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'memberships' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Group.hasMany(GroupMessage, { foreignKey: 'groupId', as: 'messages' });
GroupMessage.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
GroupMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'supportTickets' });
User.hasMany(SupportTicket, { foreignKey: 'adminId', as: 'assignedTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SupportTicket.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticketId', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket' });
SupportMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Broadcast.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Broadcast.hasMany(BroadcastRead, { foreignKey: 'broadcastId', as: 'reads' });
BroadcastRead.belongsTo(Broadcast, { foreignKey: 'broadcastId', as: 'broadcast' });
BroadcastRead.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Channel.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Channel.hasMany(ChannelFollower, { foreignKey: 'channelId', as: 'followers' });
Channel.hasMany(ChannelPost, { foreignKey: 'channelId', as: 'posts' });
ChannelFollower.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });
ChannelFollower.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ChannelPost.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });
ChannelPost.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(Status, { foreignKey: 'userId', as: 'statuses' });
Status.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Status.hasMany(StatusView, { foreignKey: 'statusId', as: 'views' });
StatusView.belongsTo(Status, { foreignKey: 'statusId', as: 'status' });
StatusView.belongsTo(User, { foreignKey: 'viewerId', as: 'viewer' });

const DeviceToken = require('./DeviceToken');
User.hasMany(DeviceToken, { foreignKey: 'userId', as: 'deviceTokens' });
DeviceToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Message, CallLog, Contact, Group, GroupMember, GroupMessage, SupportTicket, SupportMessage, Broadcast, BroadcastRead, Channel, ChannelFollower, ChannelPost, Status, StatusView, DeviceToken };
