const { ROLES, checkRole } = require("../rbac");
const { log } = require("../../src/util");
const { Settings } = require("../settings");
const { sendInfo } = require("../client");
const { checkLogin } = require("../util-server");
const { games } = require("gamedig");
const { testChrome } = require("../monitor-types/real-browser-monitor-type");
const { getPM2ProcessList } = require("../util/pm2");
const fsAsync = require("fs").promises;
const path = require("path");

/**
 * Get a game list via GameDig
 * @returns {object} list of games supported by GameDig
 */
function getGameList() {
    let gameList = [];
    gameList = Object.keys(games).map((key) => {
        const item = games[key];
        return {
            keys: [key],
            pretty: item.name,
            options: item.options,
            extra: item.extra || {},
        };
    });
    gameList.sort((a, b) => {
        if (a.pretty < b.pretty) {
            return -1;
        }
        if (a.pretty > b.pretty) {
            return 1;
        }
        return 0;
    });
    return gameList;
}

/**
 * Handler for general events
 * @param {Socket} socket Socket.io instance
 * @param {UptimeKumaServer} server Uptime Kuma server
 * @returns {void}
 */
module.exports.generalSocketHandler = (socket, server) => {
    // تنظیم تایم‌زون سرور (مخصوص Admin)
    socket.on("initServerTimezone", async (timezone) => {
        try {
            checkRole(socket, [ROLES.ADMIN]);
            log.debug("generalSocketHandler", "Timezone: " + timezone);
            await Settings.set("initServerTimezone", true);
            await server.setTimezone(timezone);
            await sendInfo(socket);
        } catch (e) {
            log.warn("initServerTimezone", e.message);
        }
    });

    socket.on("getGameList", async (callback) => {
        try {
            checkLogin(socket);
            callback({
                ok: true,
                gameList: getGameList(),
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    // دریافت لیست پردازش‌های PM2 سرور (مخصوص Admin)
    socket.on("getPM2ProcessList", async (callback) => {
        try {
            checkRole(socket, [ROLES.ADMIN]);
            callback({
                ok: true,
                processList: await getPM2ProcessList(),
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    // تست کروم برای مرورگر مانیتورینگ (مخصوص Admin)
    socket.on("testChrome", (executable, callback) => {
        try {
            checkRole(socket, [ROLES.ADMIN]);
            // Just noticed that await call could block the whole socket.io server!!! Use pure promise instead.
            testChrome(executable)
                .then((version) => {
                    callback({
                        ok: true,
                        msg: {
                            key: "foundChromiumVersion",
                            values: [version],
                        },
                        msgi18n: true,
                    });
                })
                .catch((e) => {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("getPushExample", async (language, callback) => {
        try {
            checkLogin(socket);
            if (!/^[a-z-]+$/.test(language)) {
                throw new Error("Invalid language");
            }
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
            return;
        }

        try {
            let dir = path.join("./extra/push-examples", language);
            let files = await fsAsync.readdir(dir);

            for (let file of files) {
                if (file.startsWith("index.")) {
                    callback({
                        ok: true,
                        code: await fsAsync.readFile(path.join(dir, file), "utf8"),
                    });
                    return;
                }
            }
        } catch (e) {}

        callback({
            ok: false,
            msg: "Not found",
        });
    });

    // قطع ارتباط نشست‌های دیگر کاربر (نیاز به لاگین)
    socket.on("disconnectOtherSocketClients", async () => {
        try {
            checkLogin(socket);
            server.disconnectAllSocketClients(socket.userID, socket.id);
        } catch (e) {
            log.warn("disconnectAllSocketClients", e.message);
        }
    });
};