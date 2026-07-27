export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  points?: string[];
}

export interface GuideArticle {
  slug: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
  updated: string;
  intro: string;
  sections: GuideSection[];
  reference: {
    title: string;
    organization: string;
    url: string;
    reviewed: string;
  };
}

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: "wandering-and-getting-lost",
    category: "Safety",
    title: "Responding to Wandering and Exit Seeking",
    summary:
      "A calm, practical guide to immediate safety, possible triggers, and useful details to record for the next shift.",
    readTime: "4 min read",
    updated: "July 2026",
    intro:
      "Wandering can begin as pacing, repeated requests to go home, or movement toward an exit. The first priority is safety. The next is understanding what the person may be trying to communicate.",
    sections: [
      {
        heading: "Start with immediate safety",
        points: [
          "Confirm that the person is with you and away from traffic, stairs, and unsafe exits.",
          "Use a calm voice and avoid arguing about where they believe they need to go.",
          "If the person is missing, contact emergency services promptly and explain that the person has dementia.",
        ],
      },
      {
        heading: "Look for the need behind the movement",
        paragraphs: [
          "A person may be looking for a bathroom, a familiar person, food, activity, or a place connected to an old routine. Noise, fatigue, discomfort, and changes in staff can also contribute.",
        ],
        points: [
          "Notice the time, location, noise level, and what happened just before the event.",
          "Offer one familiar activity or destination instead of several choices.",
          "Share successful redirection approaches with the next caregiver.",
        ],
      },
      {
        heading: "What to document",
        paragraphs: [
          "Record only what you observed. Include the time, possible trigger, safety steps, who was notified, and what helped. Avoid assumptions about intent.",
        ],
      },
    ],
    reference: {
      title: "Coping With Alzheimer’s Behaviors: Wandering and Getting Lost",
      organization: "National Institute on Aging",
      url: "https://www.nia.nih.gov/health/wandering-and-alzheimers-disease",
      reviewed: "Content reviewed July 9, 2024",
    },
  },
  {
    slug: "agitation-and-sundowning",
    category: "Behavior",
    title: "Agitation, Aggression, and Sundowning",
    summary:
      "How to reduce stimulation, keep everyone safe, and notice patterns that may explain a difficult evening.",
    readTime: "5 min read",
    updated: "July 2026",
    intro:
      "Agitation often has a reason, even when the person cannot explain it. Pain, fatigue, unfamiliar surroundings, too much noise, and demands that feel confusing can all contribute.",
    sections: [
      {
        heading: "Lower the pressure",
        points: [
          "Give the person physical space and reduce noise, bright light, and unnecessary conversation.",
          "Keep your voice low and use one simple sentence at a time.",
          "Do not crowd, restrain, or argue unless an approved emergency protocol requires action.",
        ],
      },
      {
        heading: "Notice evening patterns",
        paragraphs: [
          "Restlessness and confusion can increase late in the day. A predictable schedule, daylight exposure, appropriate activity, and fewer late naps may help some people.",
        ],
      },
      {
        heading: "Escalate when needed",
        paragraphs: [
          "Follow the approved care plan when behavior creates a safety risk, changes suddenly, or may be connected to pain or illness. Sudden behavior changes should be communicated to the clinical team.",
        ],
      },
    ],
    reference: {
      title: "Coping With Agitation, Aggression, and Sundowning in Alzheimer’s Disease",
      organization: "National Institute on Aging",
      url: "https://www.nia.nih.gov/health/alzheimers-changes-behavior-and-communication/coping-agitation-aggression-and-sundowning",
      reviewed: "Content reviewed July 17, 2024",
    },
  },
  {
    slug: "clearer-dementia-communication",
    category: "Communication",
    title: "Clearer Communication in Dementia Care",
    summary:
      "Simple ways to make instructions easier to understand while protecting dignity and reducing frustration.",
    readTime: "4 min read",
    updated: "July 2026",
    intro:
      "Communication changes as dementia progresses. Shorter language, fewer choices, and patient pauses can make an interaction feel safer and easier.",
    sections: [
      {
        heading: "Make the moment easier to process",
        points: [
          "Approach from the front, identify yourself, and make comfortable eye contact.",
          "Ask one question at a time and allow extra time for a response.",
          "Offer two clear choices instead of an open list of possibilities.",
        ],
      },
      {
        heading: "Respond to emotion before facts",
        paragraphs: [
          "Correcting every detail can increase distress. When the exact fact is not important for safety, acknowledge the feeling and gently redirect toward the present need.",
        ],
      },
      {
        heading: "Protect dignity",
        paragraphs: [
          "Speak to the person, not around them. Avoid baby talk, public correction, and conversations about private care needs where others can hear.",
        ],
      },
    ],
    reference: {
      title: "Alzheimer’s Changes in Behavior and Communication",
      organization: "National Institute on Aging",
      url: "https://www.nia.nih.gov/health/alzheimers-changes-behavior-and-communication",
      reviewed: "Verified July 2026",
    },
  },
  {
    slug: "caregiver-recovery",
    category: "Caregiver Wellbeing",
    title: "Recovering After a Difficult Shift",
    summary:
      "A realistic approach to guilt, emotional overload, brief recovery, and asking for support before strain keeps building.",
    readTime: "4 min read",
    updated: "July 2026",
    intro:
      "Frustration does not automatically mean someone is uncaring. It can be a sign that the demands of the shift exceeded the support, time, or energy available.",
    sections: [
      {
        heading: "After a hard moment",
        points: [
          "Make sure the person is safely supported before stepping away.",
          "Name what happened in plain language without attacking your character.",
          "Choose one recovery action that is possible today, such as water, food, a short walk, or a call to someone you trust.",
        ],
      },
      {
        heading: "Use specific support",
        paragraphs: [
          "General requests for help can be hard to answer. Ask for one concrete thing, such as coverage for ten minutes, help with a handoff, or time to review a recurring trigger.",
        ],
      },
      {
        heading: "Notice when strain is continuing",
        paragraphs: [
          "If sleep, mood, concentration, or your ability to provide safe care keeps changing, consider speaking with a qualified health professional or a support service you trust.",
        ],
      },
    ],
    reference: {
      title: "Alzheimer’s Caregiving: Caring for Yourself",
      organization: "National Institute on Aging",
      url: "https://www.nia.nih.gov/health/alzheimers-caregiving/alzheimers-caregiving-caring-yourself",
      reviewed: "Verified July 2026",
    },
  },
  {
    slug: "medical-changes-to-notice",
    category: "Health",
    title: "Medical Changes Worth Noticing",
    summary:
      "What to observe and communicate when confusion, mobility, hydration, or medication routines suddenly change.",
    readTime: "5 min read",
    updated: "July 2026",
    intro:
      "A person with dementia may not be able to describe pain or illness clearly. New confusion or behavior can sometimes be connected to a medical change.",
    sections: [
      {
        heading: "Observe before interpreting",
        points: [
          "Record what changed, when it began, and whether it is different from the person’s usual pattern.",
          "Notice fluid intake, pain behavior, alertness, breathing, mobility, and recent medication changes.",
          "Share objective observations with the designated nurse or clinical lead.",
        ],
      },
      {
        heading: "Medication uncertainty",
        paragraphs: [
          "Do not guess, repeat a dose, or change written instructions. Check the approved medication record and contact the designated clinical professional.",
        ],
      },
      {
        heading: "Urgent changes",
        paragraphs: [
          "Follow the care plan and emergency protocol for severe bleeding, breathing problems, loss of consciousness, a serious fall, or another immediate safety concern.",
        ],
      },
    ],
    reference: {
      title: "Common Medical Problems in Alzheimer’s Disease: Information for Caregivers",
      organization: "National Institute on Aging",
      url: "https://www.nia.nih.gov/health/alzheimers-caregiving/common-medical-problems-alzheimers-disease-information-caregivers",
      reviewed: "Verified July 2026",
    },
  },
];

export function getGuideArticle(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((article) => article.slug === slug);
}
