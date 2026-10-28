# Security Specification & Threat Model

## 1. Data Invariants
1. **User Identity Boundary**: A user can only access, create, mutate, or delete their own conversation records under `/users/{userId}/conversations/{conversationId}`.
2. **Subcollection Relational Integrity**: A message `/users/{userId}/conversations/{conversationId}/messages/{messageId}` can only be created if the parent conversation `/users/{userId}/conversations/{conversationId}` actually exists and is owned by `request.auth.uid`.
3. **Immutable Ownership**: Once written, `userId` on a Conversation or Message cannot be changed.
4. **Boundary & Input Sanitization**:
   - `id`, `conversationId`, `userId` must conform to alphanumeric characters and dashes/underscores with max length 128.
   - `title` max length is 200 characters.
   - `tone` must be one of `['professional', 'casual', 'concise']`.
   - `role` must be one of `['user', 'model']`.
   - `content` must be a string up to 50,000 characters.
5. **No Blanket Reads**: All read and list operations evaluate ownership directly against `request.auth.uid`.

## 2. The Dirty Dozen Attack Payloads
1. **ID Poisoning**: Injecting 2KB regex strings into `{conversationId}`.
2. **User Identity Spoofing**: User A creating a conversation under User B's `/users/{userB}/...`.
3. **Ghost Field Injection**: Adding an unverified field `isAdmin: true` inside a conversation document.
4. **Orphan Message Injection**: Adding a message for a nonexistent `conversationId`.
5. **Cross-Tenant Message Hijacking**: Adding a message with `userId: userB` into User A's thread.
6. **Payload Size Exhaustion**: Sending 2MB content string inside a message.
7. **Invalid Tone Enum Injection**: Passing `tone: "malicious_prompt"`.
8. **Invalid Role Enum Injection**: Passing `role: "system_admin"`.
9. **Timestamp Rewriting**: Tampering with `createdAt` on an existing conversation.
10. **Ownership Hijacking via Update**: Sending an update mutating `userId` to another user's ID.
11. **Unauthenticated Access**: Attempting `list` or `get` without an authenticated session.
12. **Blanket Read Scraping**: Attempting a query without `where('userId', '==', auth.uid)`.
