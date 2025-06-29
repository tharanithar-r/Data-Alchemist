# Data Alchemist

🚀 **Data Alchemist: Forge Your Own AI Resource**‑**Allocation Configurator**

Once upon a time at Digitalyz, our team was lost in a tangle of spreadsheets—client lists here, worker details there, and task plans everywhere. We needed a hero to bring order out of chaos. That’s where you come in: you are the **Data Alchemist**.

Your mission, should you choose to accept it, is to build a AI enabled Next.js web-app that:

● Lets users upload CSV or XLSX files for **clients**, **workers**, and **tasks** data

● Shows the data in an easily editable grid, so users can fix errors as they go

● Runs validations on data and flags errors

● Provides an easy way to create business rules on this data

● Offers controls to set priorities for how the system should balance different needs

● Gives an option to export cleaned up data and a rules.json files, ready for the next stage(One

Showcase your product thinking and development skills to create this tool that solves the dreaded spreadsheet chaos

**Use-Case Summary:**

Think of an online helper that tidies up messy spreadsheets for people who’re not very hands-on with tech. You upload your raw CSV or Excel files, and the system’s AI quickly checks for mistakes and shows easy-to-read warnings. You can search for rooms with natural language. You can fix problems right inside the table with one click. If you need rules, you just type them in plain sentences, and the AI turns them into proper settings. A simple validator panel tells you what’s wrong and how to fix it. Sliders let you choose what matters most, such as keeping costs low or finishing work fast, and you instantly see how those choices change the plan. When every light is green, you press Export and get a clean CSV file plus a rules file that downstream allocation tools can use. In short: drop in messy data, have AI features to interact with the data, let the AI clean and check it, set your

rules in plain English, and download a neat package ready for the next steps(next steps that are not a part of this assignment).

**1. Data Ingestion**

Candidates must allow CSV or XLSX having data for 3 different entities. After parsing, display each file in a data grid with support for inline editing & validation. (*Data entities are detailed and explained in the **Sample Data** section at the end*)

**(AI Possibilities)**

1. **Data Parsing:** An ai enabled parser which can map even wrongly named headers or rearranged columns to the right data points as per the data structure decided.

**2. Validation + In-App Data Changes**

Validations must run on file upload or inline edits, with immediate feedback.

The exact entities or cells in which errors are found by the validator shall be highlighted in the UI. There should also be a validation summary displayed each time the complete validation is run. This again is a fairly unbounded problem, where you’re to creatively decide the best way to solve it

**Core (Do atleast 8, BONUS for doing all)**

a. Missing required column(s).

b. Duplicate IDs (ClientID/WorkerID/TaskID).

c. Malformed lists (non-numeric in AvailableSlots etc).

d. Out-of-range values (PriorityLevel not 1–5; Duration < 1).

e. Broken JSON in AttributesJSON.

f. Unknown references (RequestedTaskIDs not in tasks; regex rules referencing missing TaskIDs).

g. Circular co-run groups (A→B→C→A).

h. Conflicting rules vs. phase-window constraints.

i. Overloaded workers (AvailableSlots.length <

MaxLoadPerPhase).

j. Phase-slot saturation: sum of task durations per Phase ≤ total worker slots.

k. Skill-coverage matrix: every RequiredSkill maps to ≥1 worker.

l. Max-concurrency feasibility: MaxConcurrent ≤ count of qualified, available workers.

**(AI Possibilities)**

**a. Validations on upload + on realtime changes:** Apart from the core validations that will run on the input data, have an ai engine define and run even broader validations on data upload + when data is changed in the ui.

**b. Natural Language Data Retrieval:** Thinking beyond the good old spreadsheet filters, users can search for data using plain english, and get filtered results. For example, searching for “All tasks having a Duration of more than 1 phase and having phase 2 in their Preferred Phases list” should show the rows/entities satisfying the search criteria.

**c. Natural Language Data Modification:** On the same lines as the above point, but trickier as accuracy becomes key when you’re letting AI make/suggest changes.

**d. Data Corrections:** When gaps are found in the data, give suggestions on what the exact fixes can be and maybe even the ability to completely or partially apply these suggestions to the data with a click of a button.

**3. Rule**‑**Input UI**

No rule-related columns will exist in the data files. Instead, you must build functionality in the ui business rules. Some examples are as follows:

a. **Co-run:** select two or more **TaskIDs** → { type: "coRun", tasks: [...] } b. **Slot-restriction:** choose a **ClientGroup** or **WorkerGroup** + minCommonSlots

c. **Load-limit:** select a **WorkerGroup** + maxSlotsPerPhase

d. **Phase-window:** pick a **TaskID** + allowed phase list/range

e. **Pattern-match:** enter a **regex** + choose a rule template + parameters

f. **Precedence override:** define global vs. specific rules with explicit priority order

When everything looks right, hit the “Generate Rules Config” button and the system bundles all current rules into a clean rule.json file ready for download. The user sees used the intuitive UI; the JSON is created quietly and accurately in the background.

**(AI Possibilities)**

**a. Natural language to rules converter:** Instead of being bound by the few rules supported by the UI, the user can write the ask for a new rule in plain english, and the webapp shall get context from data to understand this rule, validate if it can be applied or not, and then add it to the same rule building functionality that will be built in the ui.

**b. Rule recommendations:** AI looks for patterns in the data and pops up rule suggestions—“Tasks T12 and T14 always run together. Add a Co-run rule?” or “Sales workers are overloaded this phase. Set a Load-limit?” Accept, tweak, or ignore each hint, or ask for more rule hints for specific entities.

**4.Prioritization & Weights**

Provide an interface for users to assign relative importance to various criteria that an imaginary resource allocator downstream(not a part of this assignment) will use. Possible approaches include:

a. **Sliders or numeric inputs:** assign weights to fields like fairness PriorityLevel, RequestedTaskIDs

fulfillment, constraints, etc.

b. **Drag**‑**and**‑**drop ranking:** allow users to reorder criteria by importance.

c. **Pairwise comparison matrix:** compare two criteria at a time to build a weight matrix (Analytic Hierarchy Process).

d. **Preset profiles:** offer templates (e.g. "Maximize Fulfillment", "Fair Distribution", "Minimize Workload").

Once all priorities are in place, have an Export **button:** Download separate sheets for clients, workers, and tasks (all cleaned up and validated), plus a rules.json file capturing all user-defined rules and prioritization settings efficiently.

**Sample Data**

Please refer to these two files for the sample data:

●

●

**Data Entity Explanation:**

**clients.csv**

ClientID, ClientName, PriorityLevel, RequestedTaskIDs, GroupTag, AttributesJSON

a. **PriorityLevel:** integer (1–5)

b. **RequestedTaskIDs:** comma-separated TaskIDs c. **AttributesJSON:** arbitrary JSON metadata

**workers.csv**

WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel

● **Skills:** comma-separated tags

● **AvailableSlots:** array of phase numbers (e.g. [1,3,5]) ● **MaxLoadPerPhase:** integer

**tasks.csv**

TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

● **Duration:** number of phases (≥1)

● **RequiredSkills:** comma-separated tags

● **PreferredPhases:** list or range syntax (e.g. "1-3" or [2,4,5]) ● **MaxConcurrent:** integer (max parallel assignments)

**Entity Explanation**

● Clients represent the people or groups requesting work. They provide RequestedTaskIDs and a PriorityLevel to indicate importance. Your ingestion must check that every requested task exists and that higher-priority clients can be identified.

● Tasks define units of work. Each task has a Duration, required skills, preferred phases, and concurrency limits. You must

ensure durations are valid, skill tags match worker capabilities, and preferred phases are parsed and normalized.

● Workers supply the capacity to perform tasks. Workers list their Skills, AvailableSlots (phases they can work), and MaxLoadPerPhase. You must verify skills cover tasks, slots are valid numbers, and load limits are enforceable.

**Data Relationships & Correlations**

To help you understand why each validation is important, here’s how the core datasets connect:

**● Clients → Tasks:** Each RequestedTaskIDs entry for a client must match valid TaskIDs in tasks.csv. This ensures clients only request existing tasks.

**● Tasks → Workers:** Every skill listed in a task’s RequiredSkills must appear in at least one worker’s Skills. Without this, no one can perform the task.

**● Workers → Phases:**AvailableSlots define which phases a worker can serve. Phase-window and slot-restriction rules rely on these mappings.

**● Group Tags:**GroupTag in clients and WorkerGroup in workers link to slot-restriction and load-limit rules for grouped operations.

**● PriorityLevel Impact:** A client’s PriorityLevel (1–5) signals which requests should be satisfied first during allocation. Some validations compare priority levels across clients.

**● PreferredPhases:** Tasks may specify ranges (e.g. "2-4") or lists ([1,3,5]); these values guide phase-window constraints and must be normalized to explicit phase arrays.

Understanding these connections will guide your implementation of cross-reference validations and help you anticipate complex checks like circular co-runs or phase-slot saturation.

**NOTE:** You don’t rely completely on the sample data shared by us, be innovative and come up with your own sample data and edge cases.

**Milestones**

**1. Milestone 1:** Data Ingestion, Validators and In-App Changes

○ Natural Language Data Retrieval

**2. Milestone 2:** Rule‑Input UI, Prioritization & Weights

○ Natural language to Rules Converter

**3. Milestone 3:** Stretch Goals - Do Any or All, or None of these and Think Beyond

○ Natural Language Data Modification

○ AI Rule Recommendations

○ AI based Error Correction

○ AI based Validator

**Guiding Notes**

● Think AI first. The “AI Possibilities” mentioned in this doc are just some examples from a long list of ideas that can enhance the functionality of the proposed web-app by 10x. Tinker, and show us your best shot.

● The intent here is to understand your product thinking and gauge your ability to solve a fairly unbounded problem with AI enablement.

● Build this for a user persona that is not very technical

**Submission Logistics**

● **Timeline:** You’ve roughly 3 days to take a shot at this

● **Repository:** Submit a Public GitHub repo containing a Next.js project written in TypeScript

● **Sample Inputs:** Include example clients.csv, workers.csv, and tasks.csv files in a /samples folder. If you came up with your own versions of sample data, this is where you add them for us to test.

● **Deployed link**: A deployed link to your webapp

**● X-factor Demo video:** This is completely **optional**. If you feel you put a feature that needs a special call-out, this is your cue, make a demo video of upto 120s showing us your x-factor feature(s). No intros, no context, just a packed x-factor demo!