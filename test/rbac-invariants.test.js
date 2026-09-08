/**
 * RBAC Invariants & Test Report
 * ==============================
 * Uptime Kuma RBAC System Analysis
 *
 * Roles: admin, editor, viewer
 * Date: 2026-09-08
 */

const { ROLES, checkRole } = require("../server/rbac");

// ============================================================================
// SECTION 1: INVARIANTS
// ============================================================================

/**
 * INVARIANT 1: First user is always admin
 * Location: server/server.js:714
 * Rule: The initial setup user MUST have role "admin"
 */
// Code: user.role = "admin"; // کاربر اولیه همواره ادمین است

/**
 * INVARIANT 2: Default role for new users is viewer
 * Location: server/server.js:1732
 * Rule: When creating a user without specifying role, default MUST be "viewer"
 */
// Code: user.role = data.role || "viewer";

/**
 * INVARIANT 3: checkRole throws if not logged in
 * Location: server/rbac.js:14
 * Rule: If socket.userID is falsy, MUST throw "You are not logged in."
 */

/**
 * INVARIANT 4: checkRole throws if role not allowed
 * Location: server/rbac.js:19-21
 * Rule: If user's role is not in allowedRoles array, MUST throw permission error
 */

/**
 * INVARIANT 5: Default role fallback is viewer
 * Location: server/rbac.js:17
 * Rule: If socket.userRole is undefined, MUST default to ROLES.VIEWER
 */

/**
 * INVARIANT 6: Self-deletion prevention
 * Location: server/server.js:1748-1749
 * Rule: Admin cannot delete their own account
 */

/**
 * INVARIANT 7: Role validation in addUser
 * Location: server/server.js:1732
 * Rule: Assigned role MUST be one of: admin, editor, viewer
 */

// ============================================================================
// SECTION 2: ACCESS CONTROL MATRIX
// ============================================================================

/**
 * ACCESS MATRIX (from code analysis):
 *
 * Operation                    | Admin | Editor | Viewer
 * -----------------------------|-------|--------|-------
 * add monitor                  |  ✓   |   ✓    |   ✗
 * edit monitor                 |  ✓   |   ✓    |   ✗
 * delete monitor               |  ✓   |   ✓    |   ✗
 * pause monitor                |  ✓   |   ✓    |   ✗
 * add notification             |  ✓   |   ✓    |   ✗
 * edit notification            |  ✓   |   ✓    |   ✗
 * delete notification          |  ✓   |   ✓    |   ✗
 * get monitors list            |  ✓   |   ✓    |   ✓
 * get heartbeat                |  ✓   |   ✓    |   ✓
 * get user list                |  ✓   |   ✗    |   ✗
 * add user                     |  ✓   |   ✗    |   ✗
 * delete user                  |  ✓   |   ✗    |   ✗
 * change password (self)       |  ✓   |   ✓    |   ✓
 * init server timezone         |  ✓   |   ✗    |   ✗
 * get PM2 process list         |  ✓   |   ✗    |   ✗
 * test Chrome                  |  ✓   |   ✗    |   ✗
 */

// ============================================================================
// SECTION 3: TESTS
// ============================================================================

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName) {
    if (condition) {
        passed++;
        results.push({ test: testName, status: "PASS" });
        console.log(`  ✓ ${testName}`);
    } else {
        failed++;
        results.push({ test: testName, status: "FAIL" });
        console.log(`  ✗ ${testName}`);
    }
}

function assertThrows(fn, expectedMessage, testName) {
    try {
        fn();
        failed++;
        results.push({ test: testName, status: "FAIL", reason: "Did not throw" });
        console.log(`  ✗ ${testName} (did not throw)`);
    } catch (e) {
        if (expectedMessage && e.message !== expectedMessage) {
            failed++;
            results.push({ test: testName, status: "FAIL", reason: `Expected: "${expectedMessage}", Got: "${e.message}"` });
            console.log(`  ✗ ${testName} (wrong message: "${e.message}")`);
        } else {
            passed++;
            results.push({ test: testName, status: "PASS" });
            console.log(`  ✓ ${testName}`);
        }
    }
}

console.log("\n========================================");
console.log("RBAC INVARIANT TESTS");
console.log("========================================\n");

// --- Test Group 1: ROLES Constants ---
console.log("Group 1: ROLES Constants");
assert(ROLES.ADMIN === "admin", "ROLES.ADMIN equals 'admin'");
assert(ROLES.EDITOR === "editor", "ROLES.EDITOR equals 'editor'");
assert(ROLES.VIEWER === "viewer", "ROLES.VIEWER equals 'viewer'");
assert(Object.keys(ROLES).length === 3, "Exactly 3 roles defined");

// --- Test Group 2: checkRole - Not Logged In ---
console.log("\nGroup 2: checkRole - Authentication");
assertThrows(
    () => checkRole({ userID: null }, [ROLES.ADMIN]),
    "You are not logged in.",
    "Throws when userID is null"
);
assertThrows(
    () => checkRole({ userID: undefined }, [ROLES.ADMIN]),
    "You are not logged in.",
    "Throws when userID is undefined"
);
assertThrows(
    () => checkRole({}, [ROLES.ADMIN]),
    "You are not logged in.",
    "Throws when socket has no userID"
);

// --- Test Group 3: checkRole - Permission Denied ---
console.log("\nGroup 3: checkRole - Authorization");
assertThrows(
    () => checkRole({ userID: 1, userRole: "viewer" }, [ROLES.ADMIN]),
    "Permission Denied: Insufficient permissions for this action.",
    "Viewer cannot access admin-only route"
);
assertThrows(
    () => checkRole({ userID: 1, userRole: "viewer" }, [ROLES.ADMIN, ROLES.EDITOR]),
    "Permission Denied: Insufficient permissions for this action.",
    "Viewer cannot access admin+editor route"
);
assertThrows(
    () => checkRole({ userID: 1, userRole: "editor" }, [ROLES.ADMIN]),
    "Permission Denied: Insufficient permissions for this action.",
    "Editor cannot access admin-only route"
);

// --- Test Group 4: checkRole - Permission Granted ---
console.log("\nGroup 4: checkRole - Allowed Access");
let noError = true;
try {
    checkRole({ userID: 1, userRole: "admin" }, [ROLES.ADMIN]);
} catch (e) { noError = false; }
assert(noError, "Admin can access admin-only route");

noError = true;
try {
    checkRole({ userID: 1, userRole: "admin" }, [ROLES.ADMIN, ROLES.EDITOR]);
} catch (e) { noError = false; }
assert(noError, "Admin can access admin+editor route");

noError = true;
try {
    checkRole({ userID: 1, userRole: "editor" }, [ROLES.ADMIN, ROLES.EDITOR]);
} catch (e) { noError = false; }
assert(noError, "Editor can access admin+editor route");

noError = true;
try {
    checkRole({ userID: 1, userRole: "viewer" }, [ROLES.VIEWER]);
} catch (e) { noError = false; }
assert(noError, "Viewer can access viewer-only route");

// --- Test Group 5: Default Role Fallback ---
console.log("\nGroup 5: Default Role Fallback");
// When userRole is undefined, checkRole defaults to viewer
assertThrows(
    () => checkRole({ userID: 1 }, [ROLES.ADMIN]),
    "Permission Denied: Insufficient permissions for this action.",
    "Undefined userRole defaults to viewer (denied from admin route)"
);

noError = true;
try {
    checkRole({ userID: 1 }, [ROLES.VIEWER]);
} catch (e) { noError = false; }
assert(noError, "Undefined userRole defaults to viewer (allowed on viewer route)");

// --- Test Group 6: Edge Cases ---
console.log("\nGroup 6: Edge Cases");
assertThrows(
    () => checkRole({ userID: 1, userRole: "hacker" }, [ROLES.ADMIN]),
    "Permission Denied: Insufficient permissions for this action.",
    "Invalid role 'hacker' is denied"
);
assertThrows(
    () => checkRole({ userID: 1, userRole: "" }, [ROLES.ADMIN]),
    "Permission Denied: Insufficient permissions for this action.",
    "Empty string role is denied"
);
assertThrows(
    () => checkRole({ userID: 1, userRole: "ADMIN" }, [ROLES.ADMIN]),
    "Permission Denied: Insufficient permissions for this action.",
    "Case-sensitive: 'ADMIN' != 'admin'"
);
assertThrows(
    () => checkRole({ userID: 1, userRole: "admin" }, []),
    "Permission Denied: Insufficient permissions for this action.",
    "Empty allowedRoles array denies everyone"
);

// ============================================================================
// SECTION 4: SUMMARY
// ============================================================================

console.log("\n========================================");
console.log("RESULTS SUMMARY");
console.log("========================================");
console.log(`  Total:  ${passed + failed}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log("========================================\n");

if (failed > 0) {
    console.log("FAILED TESTS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
        console.log(`  ✗ ${r.test}${r.reason ? ` - ${r.reason}` : ""}`);
    });
    console.log("");
}

process.exit(failed > 0 ? 1 : 0);
