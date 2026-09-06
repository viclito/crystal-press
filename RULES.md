# 🛑 Mandatory Development & Chat Verification Rules

> **CRITICAL RULE FOR ALL CHATS, ASSISTANTS, AND DEVELOPERS**
> In every single chat and interaction, whenever any file is created, altered, or refactored in this project, there must be **ZERO errors** (including HTTP 400, 401, 402, 403, 500, unhandled exceptions, and type/runtime crashes). You must actively verify this, and if any error occurs, you must immediately diagnose and make it right.

---

## 📌 Rule Breakdown

### 1. Zero HTTP / Runtime Error Mandate
Whenever modifying, creating, or testing files, ensure none of the following error codes or failures occur:
- **`400 Bad Request`**: Malformed payloads, missing fields, or invalid schemas. Always validate and sanitize payloads with Zod before processing.
- **`401 Unauthorized`**: Missing session, expired tokens, or unauthenticated requests. Always verify user session and handle unauthenticated states gracefully.
- **`402 Payment Required`**: Unhandled payment processing errors or invalid billing states.
- **`403 Forbidden`**: Role-Based Access Control (RBAC) violations. Verify user permissions and handle forbidden access gracefully with proper UI states.
- **`500 Internal Server Error`**: Unhandled exceptions, database query failures, missing environment variables, or null pointer exceptions. Wrap critical logic in try/catch blocks and return safe, structured fallback responses.

---

### 2. Zero React Hook & Client-Side Exception Mandate
Whenever creating or altering React UI components:
- **Strict Rules of Hooks**:
  - **NEVER** call React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, custom hooks) after any conditional return (e.g. `if (!isOpen) return null;`, `if (loading) return ...;`, `if (!data) return ...;`).
  - All hooks **MUST** be placed unconditionally at the very top of functional components before any `return` statement.
  - **NEVER** call hooks inside `if/else` statements, loops, or nested callback functions.
  - Prevent **Minified React Error #300, #310, #321** and any other client-side render exceptions.
- **ESLint & Static Verification**: Always ensure ESLint rule `"react-hooks/rules-of-hooks": "error"` is enforced and passes cleanly.

---

### 3. Verification in Every Chat
In **every chat turn** where files are created or altered:
1. **React Hooks & UI Check**: Verify that all hooks are called unconditionally at the top of components and no client-side exceptions occur.
2. **Lint & Type Check**: Verify there are no TypeScript compile errors (`npx tsc --noEmit`), missing imports, or syntax mistakes.
3. **Endpoint & Action Verification**: Check that route handlers, Server Actions, and UI components return valid status codes (`200 OK`, `201 Created`, etc.) and do not throw uncaught errors.
4. **Database Safety**: Ensure Prisma transactions, queries, and migrations execute cleanly without schema or relational mismatch errors.

---

### 4. Immediate Self-Correction Protocol
If any error (e.g., Minified React Error #310, 400, 401, 402, 403, 500, or UI client crash) occurs or is discovered:
- **Do not ignore or bypass the error.**
- **Analyze the root cause** (check browser console, server logs, React error URLs, stack traces).
- **Make it right immediately** in the same turn before finishing.
- **Audit existing functions**: Check all related components to confirm whether the same pattern or error exists elsewhere and clear it immediately.
- **Re-test and verify** that the error is resolved, the application renders cleanly, and the production build passes.
