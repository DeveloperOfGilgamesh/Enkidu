const X = require("./fca/index"),
  { warn, logger } = require("./utils/logger"),
  { get, post } = require("axios"),
  fs = require("fs"),
  { join } = require("path");
require("./utils/index");
const appState = JSON.parse(fs.readFileSync("botCookie.json", "utf8"));
const { exec } = require("child_process");
let packagePath = join(__dirname, "package.json");
let package = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const { PREFIX, ADMINBOT, BOTNAME } = config;
let p = PREFIX;
global.deku = new Object({
  PREFIX,
  BOTNAME,
  ADMINBOT,
});

/* INSTALLING COMMANDS */
let commandPath = join(__dirname, "scr", "cmd");

for (let files of fs.readdirSync(commandPath)) {
  if (files.endsWith(".js")) {
    let script;
    try {
      if (!files.endsWith(".js"))
        return warn("Command Error: File Extension Error");
      script = require(join(commandPath, files));
      logger("Successfully installed command: " + script.config?.name);
    } catch (e) {
      warn("Can't install command: " + files + "\nReason: " + e);
    }
  }
}
/* END */
process.on("unhandledRejection", (error) => console.error(error));

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
X(
  {
    appState,
  },
  async function (err, api) {
    logger("This bot was made by Deku");
    logger("Contact: https://facebook.com/joshg101");
    if (err) return warn(err);
    api.setOptions(config.option);
    api.listenMqtt(async function (err, event) {
      if (err) warn(err);
      // start
      if (event.body != null) {
        for (let files of fs.readdirSync(commandPath)) {
          if (files.endsWith(".js")) {
            const pa = join(commandPath, files);
            const script = require(pa);
            let s = script.config;
            function reply(text) {
              api.sendMessage(text, event.threadID, event.messageID);
            }
            function react(emoji) {
              api.setMessageReaction(emoji, event.messageID, (err) => {}, true);
            }
            function noP(nam) {
              return reply(
                "You don't have permission to use command " + nam + "!",
              );
            }
            function noPref(nam) {
              reply("Command " + nam + " doesn't need a prefix.");
            }
            function yesPref(nam) {
              reply("Command " + nam + " need a prefix.");
            }
            let input = event.body;
            let args = input.split(" ");
            args.shift();
            let arg = event.body.split(" ");
            let t = arg.shift().toLowerCase();
            let obj = {
              api,
              event,
              react,
              reply,
              text: args,
            };
            if (script.auto) {
              script.auto(obj);
            }
            if (t == "prefix") return reply("Prefix: " + p);
            if (t == p)
              return reply("Type " + p + "help to view available commands.");

            //no prefix
            if (t == p + s?.name && s?.prefix == false) {
              return noPref(s.name);
            }

            //yes prefix
            if (t == s?.name && s?.prefix == true) {
              return yesPref(s?.name);
            }

            //permission
            if (t == p + s?.name || t == s?.name) {
              if (s?.accessableby == 1 && !ADMINBOT.includes(event.senderID)) {
                return noP(s?.name);
              }
            }

            //start
            if (t == p + s?.name || t == s?.name) {
              script.start(obj);
            } // end
          } // end of file ends with .js
        } // end of loop file
      } // end of event body null
      if (event.logMessageType == "log:subscribe") {
        const { threadID } = event;
        let { threadName, participantIDs, imageSrc } =
          await api.getThreadInfo(threadID);
        if (
          event.logMessageData.addedParticipants.some(
            (i) => i.userFbId == api.getCurrentUserID(),
          )
        ) {
          const authorName = (await api.getUserInfo(event.author)).name;
          api.changeNickname(
            `${global.deku.BOTNAME} • [ ${global.deku.PREFIX} ]`,
            event.threadID,
            api.getCurrentUserID(),
          );
          api.shareContact(
            `${global.deku.BOTNAME} connected successfully!\nType "${global.deku.PREFIX}help" to view all command`,
            api.getCurrentUserID(),
            threadID,
          );
          /*---LOGS---*/
          return api.sendMessage(
            `——[BOT LOGS]——\n\nBot has been added to a group.\n\nName: ${threadName || "Unnamed Group"}\n\nID: ${event.threadID}\n\nTotal of members: ${participantIDs.length}\n\nAdded by: ${authorName}\n\n[ f ]: https://facebook.com/${event.author}\n\n——[BOT LOGS]——`,
            global.deku.ADMINBOT[0],
          );
        } else {
          try {
            let addedParticipants1 = event.logMessageData.addedParticipants;
            for (let newParticipant of addedParticipants1) {
              let userID = newParticipant.userFbId;
              const name = (await api.getUserInfo(parseInt(userID))).name;
              if (userID !== api.getCurrentUserID()) {
                api.shareContact(
                  `👋 Hello ${name} 
Welcome to ${threadName || "this group"} 🤗, you're the ${participantIDs.length}th member on this group. Enjoy!🤗`,
                  userID,
                  threadID,
                );
              } // end of if (userID !== api.getCurrentUserID())
            } // end of for (let newParticipant of addedParticipants1)
          } catch (e) {
            return reply(e.message);
          } // end of catch
        } // end of else
      } // end of subscribe
      if (event.logMessageType == "log:unsubscribe") {
        let { threadName, participantIDs } = await api.getThreadInfo(
          event.threadID,
        );
        let tn = threadName || "Unnamed Group";
        if (
          event.logMessageData.leftParticipantFbId == api.getCurrentUserID()
        ) {
          const authorName = (await api.getUserInfo(event.author)).name;
          return api.sendMessage(
            `——[BOT LOGS]——\n\nBot has been kick to a group.\n\nName: ${tn}\n\nID: ${event.threadID}\n\nKicked by: ${authorName}\n\n[ f ]: https://facebook.com/${event.author}\n\n——[BOT LOGS]——`,
            global.deku.aADMINBOT[0],
          );
        } else {
          const type =
            event.author == event.logMessageData.leftParticipantFbId
              ? "left the group."
              : "kicked by the Admin of group.";
          const namee = (
            await api.getUserInfo(event.logMessageData.leftParticipantFbId)
          ).name;
          return api.shareContact(
            namee +
              " has been " +
              type +
              "\n" +
              tn +
              " now has have " +
              participantIDs.length +
              " members left.",
            event.logMessageData.leftParticipantFbId,
            event.threadID,
          );
        } // end of else
      } // end of unsubscribe
    }); // end of listenMqtt
  },
); // end of X

/* 
THIS BOT WAS MADE BY DEKU
CONTACT ME ON FACEBOOK: https://facebook.com/joshg101
*/
