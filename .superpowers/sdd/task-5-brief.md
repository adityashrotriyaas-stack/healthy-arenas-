
## Task 5: Dishes tab — fixing dish edit save UX

**Files:**
- Modify: `src/components/AdminPanel.jsx` (dishes tab section)

**Interfaces:**
- Consumes: `getDishes`, `saveDishes`, `version`; `dishesApi.create/update/delete`.
- Produces: Dishes tab with per-dish edit card (existing form), "Save" per row, category field as free text w/ `<datalist>` of existing categories (renames create new), availability toggle button, delete button; optimistic UI.

- [ ] **Step 1: Replace saveToApi with per-row save**

Replace the save-to-api loop with per-dish save (create → use returned dish w/ id; update → use sanitized fields):

```js
async function saveDishRow(dish) {
    setSaving(true);
    try {
        if (dish.id) {
            await dishesApi.update(dish.id, dish);
        } else {
            const created = await dishesApi.create(dish);
            dish.id = created.dish.id; // capture DB id
        }
        const updated = dishes.map(d => d.id === dish.id || d === dish ? dish : d);
        setDishes(updated);
        saveDishes(updated);
        toast("Saved!", "success");
    } catch (e) { toast("Save failed", "info"); }
    setSaving(false);
    setEditIdx(null);
    fetchDishes();
}
```

(Edit existing `saveToApi` accordingly. `fetchDishes` is a small re-fetch from `getDishes()` + `setDishes` to keep UI in sync after save.)

- [ ] **Step 2: Category select — free text via datalist**

Replace the edit-form `<select>` (line 242-244) with:

```jsx
<input list="dish-cats" value={dish.category} onChange={e => updateDish(i, "category", e.target.value)} ... />
<datalist id="dish-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
```

`categories` derived (line 25) already: `[...new Set(getDishes().map(d => d.category))].sort()`.

- [ ] **Step 3: Row display — availability toggle + remove delete-only row**

In the row view (lines 294-311): keep Edit/Delete buttons; add an inline availability pill toggle button: `onClick={() => updateDish(i, "available", !dish.available)}` showing "Available/Unavailable" (orange when available).

- [ ] **Step 4: Remove old multi-save button**

Delete the "Save All" footer button (lines 285-290) — replaced by per-row Save in edit card. In edit card, footer buttons become Cancel + Save (calls `saveDishRow(dish)`).

- [ ] **Step 5: Category tab removal**

Delete the entire `{tab === "categories" …}` block; remove `newCat`/`addCategory`/`removeCategory`/`categories` initialization referencing those. Keep `categories` derived state for datalist.

- [ ] **Step 6: Verify**

Run: `npm run build`; open admin Dishes tab in app manually if possible.

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminPanel.jsx
git commit -m "feat: dishes tab per-row save, category datalist, available toggle"
```

---
