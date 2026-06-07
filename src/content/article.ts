import type { Article, TocItem } from "./types";

export const article: Article = {
  title: "World Model Deep-Dive",
  subtitle:
    "A semi-technical analysis of what world models are, who's building them, what's holding them back, and hands-on experiments across the landscape.",
  epigraph: {
    quote:
      "The image of the world around us, which we carry in our head, is just a model. Nobody in his head imagines the world, government or country. He has only selected concepts, and relationships between them, and uses those to represent the real system.",
    attribution: "Jay Wright Forrester",
  },
  readingTimeMinutes: 42,
  sectionCount: 4,
  intro: [
    {
      type: "paragraph",
      text: "Google launched The Waymo World Model to enable autonomous driving simulation. World Labs recently raised an additional $1B from a who's-who of tech and finance — NVIDIA, AMD, Autodesk, Fidelity, and others. General Intuition raised $134M seed to use world models to help Ukrainian soldiers simulate and navigate life-threatening battlefield scenarios.",
    },
    {
      type: "paragraph",
      text: "Each represents a bet that machines can learn to model and simulate the physical world. So what's behind all the world model hype?",
    },
    {
      type: "paragraph",
      text: "This analysis is written for a semi-technical audience looking to understand the general intuition and different types of world models. It tackles four key questions / topics:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "What is a world model? A clear definition, taxonomy of different types of world models being developed today, and the research lineage behind each.",
        "Who's building them and what are they used for? Comparison of current leading approaches — mapping use cases and applications across key companies in the space.",
        "What's holding them back? Core technical bottlenecks across different approaches.",
        "Let's play. Hands-on experiments across different types of world models and what we found.",
      ],
    },
  ],
  sections: [
    {
      id: "section-1",
      title: "What is a world model?",
      number: 1,
      lead: "Over the past two years, the term \"world model\" has been stretched almost beyond recognition — applied by researchers, companies, and VCs to everything from large language models to game engines to simple predictive simulators, regardless of what was actually under the hood.",
      blocks: [
        {
          type: "paragraph",
          text: "Getting the definition right matters, because the type of world model determines what it can and can't do. In this section we share a brief history, a clear definition, and the research lineage behind each major type.",
        },
      ],
      subsections: [
        {
          id: "brief-history",
          title: "A Brief History",
          blocks: [
            {
              type: "paragraph",
              text: "The idea of a world model predates modern AI entirely. In 1943, psychologist Kenneth Craik proposed that the human mind works by constructing small-scale models of reality to anticipate events — essentially, that thinking is a form of simulation. Elon Musk has since claimed there's a billion to one chance we're not already living in one.",
            },
            {
              type: "paragraph",
              text: "But the engineering question is more grounded: can machines learn to simulate their world well enough to act intelligently within it? The concept re-emerged in reinforcement learning research through the 1990s and 2000s, where model-based RL agents learned internal representations of their environments to plan ahead without requiring exhaustive real-world interaction. The term \"world model\" was eventually coined by David Ha and Jürgen Schmidhuber in their 2018 research.",
            },
            {
              type: "paragraph",
              text: "We've included an overview of historical waves in world models in the exhibit below. Note that the historical narrative is debated — this reflects the broad arc rather than a definitive account. For a more complete history, see Packy McCormick and Pim de Witte's article.",
            },
            {
              type: "exhibit",
              src: "/exhibits/page2_img0.png",
              alt: "Timeline diagram of world model history organized in waves from early cybernetics through modern generative models",
              caption: "Exhibit: World Model History in Waves",
            },
          ],
        },
        {
          id: "definition",
          title: "Definition",
          blocks: [
            {
              type: "paragraph",
              text: "We define the term \"world model\" as an action-conditioned forward dynamics model. Given a state and action, the model can predict the next resulting state. Video generation models like Sora that only generate observations of the world but don't model the consequence of acting within it, is not the type of world model this paper focuses on.",
            },
            {
              type: "exhibit",
              src: "/exhibits/page3_img0.png",
              alt: "Diagram defining a world model as an action-conditioned forward dynamics model",
              caption: "Exhibit: Definition of World Model",
            },
          ],
        },
        {
          id: "taxonomy",
          title: "World Model Taxonomy",
          blocks: [
            {
              type: "paragraph",
              text: "\"World models\" can be an overloaded term, making categorization challenging — though many have attempted it.",
            },
            {
              type: "paragraph",
              text: "We view a useful taxonomy emerges along two axes:",
            },
            {
              type: "list",
              ordered: true,
              items: [
                "How does the model handle space? (2D vs. 3D)",
                "What is the model's use case? (Entertainment vs. Robotics vs. AV)",
              ],
            },
            {
              type: "exhibit",
              src: "/exhibits/page3_img1.png",
              alt: "Taxonomy matrix of world models by spatial dimensionality and use case",
              caption:
                "Exhibit: World Model Taxonomy along Two Axis — Mapped by use case (columns) and spatial dimensionality of the model (rows)",
            },
            {
              type: "paragraph",
              text: "Note: While companies such as Sunday Robotics, Physical Intelligence, and Generalist have not published formal world model research, public forums, including posts on X, contain references to active research threads in this area.",
            },
            {
              type: "paragraph",
              text: "The remainder of this section focuses on how models handle modeled space. Section 2 covers applications and company use cases.",
            },
          ],
        },
        {
          id: "2d-world-models",
          title: "2D World Models",
          blocks: [
            {
              type: "paragraph",
              text: "2D generative world models (e.g., Google's Genie, Tesla's World Simulator, NVIDIA Cosmos), are the most intuitive entry point. The core idea is straightforward: given what the world looked like up to this moment, and given the action just taken, predict what it looks like next — frame by frame, pixel by pixel. It's world modeling as video prediction.",
            },
            {
              type: "subheading",
              text: "Video generation vs. 2D world models — an important distinction",
            },
            {
              type: "paragraph",
              text: "Before going further, it's worth drawing a line that the industry has frequently blurred. A video generation model produces a fixed artifact — a clip that plays from start to finish regardless of what a viewer does. Pika, Runway's Gen-4, and Luma. These are impressive generative systems, but they are not world models under our definition. They generate observations of the world without modeling the consequences of acting within it.",
            },
            {
              type: "paragraph",
              text: "A 2D generative world model produces an environment — one that responds to actions, maintains state over time, and evolves differently depending on what an agent does inside it. The output isn't a clip to watch; it's a space to act in. The defining characteristic is interactivity. Remove it, and you have a video generator. Keep it, and you have a world model.",
            },
            {
              type: "paragraph",
              text: "This lineage traces directly back to Ha & Schmidhuber's 2018 World Models paper, which first demonstrated an agent could learn inside its own imagination. The paper proposed that an agent could be split into three parts:",
            },
            {
              type: "list",
              items: [
                "A visual encoder (V) that compresses raw pixel observations into a compact representation, like how your eye doesn't send every photon to your brain, but a compressed summary.",
                "A memory model (M), a recurrent neural network that predicts what comes next, essentially the world model itself.",
                "A controller (C), a small, simple decision-maker that acts based on V and M's outputs.",
              ],
            },
            {
              type: "exhibit",
              src: "/exhibits/page4_img0.png",
              alt: "Architecture diagram of Ha and Schmidhuber world model with visual encoder, memory model, and controller",
              caption: "Exhibit: World Model Architecture",
            },
            {
              type: "paragraph",
              text: "What changed in the years that followed was the quality of the underlying generative machinery. Two distinct model architectural approaches emerged to solve the same core problem (i.e., predicting the next frame conditioned on an action) and they make meaningfully different tradeoffs.",
            },
            {
              type: "list",
              ordered: true,
              items: [
                "Autoregression generation: autoregressive model along spatial dimension – model generates each frame by predicting spatial tokens in order (patch 1, then patch 2, then patch 3... within that frame). Google's Genie takes this approach — using a transformer that conditions on past frames and actions to generate what comes next. These models tend to be faster at inference and better at maintaining temporal consistency across frames.",
                "Diffusion generation: generate the next frame by starting with a blurry, noisy image and progressively refining it, step by step — until a sharp, coherent frame emerges. Think of it like a photograph developing in a darkroom: you start with nothing recognizable and gradually sharpen toward the final image. The model learns to guide this refinement process so the output matches what the world should look like given the current context and action. Google's GameNGen and DIAMOND take this approach, and Decart's Oasis combines both in a diffusion transformer. Diffusion models tend to produce higher visual fidelity and handle uncertainty more gracefully — but were long considered too slow for real-time interactive use. GameNGen and DIAMOND were the first to demonstrate this wasn't an inherent limitation, just an engineering one.",
              ],
            },
            {
              type: "paragraph",
              text: "The field hasn't settled on a single approach. The most recent models, like Oasis, are beginning to combine both, suggesting the distinction may matter less going forward than it does today.",
            },
            {
              type: "paragraph",
              text: "2D generative world models are not just the most intuitive — they are currently the most capable and widely deployed, for a few compounding reasons. The most important is data. Training a 2D world model requires video paired with actions — comparatively easier to collect than approaches requiring specialized data (e.g., 3D). Billions of hours of humans driving, playing games (e.g., General Intuition spinned off from Medal, a platform for uploading and sharing video game clips) already exist and can be repurposed directly. Legibility is another advantage. Because the outputs are visual, 2D world models are easy to evaluate, demo, and iterate on — accelerating research and commercial development in ways more abstract approaches can't match.",
            },
            {
              type: "paragraph",
              text: "That said, they carry a structural ceiling. With no explicit representation of geometry or physics, predicting appearances rather than structure, errors accumulate across frames, temporal consistency degrades over time, and compute costs are high. We will return to these technical bottlenecks in detail in Section 3.",
            },
            {
              type: "footnote",
              id: "fn-1",
              text: "Temporal consistency refers to a model's ability to maintain coherent, stable elements across consecutive frames over time (e.g., a wall stays where it was, an object doesn't change shape mid-scene, physics doesn't quietly break down). We go over this concept as a core technical bottleneck in Section 3.",
            },
          ],
        },
        {
          id: "latent-space",
          title: "Latent Space World Models",
          blocks: [
            {
              type: "paragraph",
              text: "Latent world models is a technique that compresses observations into compact abstract representations and predicts how those representations evolve over time given different actions. All world models in practice have internal latent representations – the difference is not one of kind, but of supervision: whether you compute losses on semantic outputs only (\"latent\"/JEPA) or compute reconstruction losses on raw observations (e.g., pixel).",
            },
            {
              type: "paragraph",
              text: "This is not a binary design choice — for example, a model can predict semantic outputs at every step while computing reconstruction losses only every 10 steps. The primary advantage of latent models is efficiency: by skipping pixel reconstruction, they are significantly faster to train and run.",
            },
            {
              type: "paragraph",
              text: "Several schools of thought have emerged around latent space models, spanning reinforcement learning, latent planning with learned dynamics, and energy-based approaches — each laid out with key applications and notable papers in the table below. These categories are not clean separations; the lineages are deeply intertwined, and the divisions reflect ideology as much as methodology. Ultimately, they often come down to which problems a researcher prioritizes: agents, robotics, and control versus more general world modeling.",
            },
            {
              type: "caption",
              text: "Exhibit: Latent Space Models — Three Schools of Thoughts & Related Papers",
            },
            {
              type: "table",
              headers: ["Overview", "Application", "Papers"],
              rows: [
                [
                  "Reinforcement learning — Agents learn by practicing entirely inside an imagined world model rather than the real environment. The architecture: RSSM (Recurrent State Space Model) maintains a compressed hidden state that updates step by step as the agent acts. Built for action-first: the world model exists to develop better instincts, not to understand the world for its own sake.",
                  "Continuous control tasks (e.g., robotics)",
                  "Dyna (1990), SimPLe (2019), PlaNet (2019), Dreamer V1-V4 (2020-2025)",
                ],
                [
                  "Latent planning with invented dynamics lineage — Rather than developing instincts through imagination, the agent deliberates at every single move — consulting its world model to simulate possible futures and pick the best one. The architecture invents an abstract latent space optimized purely for planning, not for resembling reality. Built for discrete, structured problems where exhaustive look-ahead pays off (e.g., Board games).",
                  "Any domain with a structured, well-defined action space where exhaustive look-ahead and precise planning outperform learned instincts",
                  "MuZero (2020), EfficientZero (2021), EfficientZero V2 (2024)",
                ],
                [
                  "Energy based lineage — Rather than generating pixel outputs, the model scores compatibility between predictions and reality in latent space — learning meaning rather than appearance. Architecture: three components (context encoder, predictor, target encoder) with no pixel decoder. Built for understanding-first: action-conditioning was added later as an extension.",
                  "Visual understanding, video prediction, representation learning for downstream tasks (e.g., robotics)",
                  "JEPA (2022), I-JEPA (2023), V-JEPA (2024), LeWorldModel (2026)",
                ],
              ],
            },
          ],
        },
        {
          id: "3d-world-models",
          title: "3D World Models",
          blocks: [
            {
              type: "paragraph",
              text: "3D-based generative world models treat the world as a navigable space — one with depth, volume, and geometry. Their core objective: reconstruct 3D structure from 2D images captured across different angles. The result is consistent navigable 3D environments: objects stay where you left them, rooms look the same when revisited, and spatial relationships hold across long horizons.",
            },
            {
              type: "paragraph",
              text: "Two most prominent methods used include NeRF (Neural Radiance Fields) and Gaussian Splatting. NeRFs (Mildenhall et al., 2020) encodes a 3D scene inside a neural network – given any position in space and any viewing direction, the network predicts what color and density exists there, allowing photorealistic images to be rendered from any angle, including angles never seen during training.",
            },
            {
              type: "paragraph",
              text: "Gaussian Splatting (Kerbl et al., 2023) achieves the same goal differently. A Gaussian is simply a smooth blob — mathematically it's a bell curve, but in 3D space it's an ellipsoid. Think of it like a cloud of smoke: densest at the center, fading out smoothly toward the edges. Rather than encoding the scene inside a network, it represents it explicitly as a collection of millions of 3D blobs, each with a position, size, color, and opacity. Rendering is just projecting and blending those blobs onto the image plane — no network queries needed, which is why it runs in real time while NeRF takes minutes.",
            },
            {
              type: "paragraph",
              text: "The limitation of 3D world models is structural, which we will cover more in section 3.",
            },
            {
              type: "paragraph",
              text: "Note: the taxonomy above is our attempt at categorization and intended for readers new to world models. In practice, categorizing world models is not straightforward — most real systems combine architectural approaches, and the boundaries between them are fluid. If you are curious about different attributes and how others have categorized world models, there are many survey papers out there worth taking a look (E.g., A Step Toward World Models: a Survey on Robotic Manipulation).",
            },
          ],
        },
      ],
    },
    {
      id: "section-2",
      title: "Who's building world models and what are they being built for?",
      number: 2,
      lead: "Section 1 established what world models are and how they work. This section maps where they're being deployed — the earliest commercial applications taking shape and the technical approaches different players are betting on.",
      blocks: [
        {
          type: "exhibit",
          src: "/exhibits/page14_img0.png",
          alt: "Competitive landscape map of world model companies and applications",
          caption: "Competitive Landscape",
        },
      ],
      subsections: [
        {
          id: "filming",
          title: "Filming",
          blocks: [
            {
              type: "paragraph",
              text: "One of the early commercial bets for world models is film and video production. The best example here is World Labs. World Labs' first product Marble, is a 3D World Model using Gaussian Splatting techniques discussed in Section 1. The architectural choice is deliberate: film production demands geometric consistency in a way that 2D generative approaches can't guarantee. A director needs to return to the same set from a different angle and have it look identical. 3D representations make that promise; pixel prediction models don't.",
            },
            {
              type: "paragraph",
              text: "The current limitation is dynamism — static architectural environments are well within reach, but simulating crowds, water, fire, or cloth at production quality remains an open problem.",
            },
            {
              type: "paragraph",
              text: "A case study with HTC VIVE's virtual production system demonstrated this efficiency: three creators with no 3D experience generated over ten unique 3D environments, from futuristic interiors to moody cityscapes and filmed social content inside them in a single afternoon, a task that would traditionally require weeks of modeling and rendering work.",
            },
          ],
        },
        {
          id: "gaming",
          title: "Gaming",
          blocks: [
            {
              type: "paragraph",
              text: "Gaming is one of the clearest examples of the data flywheel dynamic in world models — the more users play, the more interaction data is collected, and the better the model gets. Two companies in this space, Moonvalley and General Intuition, are pursuing meaningfully different strategies:",
            },
            {
              type: "list",
              items: [
                "Moonlake AI builds the world model as the product. It focuses on reducing gaming development costs with its product, Reverie. This system generates interactive 3D environments from natural language prompts. Technically, it achieves persistence, where edits like a crumbling wall hold across frames – by conditioning the model on 3D structural signals rather than just pixel sequences.",
                "General Intuition employs a data-centric strategy, leveraging its spinout from Medal, which captures 2 billion gameplay clips annually. The near-term product is AI-powered NPCs. The longer-term bet is that games are the most effective environment for AI to learn to understand the real world, as they provide a verifiable domain for spatial-temporal reasoning where every action can be objectively assessed.",
              ],
            },
          ],
        },
        {
          id: "autonomous-driving",
          title: "Autonomous Driving",
          blocks: [
            {
              type: "paragraph",
              text: "Autonomous driving presents the \"long tail\" challenge: the rare, unpredictable, and dangerous scenarios that cause accidents are nearly impossible to gather training data for in the real world. World models solve this by simulating the extreme tail end of reality at scale (E.g., floods, wrong-way drivers, elephants crossing the street). We've examined two companies around how they use world models: Tesla and Waymo.",
            },
            { type: "subheading", text: "Tesla" },
            {
              type: "paragraph",
              text: "Tesla utilizes a world model primarily for \"eval\"—acting as a high-fidelity, neural simulator to stress-test driving policies prior to real-world deployment. Tesla's world model uses state-action data to fine-tune its E2E foundation model that's trained for driving. The world model allows Tesla to generate a full closed-loop simulation: the policy acts, the world model predicts what happens next, the policy responds to that prediction, and the loop continues.",
            },
            {
              type: "paragraph",
              text: "This allows Tesla to evaluate policy behavior across a vast range of scenarios without physical hardware, such as:",
            },
            {
              type: "list",
              items: [
                "Real world replay: Resimulating historical edge cases to evaluate how a new policy build would behave.",
                "Counterfactual Testing: Altering variables (e.g., changing weather to a wet road, introducing a sudden cut-in, or blocking a lane) to test hundreds of parallel futures.",
                "Extreme Stress-Testing: Generating rare, hazardous edge cases that seldom occur on public roads.",
                "Risk-Free Iteration: Improving safety profiles at a massive scale without exposing drivers or pedestrians to physical risk.",
              ],
            },
            {
              type: "paragraph",
              text: "Furthermore, Tesla is generalizing this exact neural simulation framework to Optimus, allowing the humanoid robot to simulate and evaluate its physical interactions with the world. Note that Wayve's approach resembles Tesla's.",
            },
            {
              type: "exhibit",
              src: "/exhibits/page11_img0.png",
              alt: "Diagram of how Tesla trains and uses world models for autonomous driving evaluation",
              caption:
                "Exhibit – How Tesla trains and uses world model for AV and Robotics",
              wide: true,
            },
            {
              type: "exhibit",
              src: "/exhibits/page11_img1.png",
              alt: "Supplementary diagram of Tesla world model simulation loop for policy evaluation",
              caption: "Source: Building Foundational Models for Robotics at Tesla",
              wide: true,
            },
            { type: "subheading", text: "Waymo" },
            {
              type: "paragraph",
              text: "In February 2026, Google published the Waymo World Model that's built on top of Google DeepMind's Genie 3. Waymo's use case is more or less similar to Tesla's – using world models for training and evaluation to explore long tail of situations that are never / rarely observed by its fleet.",
            },
            {
              type: "paragraph",
              text: "What's different is modality: Waymo simulates camera + 3D lidar + HD maps using post training from 2D video.",
            },
            {
              type: "exhibit",
              src: "/exhibits/page12_video.webm",
              alt: "Waymo world model multimodal simulation with camera, lidar, and HD maps",
              caption: "Waymo World Model — camera, 3D lidar, and HD maps",
              wide: true,
            },
          ],
        },
        {
          id: "robotics",
          title: "Robotics",
          blocks: [
            {
              type: "paragraph",
              text: "Robotics and autonomous driving share more than intuition suggests — they both require an agent to perceive a physical environment, model what happens next, and act accordingly. Tesla makes this connection explicit: the same world model architecture underlying FSD is being transferred directly to its Optimus humanoid robot, a bet that the dynamics of navigating roads and navigating physical spaces are similar enough to share a foundation.",
            },
            {
              type: "paragraph",
              text: "But robotics introduces challenges that autonomous driving doesn't face. A car operates in a relatively constrained environment (e.g., roads, lanes). A robot operating in an unstructured environment faces contact-rich manipulation, deformable objects, and unpredictable human interaction. Picking up a coffee cup, folding laundry, assembling a component — these require a world model that understands fine-grained physical dynamics, not just navigation. World models address this by giving robots the ability to reason about physical consequences before acting — two use cases are currently emerging:",
            },
            {
              type: "paragraph",
              text: "World model as a simulator: this approach uses world models to replace traditional physics simulators like IsaacSim, MuJoCo, and ManiSkill. Traditional simulators are hand-engineered — researchers manually define physics rules, object properties, and environment dynamics. They work well for structured, predictable tasks but struggle with the messiness of the real world: deformable objects, complex contact dynamics, and the infinite variety of unstructured environments a robot might encounter. A learned world model sidesteps this by inferring inverse dynamics from real-world data. This unlocks four concrete capabilities:",
            },
            {
              type: "list",
              items: [
                "Cheaper data generation. Given a starting frame and a language instruction (\"pick up the cup\"), the world model generates synthetic video clips of a robot completing the task. An inverse dynamics model then automatically labels those clips with actions, producing robot policy training data at a fraction of the cost of physical collection. DreamGen and GR00T N1 use this approach.",
                "Inference-time planning. Rather than committing to a single action, the robot simulates several possible futures inside the world model and selects the most promising one. The main challenge is latency — the simulation must run fast enough for real-time control.",
                "Policy evaluation. Before touching physical hardware, a robot policy can be stress-tested inside the world model — including adversarial scenarios designed to surface safety failures early.",
                "Learning dynamics of the real world that are hard to simulate: Rather than using traditional simulators, DayDreamer, Robotic World Model papers take a different approach. Instead of hand-coding physics rules, they learn the dynamics of the real world directly from real robot interactions. Like Dreamer, they operate in latent space — but they don't predict images, only the physically relevant next state (joint positions, forces, contact signals). The result is a world model grounded in how the real world actually behaves, not how a simulator approximates it.",
              ],
            },
            {
              type: "paragraph",
              text: "World model as a policy: Instead of using the video model just to train or evaluate a separate controller, you use it as the controller itself. This usually uses an action-conditioned world model (e.g., V-JEPA 2, DreamZero). The robot's decision-making is baked directly into the video model. Because the native outputs are videos rather than robot actions, several methods have been developed to obtain control signals:",
            },
            {
              type: "list",
              items: [
                "Generate video and actions simultaneously. The simplest approach: take a video model and bolt on an action decoder alongside it. The model generates video frames and robot actions at the same time, in one pass.",
                "Use the video model as a feature extractor, not a generator. Rather than generating full video, you only use the video model's internal representations. The video model never actually produces a video. The advantage is speed — you skip the expensive generation step, making real-time control more feasible.",
                "Generate a desired future video, then translate to actions (open-loop). Rather than generating actions directly, the model first generates a video of what success looks like — \"here is what the robot completing this task should look like\" — and then a separate inverse dynamics model watches that video and figures out what actions would produce it.",
                "Generate a desired future video, then translate to actions (closed-loop). Same idea as open-loop, but the model constantly updates its generated video based on what's actually happening in the real world. Rather than committing to one blueprint upfront, it's like an architect who checks the building site after every wall goes up and revises the plans accordingly.",
              ],
            },
          ],
        },
        {
          id: "scientific-simulation",
          title: "Scientific Simulation",
          blocks: [
            {
              type: "paragraph",
              text: "Scientific simulation is perhaps the highest-stakes application of world models — and the least discussed. Traditional simulation requires researchers to already know the rules: write down the physics equations, then compute forward. World models offer a different path: learn the dynamics directly from experimental data, without needing to know the underlying equations first.",
            },
            {
              type: "paragraph",
              text: "This has meaningful implications across molecular dynamics, climate modeling, materials discovery, and nuclear fusion — domains where the cost of physical experimentation is enormous and the value of faster, cheaper simulation is correspondingly high.",
            },
            {
              type: "paragraph",
              text: "Most of these applications remain research-stage or narrow deployments — the general-purpose scientific world model doesn't exist yet. But the early signals are compelling enough to watch closely.",
            },
          ],
        },
      ],
    },
    {
      id: "section-3",
      title: "Core technical bottlenecks across different approaches",
      number: 3,
      subsections: [
        {
          id: "bottlenecks-2d",
          title: "2D Generative Model",
          blocks: [
            {
              type: "paragraph",
              text: "Video-centric world models are impressive in short bursts. Genie's beta program (e.g., Project Genie), for instance, can sustain coherent interactive environments for up to 60 seconds.",
            },
            {
              type: "paragraph",
              text: "However, over longer horizons, they suffer from spatiotemporal inconsistency: the model's internal representation of the world gradually drifts from coherence. This manifests as failures of object permanence, where items disappear or change properties mid-scene; spatial drift, where a room looks different when you retrace your steps; and violations of basic causal dynamics, where objects pass through surfaces or liquids ignore gravity.",
            },
            {
              type: "paragraph",
              text: "The deeper technical issue is compounding rollout error (model drift). World models simulate the consequences of an agent's actions by chaining predictions: the model imagines step 1, predicts step 2 from that, step 3 from step 2 — and errors accumulate exponentially. By step 10 of a robot manipulation task, the imagined world bears little resemblance to reality.",
            },
            {
              type: "paragraph",
              text: "A second structural limitation is control latency that is caused by architectural inheritance. Models like Genie 3 are fine-tuned from general-purpose video generation models — in Genie 3's case, built on top of Veo 3. This foundation optimizes for visual plausibility over physical accuracy, which creates a ceiling for applications requiring precise real-time interaction. This issue hits hard for robot training specifically, where a model needs to faithfully simulate fine-grained real-time contact dynamics (e.g., Genie has a reported action-to-render latency of ~1.8 seconds).",
            },
            {
              type: "paragraph",
              text: "The third limitation is compute cost. Current 2D generative world models must regenerate every pixel from scratch at each step — and to maintain temporal consistency, they condition on an expanding window of past frames. The cost compounds as the sequence grows: a model simulating 100 steps is doing dramatically more work than one simulating 10, which makes long-horizon simulation increasingly expensive and creates a hard practical ceiling for real-time applications.",
            },
          ],
        },
        {
          id: "bottlenecks-3d",
          title: "3D Generative Model",
          blocks: [
            {
              type: "paragraph",
              text: "The core strength of 3D world models is their explicit geometric representation — rather than generating pixels from scratch at every timestep, they ground generation in a persistent 3D scene scaffold. The result is that object identity and spatial layout are preserved by construction, not learned statistically. Objects stay where you left them. Rooms look the same when revisited. Basic physical constraints (e.g., occlusion, depth, surface continuity) hold across long horizons without needing to be re-derived from pixels at every step. This also makes them significantly cheaper to run than 2D generative models.",
            },
            {
              type: "paragraph",
              text: "The tradeoffs are:",
            },
            {
              type: "list",
              ordered: true,
              items: [
                "3D world models can't handle dynamic content: these models are designed for static scenes and struggle with dynamic content (e.g., water flowing, complex deformations), the type of interaction that matters for physical manipulation and general-purpose simulation.",
                "Even if the model can handle dynamic content, it still wouldn't understand physical causality (geometry vs. physics problem): A Gaussian splat encodes where things are and what they look like — it does not encode how they behave when forces are applied. The explicit structure that solves the consistency problem simultaneously prevents the model from internalizing the physical dynamics that make a simulator useful. This limitation cuts across both 2D and 3D world models — neither approach guarantees understanding of physical causality.",
                "Data scarcity: 3D representations require multi-view video or depth data (e.g., LiDAR) for training, which is expensive and technically demanding to collect at scale. The richness and environmental variety achievable with internet-scale 2D video simply isn't available in 3D, limiting current models to narrow, curated domains (e.g., driving scenes, indoor rooms, specific object categories).",
              ],
            },
          ],
        },
        {
          id: "bottlenecks-latent",
          title: "Latent Space Model",
          blocks: [
            {
              type: "paragraph",
              text: "Latent world models sidestep the rendering constraints that limit both 2D and 3D approaches — no pixel generation, no geometric scaffold, just compressed abstract representations of what matters. This makes them significantly cheaper to run and architecturally flexible in ways the other two approaches aren't.",
            },
            {
              type: "paragraph",
              text: "The core tradeoff is that compression is always lossy. When an observation is encoded into a lower-dimensional latent state, information is discarded — and the model chooses what to discard based on what it learned during training, not necessarily what matters for the task at hand. A model might faithfully preserve texture and color while silently dropping the subtle structural cues that are actually decision-critical: the slight lean of an unstable tower, the trajectory of a moving object, the shadow that signals an obstacle just outside the frame. These details may be imperceptible to a human glancing at a scene but essential to an agent acting within it.",
            },
          ],
        },
      ],
    },
    {
      id: "section-4",
      title: "Experiments across world models",
      number: 4,
      lead: "Though there are many World Model companies out there, products available for testing / prototyping are limited. We have designed three prompts that test the limits of different types of world models and tried to implement the models available for the public.",
      subsections: [
        {
          id: "experiments-overview",
          title: "Overview",
          blocks: [
            {
              type: "list",
              items: [
                "Tasks — 3 prompts",
                "Model providers — World Labs Marble, Google Project Genie, Moonlake, Odyssey",
              ],
            },
          ],
        },
        {
          id: "prompt-1",
          title: "Prompt #1: Brutalist Library Golden Hour",
          blocks: [
            {
              type: "experiment-card",
              number: "Prompt 01",
              prompt: "Brutalist Library — Golden Hour",
              rationale:
                "Tests geometric consistency, lighting fidelity, and material rendering — core strengths of 3D approaches. Reveals whether 2D models maintain consistent shadows and reflections from different angles.",
              links: [
                {
                  label: "Marble ↗",
                  href: "https://marble.worldlabs.ai/world/6de100b3-6534-4be4-b99e-6f780f470779",
                  embed:
                    "https://marble.worldlabs.ai/viewer.html?splatUrl=https%3A%2F%2Fcdn.marble.worldlabs.ai%2F6de100b3-6534-4be4-b99e-6f780f470779%2Fd07a297d-b2c7-4d51-9762-608c60b5eaf7_ceramic.spz&mobileUrl=https%3A%2F%2Fcdn.marble.worldlabs.ai%2F6de100b3-6534-4be4-b99e-6f780f470779%2F745e4f1f-b4f9-4fd7-b959-b9d829e52fd4_ceramic_500k.spz&marbleWorldId=6de100b3-6534-4be4-b99e-6f780f470779",
                },
                {
                  label: "Project Genie ↗",
                  href: "https://labs.google/fx/projectgenie/tools/projectgenie/e5482f81-2062-4209-b989-ca470e0ecfc8",
                },
                {
                  label: "Odyssey ↗",
                  href: "https://experience.odyssey.ml/Pp9gMdA4N4",
                },
                {
                  label: "Moonlake ↗",
                  href: "https://app.moonlakeai.com/share/9UuBVmXLs-df0EXu8Fx1Eg",
                  glb: "/scene-1.glb",
                },
              ],
            },
          ],
        },
        {
          id: "prompt-2",
          title: "Prompt #2: Coastal cliffside at dusk during a storm",
          blocks: [
            {
              type: "experiment-card",
              number: "Prompt 02",
              prompt:
                "A coastal cliffside at dusk during a storm. Waves crash against the rocks below, sea spray rises, and tall grass bends in the wind. A narrow dirt path runs along the edge.",
              rationale:
                "Targets the dynamic content weakness of 3D models — water, wind, grass movement. Tests whether each platform can handle multiple simultaneous dynamic elements or freezes them into a static scene.",
              links: [
                {
                  label: "Marble ↗",
                  href: "https://marble.worldlabs.ai/world/d91117e9-fae9-4dc3-b712-49763db64b3b",
                  embed:
                    "https://marble.worldlabs.ai/viewer.html?splatUrl=https%3A%2F%2Fcdn.marble.worldlabs.ai%2Fd91117e9-fae9-4dc3-b712-49763db64b3b%2F6fda98d7-376d-4dfb-9783-e0b403f593ed_ceramic.spz&mobileUrl=https%3A%2F%2Fcdn.marble.worldlabs.ai%2Fd91117e9-fae9-4dc3-b712-49763db64b3b%2F2e5bfedc-c6c3-4efa-ab7b-e184d7591055_ceramic_500k.spz&marbleWorldId=d91117e9-fae9-4dc3-b712-49763db64b3b",
                },
                {
                  label: "Project Genie ↗",
                  href: "https://labs.google/fx/projectgenie/tools/projectgenie/3e4ce51d-1753-48d9-911e-6b1cff840b27",
                },
                {
                  label: "Odyssey ↗",
                  href: "https://experience.odyssey.ml/iDwX4nIbhL",
                },
              ],
            },
          ],
        },
        {
          id: "prompt-3",
          title: "Prompt #3: Cluttered workshop",
          blocks: [
            {
              type: "experiment-card",
              number: "Prompt 03",
              prompt:
                "A cluttered workshop with tools hanging on pegboards, a half-assembled motorcycle on a workbench, oil stains on the concrete floor, and a single bare bulb overhead.",
              rationale:
                "Tests object diversity, spatial layout coherence, and fine-grained detail rendering. Also a good stress test for navigability — can you move around the motorcycle without geometry breaking down?",
              links: [
                {
                  label: "Marble ↗",
                  href: "https://marble.worldlabs.ai/world/ed991585-8c8d-4443-bcdf-4f0d1b2cee49",
                  embed:
                    "https://marble.worldlabs.ai/viewer.html?splatUrl=https%3A%2F%2Fcdn.marble.worldlabs.ai%2Fed991585-8c8d-4443-bcdf-4f0d1b2cee49%2Fbeb3d660-83c4-45e9-9774-be802fab46a4_ceramic.spz&mobileUrl=https%3A%2F%2Fcdn.marble.worldlabs.ai%2Fed991585-8c8d-4443-bcdf-4f0d1b2cee49%2Faa079490-b5a9-4992-aefe-84c20ab9655f_ceramic_500k.spz&marbleWorldId=ed991585-8c8d-4443-bcdf-4f0d1b2cee49",
                },
                {
                  label: "Project Genie ↗",
                  href: "https://labs.google/fx/projectgenie/tools/projectgenie/5abdfb77-3f38-4412-9f3f-6d80ab0f1402",
                },
                {
                  label: "Odyssey ↗",
                  href: "https://experience.odyssey.ml/RpF3EClouN",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function buildToc(articleData: Article): TocItem[] {
  const items: TocItem[] = [{ id: "intro", title: "Introduction", level: 1 }];

  for (const section of articleData.sections) {
    items.push({
      id: section.id,
      title: section.title,
      level: 1,
      sectionNumber: section.number,
    });
    for (const sub of section.subsections) {
      items.push({ id: sub.id, title: sub.title, level: 2 });
    }
  }

  return items;
}

export const toc = buildToc(article);
