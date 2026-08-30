# Implement This Module Carefully — HTML Is the Source of Truth

You are implementing a **large module based on the provided HTML file**.

This module needs to be implemented with **very high visual and structural accuracy**. Please do not rush this implementation.

The goal is to reproduce the provided HTML/design inside the existing project, **not to redesign or reinterpret it**.

---

## 1. Read the project rules first

Before doing anything:

- Read the existing `CLAUDE.md` completely.
- Follow all project conventions, schema, architecture, component patterns, and styling rules defined there.
- Inspect the existing project and reuse existing components/patterns where appropriate.

Do not introduce a different architecture if the project already has an established approach.

---

## 2. Read the ENTIRE HTML before implementing

This is extremely important.

**Read the provided HTML file carefully from beginning to end before starting the implementation.**

Do not skim it and do not start coding after only understanding the first sections.

The HTML is the **source of truth** for the module.

Make sure you understand all:

- Sections
- Containers
- Nested elements
- Forms
- Tables
- Buttons
- Inputs
- Toggles
- Checkboxes
- Selects
- Icons
- Labels
- Helper text
- States
- Modals
- Tabs
- Empty states
- Other UI elements

Because this is a large module, keep track of the complete structure while implementing so nothing is accidentally missed.

---

# 3. EXACT LAYOUT — THIS IS THE MOST IMPORTANT PART

Please pay **extreme attention to the original layout**.

**Do not redesign, reorganize, or "improve" the layout.**

If elements are vertically stacked in the HTML/design, they must remain vertically stacked.

If they are horizontally arranged, keep them horizontal.

If elements belong to a particular container, preserve that relationship.

If elements appear in a specific order, preserve that order.

### For example:

If the source looks like:

```text
Field A
Field B
Field C
```

Do NOT turn it into:

```text
Field A    Field B    Field C
```

just because a horizontal layout seems cleaner.

Likewise, do not move elements around to create what you think is a better layout.

**The source layout takes priority over your personal UI interpretation.**

---

# 4. USE THE CORRECT UI CONTROL

This is another area I want you to be especially careful with.

Do not substitute one control for another.

For example:

- Switch/toggle → **Switch/toggle**
- Checkbox → **Checkbox**
- Radio → **Radio**
- Select → **Select/dropdown**
- Input → **Input**
- Textarea → **Textarea**
- Tabs → **Tabs**
- Modal → **Modal**

### Especially important:

If the HTML/design contains a **switch/toggle**, do NOT implement it as a checkbox.

This has caused problems in previous modules, so please verify every occurrence carefully.

---

# 5. Do not omit small details

Do not only implement the major sections.

Pay attention to small elements such as:

- Labels
- Descriptions
- Helper text
- Icons
- Dividers
- Badges
- Status indicators
- Secondary actions
- Small buttons
- Required indicators
- Empty states
- Error states
- Disabled/selected states

If something exists in the HTML, it should be accounted for in the React implementation.

---

# 6. Preserve styling and spacing

Pay close attention to:

- Padding
- Margins
- Gaps
- Widths
- Heights
- Alignment
- Typography
- Borders
- Border radius
- Shadows
- Colors
- Element positioning

Do not replace the source layout with a generic flex/grid structure that changes the visual result.

---

# 7. Run the application and visually verify it

After implementing the module, **run the project's existing development server** and open the module in the browser.

Do not consider the task complete just because the code compiles.

Visually compare the rendered React implementation against the provided HTML.

Check specifically for:

- Incorrect vertical/horizontal positioning
- Incorrect spacing
- Incorrect alignment
- Missing elements
- Wrong component types
- Wrong element order
- Incorrect widths/heights
- Missing icons or text
- Incorrect states

If browser screenshots/visual inspection are available in your environment, use them.

**Fix discrepancies you find rather than accepting that the result is "close enough."**

---

# 8. Perform a final second pass

Once you think the module is finished:

**Go back to the original HTML and review it again from beginning to end.**

This second pass is specifically to make sure nothing was missed.

Verify:

- Every major section exists.
- Every meaningful UI element exists.
- Element order matches.
- Layout matches.
- Vertical/horizontal relationships match.
- Controls use the correct types.
- Text and icons are present.
- Spacing and styling are close to the source.
- The browser-rendered result matches the source.

---

# Final Priority

If you remember only a few things from this prompt, remember these:

> **1. Read the entire HTML carefully before coding.**

> **2. Follow `CLAUDE.md` and the existing project architecture.**

> **3. Reproduce the exact layout — do not redesign or reinterpret it.**

> **4. Use the correct UI controls — especially switches/toggles vs checkboxes.**

> **5. Run the application and visually verify the result.**

> **6. Review the HTML a second time before declaring the module complete.**

I would much rather you spend extra time analyzing and verifying the module than implement it quickly and leave me with many small layout corrections afterward.