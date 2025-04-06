import Client from "wsnet-client";
import { basicHash, decrypt, encrypt, randomBytes } from "./crypto";

import CryptoJS from "crypto-js";

/**
 * @param {Client} client
 */
export default async function initClient(
  client,
  data,
  setData,
  setChatsLoaded
) {
  setData((oldData) => {
    let messageIds = {};

    data = Object.keys(oldData).reduce((acc, chatId) => {
      messageIds = {};
      acc[chatId] = {
        ...oldData[chatId],
        isCalling: false,
        messages: oldData[chatId].messages.filter(
          ({ type, id }) =>
            !["user-joined", "user-exited", "deleted-messages"].includes(
              type
            ) && !messageIds[id]
        ),
      };
      return acc;
    }, {});

    return data;
  });

  const chats = Object.entries(data);
  setChatsLoaded(chats.length);

  // Process each chat concurrently.
  await Promise.all(
    chats.map(async ([chatId, chatInfo]) => {
      // Build a map of existing message IDs.
      const messageIds = chatInfo.messages.reduce((acc, { id }) => {
        acc[id] = 1;
        return acc;
      }, {});

      // Attempt to join the chat and fetch new messages.
      let joinRes = await client.get("join", {
        chatId,
        passwordHash: basicHash(basicHash(chatInfo.password)),
        author: encrypt(chatInfo.password, chatInfo.author),
        messageIds,
        subscription: window.notificationSubscription,
      });

      let unread = joinRes.length;

      console.log("joinRes", JSON.stringify(joinRes, null, 5));

      if (joinRes) {
        setData((old) => {
          let messages = old[chatId].messages;

          if (joinRes?.[joinRes.length - 1]?.deleted === true) {
            const toDelete = {};

            unread += joinRes[joinRes.length - 1].deletedMessages.length;

            for (const id of joinRes[joinRes.length - 1].deletedMessages) {
              toDelete[id] = true;
            }

            messages = messages.filter(({ id }) => !toDelete[id]);

            joinRes.splice(joinRes.length - 1, 1);
          }

          joinRes = joinRes.map(({ id, message }) => {
            try {
              return {
                ...JSON.parse(decrypt(chatInfo.password, message)),
                id,
              };
            } catch (error) {
              return {
                type: "error",
                data: "an error occurred (wrong password) (ignorable error)",
                id,
              };
            }
          });

          const usedMsgIds = {};
          messages = [...messages, ...joinRes].filter(msg => !usedMsgIds[msg.id]);

          for (const msg of joinRes) {
            if (msg.type == "update") {
              const [editMsgId, type, value] = msg.data;
              const editMsgIndex = messages.findIndex(
                ({ id }) => id == editMsgId
              );
              if (editMsgIndex == -1) continue;
              if (type == "comment") {
                messages[editMsgIndex]?.comments?.push?.(value);
              }
            }
          }

          console.log("messages", JSON.stringify(messages, null, 5));

          return {
            ...old,
            [chatId]: {
              ...old[chatId],
              unread,
              messages,
            },
          };
        });

        // Fetch and add user data.
        let users = await client.get("users", chatId);

        if (users) {
          users = users.map((user) => {
            let author;
            try {
              author = decrypt(chatInfo.password, user);
            } catch (error) {
              author = "error";
            }
            return author;
          });

          setData((old) => {
            return {
              ...old,
              [chatId]: {
                ...old[chatId],
                messages: [
                  ...old[chatId].messages,
                  ...users.map((author) => {
                    return {
                      type: "user-joined",
                      data: "user joined: " + author,
                      author,
                      id: randomBytes(4).toString(CryptoJS.enc.Base64),
                    };
                  }),
                ],
                userStates: {},
              },
            };
          });
        }
      } else
        return alert(
          "Maybe your password is incorct (remove the group from your chats) => group: " +
          chatInfo.chatName
        );
      setChatsLoaded((x) => x - 1);
    })
  );
}
