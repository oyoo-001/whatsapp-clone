const User = require('./User');
const Message = require('./Message');
const CallLog = require('./CallLog');
const Contact = require('./Contact');

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

module.exports = { User, Message, CallLog, Contact };
