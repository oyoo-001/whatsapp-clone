const User = require('./User');
const Message = require('./Message');
const CallLog = require('./CallLog');
const Contact = require('./Contact');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const GroupMessage = require('./GroupMessage');

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

module.exports = { User, Message, CallLog, Contact, Group, GroupMember, GroupMessage };
