
## Task 7: Users tab + role button fix

**Files:**
- Modify: `src/components/AdminPanel.jsx` (users tab)

**Interfaces:**
- Consumes: `usersApi.list()`, `usersApi.updateRole(id, role)`.
- Produces: existing list + glass styling, functional `setUsers` updates (no stale-closure), error toast on failure, confirm dialog kept.

- [ ] **Step 1: Functional user update in `updateUserRole`**

```js
async function updateUserRole(targetUserId, role) {
    if (!confirm(`Set this user as ${role}?`)) return;
    try {
        await usersApi.updateRole(targetUserId, role);
        setUsers(u => u.map(u2 => u2.id === targetUserId ? { ...u2, role } : u2));
        toast(`User role updated to ${role}`, "success");
    } catch (e) { toast("Failed to update role", "info"); fetchUsers(); }
}
```

- [ ] **Step 2: Users list error + retry**

Same err/retry wiring as orders; show count.

- [ ] **Step 3: Build + commit**

```bash
npm run build  # must pass
git add src/components/AdminPanel.jsx
git commit -m "fix: users role updates functional state, retry, error surfacing"
```

---
