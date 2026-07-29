## Summary

Describe the user-facing or operational change.

## Verification

- [ ] I tested the changed behavior at the relevant viewport sizes.
- [ ] I ran `python3 scripts/verify_content_lock.py`.
- [ ] If product-surface files changed, I added or updated a unique JSON record in `governance/ship-gates/`.
- [ ] I ran `python3 scripts/verify_ship_filter.py` with the product changes and gate staged together.
- [ ] I confirmed that no unrelated user data, network, payment, medical-claim, or AI-processing behavior changed.
