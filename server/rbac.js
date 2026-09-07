const ROLES = {
    ADMIN: "admin",
    EDITOR: "editor",
    VIEWER: "viewer",
};

/**
 * بررسی اینکه آیا کاربر نقش لازم را دارد یا خیر
 * @param {object} socket شیء سوکت متصل شده
 * @param {string[]} allowedRoles لیست نقش‌های مجاز
 */
function checkRole(socket, allowedRoles = []) {
    if (!socket.userID) {
        throw new Error("You are not logged in.");
    }

    const userRole = socket.userRole || ROLES.VIEWER;

    if (!allowedRoles.includes(userRole)) {
        throw new Error("Permission Denied: Insufficient permissions for this action.");
    }
}

module.exports = {
    ROLES,
    checkRole,
};