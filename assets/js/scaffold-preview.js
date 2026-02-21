(function () {
  const byId = (id) => document.getElementById(id);

  const prompts = {
    1: [
      "Low power mode. Just do step one.",
      "Two minutes counts today. Start tiny."
    ],
    2: [
      "Keep it small. Touch step one.",
      "Start ugly. Start anyway."
    ],
    3: [
      "You are in range. Begin with the first move.",
      "Step one. No negotiation."
    ],
    4: [
      "Good energy. Use it before it leaks.",
      "Aim it at step one right now."
    ],
    5: [
      "You have fuel. Convert it into motion.",
      "Do step one immediately while it is hot."
    ]
  };

  const energyMultipliers = {
    1: 0.6,
    2: 0.8,
    3: 1,
    4: 1.2,
    5: 1.45
  };

  function escapeHtml(input) {
    return String(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buildBaseSteps(task) {
    return [
      {
        title: "Gather and orient",
        desc: `Open what you need for \"${task}\".`,
        minutes: 5,
        type: "action"
      },
      {
        title: "First tiny move",
        desc: `Do the smallest possible piece of \"${task}\".`,
        minutes: 5,
        type: "action"
      },
      {
        title: "Micro break",
        desc: "60 seconds. Breathe and reset your shoulders.",
        minutes: 2,
        type: "break"
      },
      {
        title: "Momentum block",
        desc: `Work \"${task}\" for one focused block.`,
        minutes: 12,
        type: "action"
      },
      {
        title: "Checkpoint",
        desc: "Write one sentence: what is done and what is next.",
        minutes: 2,
        type: "checkpoint"
      },
      {
        title: "Park it clean",
        desc: "Stop without losing the thread. Leave a note for future you.",
        minutes: 8,
        type: "action"
      }
    ];
  }

  function addLowEnergyBreaks(steps) {
    const result = [];
    steps.forEach((step, index) => {
      result.push(step);
      if ((index === 1 || index === 3) && step.type === "action") {
        result.push({
          title: "Mini reset",
          desc: "Drink water or change rooms. 30 seconds.",
          minutes: 1,
          type: "break"
        });
      }
    });
    return result;
  }

  function shapeByEnergy(steps, energy) {
    if (energy <= 2) {
      return addLowEnergyBreaks(steps);
    }

    if (energy >= 5) {
      return steps.filter((step) => step.title !== "Micro break");
    }

    return steps;
  }

  function scaleMinutes(steps, energy) {
    const mult = energyMultipliers[energy] || 1;
    return steps.map((step) => ({
      ...step,
      minutes: Math.max(1, Math.round(step.minutes * mult))
    }));
  }

  function generate(task, energy) {
    const base = buildBaseSteps(task);
    const shaped = shapeByEnergy(base, energy);
    const scaled = scaleMinutes(shaped, energy);

    return scaled.slice(0, 8).map((step, idx) => ({
      ...step,
      order: idx + 1
    }));
  }

  function render() {
    const taskInput = byId("sp-task");
    const energyInput = byId("sp-energy");
    const moodInput = byId("sp-mood");
    const output = byId("sp-output");

    if (!taskInput || !energyInput || !moodInput || !output) {
      return;
    }

    const task = (taskInput.value || "").trim() || "your task";
    const energy = Number.parseInt(energyInput.value, 10) || 3;
    const mood = moodInput.value || "Calm";

    const promptPool = prompts[energy] || prompts[3];
    const initiationPrompt = promptPool[Math.floor(Math.random() * promptPool.length)];
    const steps = generate(task, energy);
    const totalMinutes = steps.reduce((sum, step) => sum + step.minutes, 0);

    const safePrompt = escapeHtml(initiationPrompt);
    const safeMood = escapeHtml(mood);

    output.innerHTML = [
      '<div class="sp-summary-card">',
      '<div class="sp-summary-kicker">Initiation prompt</div>',
      `<div class="sp-summary-prompt">${safePrompt}</div>`,
      `<div class="sp-summary-meta">Energy ${energy} · Mood ${safeMood} · Total about ${totalMinutes} minutes</div>`,
      '</div>',
      '<div class="sp-steps">',
      ...steps.map((step) => {
        const safeTitle = escapeHtml(step.title);
        const safeDesc = escapeHtml(step.desc);
        return [
          '<div class="sp-step-card">',
          `<div class="sp-step-kicker">Step ${step.order} · ${step.minutes} min</div>`,
          `<div class="sp-step-title">${safeTitle}</div>`,
          `<div class="sp-step-desc">${safeDesc}</div>`,
          '</div>'
        ].join("");
      }),
      '</div>'
    ].join("");
  }

  const button = byId("sp-generate");
  if (!button) {
    return;
  }

  button.addEventListener("click", render);
})();
