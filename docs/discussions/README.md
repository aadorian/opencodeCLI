# Discussions

## Open Source Examples

Hub content lives in [`open-source-examples.md`](./open-source-examples.md). Publish or refresh it on GitHub:

```bash
npm run discussions:sync
```

### Optional: dedicated category

GitHub does not expose an API to create discussion categories. For a separate **Open Source Examples** section (instead of Show and tell):

1. Open **Settings → General → Features → Discussions → Edit categories**
2. Add category **Open Source Examples** with emoji 📚
3. Re-run `npm run discussions:sync` (creates the hub in the new category)
4. Pin the hub next to [Welcome](https://github.com/aadorian/opencodeCLI/discussions/32)

The form template [`.github/DISCUSSION_TEMPLATE/open-source-examples.yml`](../.github/DISCUSSION_TEMPLATE/open-source-examples.yml) activates once the category slug is `open-source-examples`.
