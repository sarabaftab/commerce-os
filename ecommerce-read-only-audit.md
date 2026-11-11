# E-Commerce Performance & Concurrency Audit — Read-Only

## Objective

Conduct a comprehensive **read-only audit** of my Next.js, Prisma, and Supabase e-commerce application to identify performance bottlenecks, concurrency issues, database limitations, and opportunities for optimization.

**Do not implement, modify, refactor, or fix anything.** Your responsibility is strictly to inspect, analyze, and produce detailed Markdown reports with findings and recommendations.

## 1. Review Existing Documentation

Start by reading:

- `docs/capacity-testing.md`
- `docs/performance-runbook.md`
- All latest reports in `reports/performance/`

Compare the documented findings against the actual application code.

Identify:
- Confirmed problems
- Potential bottlenecks
- Unproven assumptions
- Missing measurements
- Performance and scalability risks

Clearly distinguish between **confirmed findings, likely issues, and hypotheses requiring testing**.

## 2. Checkout Concurrency Audit

Thoroughly investigate:

- `allocateOrderNumber`
- `placeGuestOrder`
- Order creation and numbering
- Database transactions
- Inventory updates and stock consistency
- Concurrent checkout behavior
- Idempotency and duplicate order prevention
- Tenant isolation
- Payment correctness

Pay special attention to the confirmed race condition involving:

`Unique constraint failed (tenant_id, order_number)`

Explain:
1. Why this happens.
2. Which functions and database operations cause it.
3. What risks could emerge when 10, 20, 50, or 100 customers checkout simultaneously (do not assert untested outcomes).
4. How it should be fixed.
5. Alternative solutions and their tradeoffs.
6. Which solution is recommended and why.

**Do not implement the fix.**

## 3. Checkout Performance Audit

Analyze `placeGuestOrder` and all related functions.

Investigate:

- Excessively long database transactions
- Unnecessary queries
- Repeated database requests
- Sequential operations that could safely run independently
- Network round trips
- Database connection hold times
- External services and notifications
- Inefficient validation or inventory operations

Review whether the checkout workflow can be made faster without compromising data integrity.

Identify where instrumentation should be added to measure:

- Total checkout wall time
- Database query time
- Transaction hold time
- External operation time
- Network latency

Explain the expected benefits of each recommendation without inventing performance improvements.

## 4. Supabase and Prisma Audit

Review:

- Current connection pooling configuration
- Session pooling versus transaction pooling
- Prisma compatibility with Supabase poolers
- Connection limits
- Connection lifecycle in Vercel serverless functions
- Transaction behavior
- Database query efficiency
- Missing or inefficient indexes
- PostgreSQL locking and contention
- Potential connection exhaustion
- CPU and RAM limitations

Evaluate which problems could be solved through code optimization versus increased Supabase compute resources.

Compare the potential benefits of:

- 1 GB RAM
- 2 GB RAM
- 4 GB RAM
- 8 GB RAM

Focus particularly on workloads involving **50–100 active users**, distinguishing browsing traffic from simultaneous checkouts.

Do not assume RAM directly determines user capacity.

## 5. Product Browsing Performance Audit

Inspect the product browsing implementation, including:

- Product listing queries
- Product detail queries
- Homepage catalog queries
- Categories
- Images
- Pagination
- Search and filtering
- Caching strategies
- Database indexes
- N+1 queries
- Unnecessary server-side requests

Identify opportunities to reduce database load and improve response times.

Assess cache invalidation, data freshness, and tenant isolation risks.

## 6. Infrastructure and Geographic Latency

Evaluate the architecture assuming:

- Next.js backend hosted on Vercel in Singapore
- Production Supabase hosted in Singapore (verify; do not treat as established fact)
- Customers primarily located in Cambodia
- Existing staging measurements taken from the US against Tokyo

Explain how geographic placement may affect performance.

Do not directly convert US-to-Tokyo measurements into claimed Singapore production performance.

Identify what must be measured to establish realistic performance expectations.

## 7. Capacity and Scalability Assessment

Assess the application's readiness for:

| Scenario | Workload |
|---|---|
| A | 10 concurrent users |
| B | 20 concurrent users |
| C | 50 concurrent users |
| D | 100 concurrent users |
| E | 50 simultaneous checkouts |
| F | 100 simultaneous checkouts |

For each scenario, report:

- Known evidence
- Potential bottlenecks
- Possible failure modes
- Existing limitations
- Missing measurements
- Recommended optimizations
- Whether the current capacity is proven or unknown

Do not invent maximum user counts, throughput, or response times.

## 8. Required Markdown Reports

Create the following reports under `reports/audit/`:

### `01-executive-summary.md`
- Overall application health
- Biggest performance problems
- Biggest concurrency risks
- Production readiness assessment
- Top recommendations

### `02-checkout-concurrency.md`
- Order-number race condition
- Transaction safety
- Idempotency
- Inventory correctness
- Recommended solutions

### `03-checkout-performance.md`
- Checkout workflow analysis
- Expensive operations
- Transaction duration risks
- Instrumentation recommendations
- Optimization opportunities

### `04-database-and-supabase.md`
- Prisma connection pooling
- Supabase configuration
- Query efficiency
- Index analysis
- RAM and compute recommendations
- Upgrade versus optimization assessment

### `05-browsing-performance.md`
- Product queries
- Caching
- Pagination
- Images
- Query optimization recommendations

### `06-capacity-and-scalability.md`
- 10/20/50/100-user scenarios
- Simultaneous checkout analysis
- Existing testing evidence
- Missing benchmarks
- Scalability risks

### `07-prioritized-recommendations.md`
- All identified improvements
- Priority: Critical / High / Medium / Low
- Estimated implementation difficulty
- Estimated implementation time
- Expected benefit (qualitative unless measurable)
- Risks and tradeoffs
- Recommended implementation order

### `08-questions-for-owner.md`
- Missing configuration information
- Infrastructure questions
- Credentials or access needed for future testing
- Decisions requiring owner approval
- Questions that would help produce a more accurate capacity assessment

Never request that secrets be pasted into the report.

## 9. Evidence Requirements

Every significant finding must include:

- Relevant file path
- Function or component name
- Line numbers where possible
- Explanation of the issue
- Evidence supporting the conclusion
- Potential impact
- Recommended solution
- Confidence level: Confirmed / Likely / Hypothesis

Do not describe something as a confirmed bottleneck unless code evidence or measurements support it.

## 10. Strict Read-Only Rules

**You are NOT authorized to:**

- Modify application source code.
- Implement bug fixes.
- Refactor functions.
- Change database schemas.
- Add migrations or indexes.
- Change environment variables.
- Modify Supabase or Vercel configuration.
- Run load tests.
- Execute checkout operations.
- Create or delete database records.
- Access or change production data.
- Deploy application changes.
- Install packages or dependencies.

You may inspect existing files, documentation, configuration, and previously generated performance reports. Do not expose secrets or credential contents in reports.

**The only files you may create or modify are the eight Markdown audit reports inside `reports/audit/`.**

If additional execution, configuration access, or testing would improve the audit, document the requirement and ask for permission rather than performing it.

## Final Deliverable

Once the audit is complete:

1. Provide a concise summary of the biggest problems discovered.
2. Identify the top five recommended improvements.
3. Explain whether upgrading Supabase is necessary based on available evidence.
4. Explain what prevents the system from reliably supporting 50–100 active users.
5. List uncertainties that require further measurement.
6. Identify the recommended order of future improvements.
7. Ask any necessary follow-up questions.

**Again: This is an investigation and reporting task only. Do not change the application or infrastructure.**
