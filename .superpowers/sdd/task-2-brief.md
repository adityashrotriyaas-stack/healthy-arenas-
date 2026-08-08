## Task 2: Remove dead categories API + load menu from DB on boot

**Files:**
- Modify: `src/api/client.js` (remove `categoriesApi`)
- Modify: `src/lib/contexts.jsx:46-71` (DishesProvider — auto-load from API on mount)
- Modify: `src/data/dishes.js` (unchanged — DISHES stays as fallback)

**Interfaces:**
- Consumes: `dishesApi.list()` (exists)
- Produces: no new exports; DishesProvider now calls `loadFromApi()` in a mount effect. Customer menu (uses `getDishes()`) therefore sees DB dishes after boot.

- [ ] **Step 1: Delete categoriesApi block from client.js**

Remove lines 49-53 (the `categoriesApi` export). Nothing imports it (verified: not referenced anywhere in `src/`).

- [ ] **Step 2: Wire loadFromApi into DishesProvider**

Replace in `src/lib/contexts.jsx` the DishesProvider body:

```jsx
function DishesProvider({ children }) {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        dishesApi.list().then(data => {
            if (data?.dishes?.length) {
                localStorage.setItem("admin_dishes", JSON.stringify(data.dishes));
                setVersion(v => v + 1);
            }
        }).catch(() => {});
    }, []);
    // getDishes / saveDishes / loadFromApi unchanged
    ...
}
```

Remove `loadFromApi` from the exported context value (no longer used) but keep the function body if any other code uses it — first grep `loadFromApi`; if only here, inline it as above and drop the export.

- [ ] **Step 3: Verify**

Run: `npm run build` — must pass. Grep to confirm no `categoriesApi` references remain.

- [ ] **Step 4: Commit**

```bash
git add src/api/client.js src/lib/contexts.jsx
git commit -m "fix: menu loads from DB on boot, drop dead categories API"
```

---

