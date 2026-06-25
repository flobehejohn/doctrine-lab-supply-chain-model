# Env Matrix fixture

This fixture compares dev, staging and prod.

It intentionally models:

- prod using a `latest` image;
- prod having config drift against staging;
- prod missing a network policy;
- undocumented differences between staging and prod.

The output includes:

- a normalized matrix;
- a drift report;
- a jtable-compatible table payload;
- a Markdown table;
- a DREPS evidence-pack.
