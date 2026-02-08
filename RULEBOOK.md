# Primordial Orbs — Rulebook (2-Player)

## 1. What is Primordial Orbs?

**Primordial Orbs** is a head-to-head planet-building game for two players.  
You are rival terraformers shaping newborn worlds—laying down land, water, ice, lava, and gas—then seeding life and guiding it from the primordial ooze to advanced civilizations.

But growth comes with risk. As life flourishes, your planet becomes more **vulnerable**… and your opponent gains stronger tools to destabilize you through disasters, cosmic events, and time-warping anomalies.

**Win by achieving Ascension:** have **4 different Colonization types** on your planet at the same time:
- Plant
- Animal
- Sentient
- High-Tech

---

## 2. Components

This browser MVP represents the physical game pieces digitally.

### Orbs (Marbles)
**Terraforming Orbs**
- Land, Water, Ice, Lava, Gas

**Colonizing Orbs**
- Plant, Animal, Sentient, High-Tech

**Planetary Impact Orbs**
- Meteor
- Tornado
- Earthquake
- Solar Flare
- Disease
- Temporal Vortex
- Black Hole (unique)

### Planet Board
Each player has a planet with:
- **6 slots** (MVP “Medium” planet)
- Slot 0 starts with your **Core Terraform** orb

---

## 3. Key Ideas

### 3.1 Planet Core
At setup, you choose a **Core** (one Terraform type). It defines:
- Your starting world
- Your **core passive ability**
- Your **core weakness**

### 3.2 Terraform Minimum
A planet must remain stable to support life.

In the MVP:
- You must keep at least **3 Terraform orbs** on your planet.
- If you fall below this, you gain an **Instability Strike** during Resolve.
- **Lava core** is volatile: it gains **2 strikes** instead of 1 when unstable.

### 3.3 Vulnerability
The more colonization you have, the more fragile your world becomes.

In the MVP:
- **Vulnerability = total number of Colonization orbs on your planet**
- Many impacts scale in severity using vulnerability.

---

## 4. Setup

1. Place the planet boards (one per player).
2. Each player chooses a **Core Terraform type** and places it in **slot 0**.
3. Shuffle all remaining orbs into the Anomaly (draw bag).

You are ready to begin.

---

## 5. Turn Structure

Players alternate turns. Each turn follows the same flow:

### Phase A — DRAW
- Draw **2** orbs.
- Your hand limit is **3**.
- If you exceed 3, discard down to 3 before you can proceed.

### Phase B — PLAY
You have:
- **2 Plays** total, and
- **1 Impact** maximum per turn.

A Play can be:
- Place a Terraform orb
- Place a Colonization orb
- Play an Impact orb

You may end Play early.

### Phase C — RESOLVE
- If your Terraform count is below the minimum (3), you gain **Instability Strike(s)**.

### Phase D — CHECK WIN
- If you have **all 4 colonization types**, you win immediately.
- Otherwise, the next player begins their turn.

---

## 6. Playing Orbs

### 6.1 Terraform Orbs
Terraform orbs fill empty slots on your planet.

**Land Core Passive (MVP):**  
Your **first Terraform placement each turn is free** (does not consume a Play).

**Gas Core Weakness (MVP):**  
A Gas-core planet **cannot place Ice Terraform**.

### 6.2 Colonization Orbs
Colonization represents life and civilization. Each type has prerequisites:

- **Plant:** requires Land + Water present
- **Animal:** requires Plant
- **Sentient:** requires Animal
- **High-Tech:** requires Sentient and at least 3 Terraform types present

Colonization increases your vulnerability, which makes many impacts hit harder.

---

## 7. Impact Orbs (Disasters)

When you play an Impact, it targets your opponent by default.

### 7.1 Severity
Impacts have a **severity** value:

**Severity = 1 + target vulnerability**

Some effects modify severity (core passives/weaknesses, mitigation).

### 7.2 Plant Mitigation (if you have Plant)
If you have a Plant colonization orb:
- The first time each turn you are hit by an Impact, Plant reduces severity by **1** (minimum 1).

### 7.3 High-Tech Redirect (if you have High-Tech)
If you have High-Tech colonization:
- Once per game, you may automatically redirect a **Meteor** or **Black Hole** back at the attacker.

(MVP: it triggers automatically the first time it applies.)

---

## 8. The Impacts

### Meteor
A direct strike that tears away Terraform.

- Removes Terraform equal to **severity**  
- **Land weakness:** removes **+1** additional Terraform

### Tornado
Localized chaos.

- Removes Terraform equal to **max(1, floor(severity/2))**  
- **Land weakness:** removes **+1** additional Terraform

### Earthquake
Planetwide disruption.

- Removes Terraform equal to **severity**  
- **Land weakness:** removes **+1** additional Terraform

### Disease
Degrades life step-by-step (repeated by severity):

- Sentient → Animal  
- Animal → Plant  
- Plant → removed

**Water weakness:** Disease severity is **+1**.

### Solar Flare
Disables advanced systems.

- The target’s **abilities are disabled through the next turn**.
- This shuts off: core passives, Plant mitigation, High-Tech redirect.

### Black Hole (unique)
The most dangerous impact.

- If the target has any Colonization, it removes **one Colonization** (prioritizing High-Tech first).
- If there is no Colonization to remove, it removes **1 Terraform** (Land weakness adds +1).

### Temporal Vortex
Time bends… and reality rewrites itself.

**MVP implementation (deterministic):**
- Rewinds the target planet by **one recorded step** (the most recent planet change).
- This can undo placements, swaps, or impact damage—whatever changed the planet last.

If there’s nothing to rewind, the Vortex fizzles.

---

## 9. Planet Cores — Passives & Weaknesses

Each core gives you a personality and a pressure point.

### LAND
- **Passive:** First Terraform each turn is free.
- **Weakness:** Terraform-destroying impacts remove **+1** Terraform.

### WATER
- **Passive:** Once per turn, swap two Terraform slots on your planet.
- **Weakness:** Disease severity **+1**.

### ICE
- **Passive:** First impact against you each turn is **-1 severity** (min 1).
- **Weakness:** On an Ice-core planet, placing Lava melts one Ice Terraform.

### LAVA
- **Passive:** Your impacts have **+1 severity**.
- **Weakness:** If unstable, you take **2 instability strikes** instead of 1.

### GAS
- **Passive:** Once per turn, discard+draw from hand (Gas Redraw).
- **Weakness:** Cannot place Ice Terraform.

---

## 10. Browser MVP Notes

This build is designed for fast playtesting:
- Impacts are deterministic (no physical arena randomness yet).
- Planet size is fixed at 6 slots (Medium).
- All effects are logged so you can validate balance.

If you want the physical version to feel more “tactile chaos,” the next step is to map impacts to a physics bowl / marble collision resolution.

