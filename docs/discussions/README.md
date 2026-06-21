# Discussions

## Open Source Examples

Hub content lives in [`open-source-examples.md`](./open-source-examples.md). Publish or refresh it on GitHub:

```bash
npm run discussions:sync
```

### Discussion form templates

GitHub maps each template file to a discussion category **by slug** (see [syntax docs](https://docs.github.com/en/discussions/managing-discussions-for-your-community/syntax-for-discussion-category-forms)).

| File | Category slug | Status |
|------|---------------|--------|
| [`.github/DISCUSSION_TEMPLATE/show-and-tell.yml`](../.github/DISCUSSION_TEMPLATE/show-and-tell.yml) | `show-and-tell` | **Active** — use [New → Show and tell](https://github.com/aadorian/opencodeCLI/discussions/new?category=show-and-tell) |
| [`.github/DISCUSSION_TEMPLATE/open-source-examples.yml`](../.github/DISCUSSION_TEMPLATE/open-source-examples.yml) | `open-source-examples` | Activates after the optional category below is created |

Both forms collect the same fields: repo/gist URL, summary, OpenCode features, optional config snippet, and one lesson learned. Title prefix: `[Example] `.

### Optional: dedicated category

GitHub does not expose an API to create discussion categories. For a separate **Open Source Examples** section (instead of Show and tell):

1. Open **Settings → General → Features → Discussions → Edit categories**
2. Add category **Open Source Examples** with emoji 📚 (slug must be `open-source-examples`)
3. Re-run `npm run discussions:sync` (creates the hub in the new category)
4. Pin the hub next to [Welcome](https://github.com/aadorian/opencodeCLI/discussions/32)

Until then, post examples under **Show and tell** using the form above.
