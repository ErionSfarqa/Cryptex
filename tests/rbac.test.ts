import { isAdminRole } from "../lib/auth/isAdmin";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log("RBAC tests: start");

// Normal user should not be admin
assert(isAdminRole("user") === false, "user should not be admin");
assert(isAdminRole("User") === false, "User should not be admin");
assert(isAdminRole(null) === false, "null should not be admin");
assert(isAdminRole(undefined) === false, "undefined should not be admin");

// Admin role should be admin (case-insensitive)
assert(isAdminRole("ADMIN") === true, "ADMIN should be admin");
assert(isAdminRole("admin") === true, "admin should be admin");
assert(isAdminRole(" Admin ") === true, " Admin  should be admin");

console.log("RBAC tests: passed");
