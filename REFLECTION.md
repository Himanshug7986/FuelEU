### 3. REFLECTION.md

# Reflection: AI-Assisted Development of the FuelEU Maritime System

Developing the FuelEU Maritime compliance system offered a firsthand look at how AI agents are transforming software engineering, particularly when implementing complex, data-heavy regulatory requirements. This project utilized a combination of **ChatGPT** for architectural planning, **GitHub Copilot** for boilerplate, and **Cursor** for context-aware refactoring.

### What I Learned Using AI Agents
The most significant learning point was the practical application of **Hexagonal Architecture** (Ports and Adapters). While the theory of decoupling business logic from external dependencies is well-known, using AI to scaffold the project structure made the benefits of this isolation immediately apparent. I learned that keeping "Pure Logic" (such as compliance calculations and entities) in the `core/domain` folder ensures that the system remains testable and resilient to changes in infrastructure, such as switching databases. 

Furthermore, I learned that "domain-driven prompting" is a skill in itself. For instance, successfully implementing the **Greedy Pooling Algorithm** required more than just a generic prompt; it required guiding the agent through specific maritime constraints to ensure that surplus redistribution preserved total sum invariants and didn't leave ships in a worse position than they started.

### Efficiency Gains vs. Manual Coding
The efficiency gains were profound, particularly in the infrastructure and boilerplate phases:
* **Architectural Scaffolding:** AI agents established the complex hexagonal directory structure in seconds, a task that typically requires significant manual configuration.
* **Data Access Layer:** Writing SQL "UPSERT" operations for the PostgreSQL repository was significantly faster, with the agents handling the syntax for conflict resolution on ship IDs and years.
* **Rapid Logic Prototyping:** Core formulas, like the compliance balance (CB) and energy conversion (MJ), were drafted instantly. This allowed me to shift my focus from "how to write the function" to "validating that the formula meets FuelEU 2025 standards".
* **Testing Coverage:** Agents were highly effective at drafting unit tests in Vitest, quickly matching calculations against known KPI rows to ensure accuracy.

### Improvements for Next Time
While the AI agents were highly productive, several areas for improvement were identified for future iterations:
* **Managing Regulatory Hallucinations:** The agents frequently forgot or altered the specific energy conversion factor (**41,000 MJ/t**) required for maritime compliance. Next time, I would provide a "source of truth" document early in the chat session to keep the agent grounded in specific regulatory constants.
* **Proactive Invariant Validation:** Initially, some generated pooling logic missed critical edge cases, such as deficit ships exiting a pool in a worse state. I would improve my prompts to include "validation rules" as part of the initial logic request rather than adding them as corrections later.
* **Enhanced UI State Synchronization:** On the frontend, agents sometimes neglected the logic required to refresh data after a successful "Apply Banked" or "Set Baseline" operation. I plan to use more structured prompts that explicitly demand state-update patterns for all POST/PUT operations.

In summary, AI agents acted as a force multiplier, handling the technical heavy lifting while allowing me to act as the architect and regulatory validator for a complex maritime compliance solution.