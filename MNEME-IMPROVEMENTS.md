# Mneme — Improvement Recommendations & Development Guidelines

## 1. Objective

Improve Mneme's existing direction by strengthening its AI personalization, botanical diversity, tree generation, and overall user experience.

The goal is not to introduce more features unnecessarily. The goal is to make the existing experience more meaningful, technically convincing, and aligned with the Meta AI Developer Hackathon.

**Core principle:**

Meta AI should understand the meaning behind a person's letter and translate that understanding into a personalized botanical identity. The existing procedural 3D system should bring that identity to life.

Preserve the current product direction:

**Write → Understand → Plant → Grow → Reveal → Reflect**

---

## 2. Improve the Tree Personalization System

### Current limitation

Mneme currently has eight natural tree species:

1. Oak
2. Birch
3. Maple
4. Cherry Blossom
5. Weeping Willow
6. Pine
7. Jacaranda
8. Spruce

These species provide a good botanical foundation, but selecting a species alone is not enough to make every tree feel personalized.

Two people can write completely different letters and receive the same species without any meaningful visual distinction.

### Recommended improvement

Keep the existing eight species, but introduce a richer personalization system.

Instead of creating a new species for every interpretation, Meta AI should select a botanical foundation and determine its characteristics.

The species determines the tree's general botanical identity, while its characteristics determine its individual appearance.

### Personalization dimensions

| Dimension | Description | Possible values |
|---|---|---|
| Species | Determines the botanical foundation | Oak, Birch, Maple, etc. |
| Trunk shape | Determines the main trunk structure | Straight, curved, twisted, branching |
| Crown shape | Determines the overall canopy silhouette | Wide, narrow, open, dense |
| Branching style | Determines branch direction and distribution | Upward, spreading, cascading |
| Foliage density | Determines the amount of leaves or needles | Sparse, balanced, abundant |
| Tree proportions | Determines overall visual proportions | Short, tall, slender, broad |
| Natural details | Determines species-appropriate botanical details | Blossoms, leaf clusters, seasonal colors |

Only implement characteristics that the existing 3D generator can reliably render.

Do not introduce parameters that have no visible effect.

---

## 3. Give Each Species a Flexible Interpretation

The eight species should serve as botanical foundations rather than rigid emotional categories.

The following associations are optional symbolic starting points for Meta AI, not fixed psychological rules.

| Species | Possible symbolic associations |
|---|---|
| Oak | Strength, stability, perseverance, responsibility |
| Birch | Renewal, fresh starts, rediscovery, change |
| Maple | Transformation, adaptability, maturity, balance |
| Cherry Blossom | Hope, opportunities, relationships, new beginnings |
| Weeping Willow | Reflection, acceptance, remembrance, letting go |
| Pine | Endurance, patience, discipline, long-term commitment |
| Jacaranda | Creativity, imagination, exploration, self-expression |
| Spruce | Grounding, consistency, focus, dedication |

### Important considerations

- Do not force every letter into a predetermined emotional category.
- Let Meta AI interpret the actual content and context of the letter.
- Multiple species may be appropriate for similar themes.
- A difficult or negative letter must not produce a dead, damaged, or inferior-looking tree.
- Symbolic associations must not be presented as scientific interpretations of emotions or personality.

The AI should propose an understandable design direction, not diagnose the user.

---

## 4. Make Meta AI Personalization More Meaningful

### Current direction

Meta AI interprets a letter and proposes a botanical identity that the existing procedural generator can render.

This is the correct foundation, but the interpretation should produce more than a species recommendation.

### Recommended AI workflow

1. **Understand the letter**
   - Identify its primary intention.
   - Identify one to three relevant themes.
   - Understand the general context without making unsupported assumptions.

2. **Determine the botanical identity**
   - Select one of the eight supported species.
   - Determine appropriate structural characteristics.
   - Select supported visual variations.

3. **Explain the interpretation**
   - Explain why the species was recommended.
   - Explain how the proposed characteristics relate to the letter.
   - Keep the explanation concise and understandable.

4. **Allow user correction**
   - Show the proposed identity before planting.
   - Allow the user to accept or modify the suggestion.
   - Preserve the ordinary seeded-tree option for users who decline personalization.

5. **Generate the tree**
   - Send the accepted identity to the procedural generator.
   - Combine it with the persistent random seed.
   - Render the personalized tree.

### Example structured output

```json
{
  "intention": "Developing confidence and overcoming self-doubt",
  "themes": [
    "personal growth",
    "resilience",
    "self-discovery"
  ],
  "species": "japanese_maple",
  "characteristics": {
    "trunkShape": "curved",
    "crownShape": "open",
    "branchingStyle": "upward",
    "foliageDensity": 0.75,
    "heightVariation": 0.65
  },
  "explanation": "The proposed tree represents gradual growth and openness to new experiences."
}
```

This is an illustrative output structure. The actual fields must match the supported parameters in the existing generator.

### Technical requirements

- Validate all model responses.
- Restrict species to the supported list.
- Restrict numerical parameters to defined ranges.
- Reject unsupported properties.
- Never execute generated code from the model.
- Preserve the original letter if the request fails.
- Provide a retry and ordinary planting option.
- Do not create duplicate trees from repeated requests.

---

## 5. Make Tree Personalization Visually Noticeable

### Current limitation

If personalization only changes the tree's color or minor decorative details, the AI contribution will be difficult to demonstrate.

### Recommended improvement

Prioritize characteristics that visibly change the tree's anatomy.

For example:

**Oak A**
- Upright trunk.
- Open crown.
- Moderate foliage.
- Upward branching.

**Oak B**
- Curved trunk.
- Broad crown.
- Dense foliage.
- Spreading branches.

Both are Oak trees, but they should have noticeably different silhouettes.

### Visual requirements

- Maintain a connected and tapering trunk.
- Ensure branches visibly support finer branches and twigs.
- Attach leaves and foliage to supporting structures.
- Preserve species-specific characteristics.
- Avoid repeated spherical crowns and disconnected foliage.
- Ensure different parameter combinations produce recognizable differences.

The goal is to make personalization visible through the tree's actual structure rather than simply its color.

---

## 6. Improve the Relationship Between Randomness and AI

Meta AI and the procedural seed should have separate responsibilities.

| System | Responsibility |
|---|---|
| Meta AI | Determines the meaningful botanical identity and supported characteristics. |
| Random seed | Determines individual details and natural variation. |
| Growth system | Determines how the tree develops over time. |

### Expected behavior

Two people with similar letters may receive the same species and similar characteristics, but their trees should not be identical.

The random seed should provide individual variation without overriding the accepted AI identity.

### Deterministic generation

The same combination of:

- Random seed
- Accepted botanical identity
- Generator version

Should produce the same tree.

This is important for persistence, reproducibility, and demonstrating Meta AI's contribution.

---

## 7. Improve the Meta-Assisted Reflection Experience

Reflection is an important part of Mneme because it connects the user's original intention with their present perspective.

### Recommended improvements

When the letter becomes available:

1. Display the original letter exactly as written.
2. Offer an optional reflection field.
3. Ask Meta AI to generate one thoughtful question based on the original letter.
4. Allow the user to write a present-day reflection.
5. With separate consent, compare the original letter with the new reflection.
6. Present selected original and present quotes with a brief, tentative observation.

### Important requirements

- Never assume the user achieved their original goal.
- Never assign a personal growth score.
- Never invent quotations.
- Verify generated quotations against the original text.
- Keep reflection optional.
- Preserve the original letter unchanged.

The user should determine what their experience means.

---

## 8. Improve the Waiting and Growth Experience

The tree's development should make the passage of time tangible.

### Recommended improvements

Show relevant information in the tree-details panel:

- Planting date.
- Chosen reveal date.
- Current growth stage.
- Growth progress.
- Remaining time until the reveal.

The growth system should remain deterministic and independent of Meta AI.

Meta AI determines the tree's identity. The clock determines its development.

### Important distinction

Do not make growth depend on repeated AI calls.

The tree should continue developing using its saved identity and seed, even when the model is unavailable.

Preserve the existing accelerated demo clock, but clearly distinguish simulated time from actual future delivery.

---

## 9. Improve the Hackathon Demonstration

The judges should be able to understand exactly what Meta AI contributes.

### Recommended demonstration

1. Open Mneme's existing garden.
2. Write a fictional letter about a personal milestone.
3. Opt in to Meta AI personalization.
4. Show the actual AI-generated interpretation.
5. Display the proposed species and characteristics.
6. Explain why Meta selected them.
7. Allow the user to accept or correct the interpretation.
8. Plant the tree.
9. Demonstrate its continuous growth.
10. Show that different accepted identities produce different trees.
11. Reveal the original letter.
12. Demonstrate Meta-assisted reflection.

### Strong technical demonstration

Use the same random seed with two different accepted botanical identities.

Show that the resulting trees differ because of the AI-selected parameters, not because of random generation.

Then replay the same seed and identity to demonstrate reproducibility.

Clearly distinguish live model responses from cached examples and ordinary seeded-tree fallbacks.

---

## 10. Features That Should Remain Outside the Current Scope

Avoid expanding the project unnecessarily.

The following should not be prioritized for the hackathon:

- General-purpose AI chatbot.
- AI-generated 3D models.
- Social media or public gardens.
- Leaderboards and achievements.
- Tree trading or marketplace.
- Voice messages.
- Excessive tree species.
- Complex account management.
- Daily engagement streaks.
- Unnecessary AI-generated decorations.

The priority is to make the existing garden and its Meta-powered personalization work together.

---

## 11. Recommended Development Priorities

| Priority | Improvement | Importance |
|---|---|---|
| P0 | Implement actual Meta botanical interpretation | Critical |
| P0 | Connect AI output to real tree-generation parameters | Critical |
| P0 | Add output validation and user correction | Critical |
| P0 | Preserve existing garden functionality | Critical |
| P1 | Improve visible differences between personalized trees | High |
| P1 | Demonstrate deterministic generation | High |
| P1 | Implement Meta-assisted reflection | High |
| P1 | Improve tree details and growth information | High |
| P2 | Add more species | Optional |
| P2 | Add voice input | Future development |
| P2 | Add cloud synchronization and secure scheduled reveal | Longer-term product development |

---

## 12. Final Product Direction

Mneme should not attempt to create a different tree species for every human emotion or personal experience.

Instead, it should use its eight existing species as flexible botanical foundations.

Meta AI understands the user's letter and proposes a unique combination of species and structural characteristics. The author reviews and accepts that interpretation. The procedural generator then creates the actual tree using the accepted identity and a persistent random seed.

As time passes, the tree grows independently of AI. When the letter is revealed, Meta AI can help the author reconnect with their original intentions through optional reflection.

### Core product principle

**Every letter has its own meaning. Every tree has its own identity. Every garden preserves a person's intentions over time.**

The objective is not to maximize the number of trees or AI features. It is to make the relationship between personal meaning, Meta AI interpretation, and procedural 3D generation genuinely noticeable.

**Preserve the existing garden. Strengthen the personalization. Prove the AI contribution. Complete the experience.**