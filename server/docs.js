/*
Server Data:
chats[chatId] = {
  clients: [{ client, author }],
  messages: [{id, message}],
  passwordHashHash: basicHash(passwordHash),
};
*/

/*
Client Function:
"user-exited" => { chatId, message: author, messageId: 0 }
"user-joined" => { chatId, message: author, messageId: 0 }
"message" => { chatId, message, messageId }
"message-deleted" => { chatId, message, messageId }
"chat-deleted" => { chatId, message: 0 , messageId: 0 }
*/
