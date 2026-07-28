import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | The Invisible Patient",
  description: "Privacy Policy for The Invisible Patient.",
};

const sections = [
  {
    title: "Information We Collect",
    paragraphs: [
      "When you use Invisible Patient, we may collect the following information.",
    ],
    blocks: [
      {
        title: "Account Information",
        paragraphs: [
          "When you sign in with Google, we receive information provided through your Google account, including:",
        ],
        items: [
          "Your name",
          "Email address",
          "Google account identifier",
          "Profile picture, if available",
        ],
      },
      {
        paragraphs: [
          "Authentication is provided by Supabase Auth. We do not receive or store your Google password.",
        ],
      },
      {
        title: "Profile Information",
        paragraphs: [
          "You may choose to provide additional information, including:",
        ],
        items: [
          "ZIP code",
          "Caregiver preferences",
          "Care recipient information",
          "Personal settings",
        ],
      },
      {
        paragraphs: ["This information is stored in our secure database."],
      },
      {
        title: "Care and Conversation Data",
        paragraphs: [
          "Invisible Patient allows you to record information related to caregiving.",
          "Depending on how you use the application, this may include:",
        ],
        items: [
          "Chat conversations",
          "Care tasks",
          "Notes",
          "Follow ups",
          "Action plans",
          "Check ins",
          "Care events",
          "Progress tracking",
          "Anonymous Circle posts and responses",
        ],
      },
      {
        paragraphs: [
          "Circle posts and responses are visible to other signed in users. They use a generated alias in the application, but remain linked to your account internally for security and moderation.",
        ],
      },
      {
        title: "Technical Information",
        paragraphs: [
          "We automatically collect limited technical information necessary to operate the service, including:",
        ],
        items: [
          "Device information",
          "Browser type",
          "Session information",
          "IP address",
          "Error logs",
          "Authentication events",
        ],
      },
    ],
  },
  {
    title: "How We Use Your Information",
    paragraphs: ["We use your information to:"],
    items: [
      "Authenticate your account",
      "Personalize your experience",
      "Save your caregiving information",
      "Generate AI assisted responses",
      "Synchronize your account across devices",
      "Improve application reliability",
      "Detect fraud or abuse",
      "Comply with legal obligations",
    ],
  },
  {
    title: "AI Processing",
    paragraphs: [
      "Invisible Patient uses artificial intelligence to generate responses and insights.",
      "When you interact with AI powered features, portions of your conversations may be securely transmitted to our AI service provider, Anthropic.",
      "This provider processes the information to generate responses requested by you.",
      "We encourage users not to submit highly sensitive personal or medical information unless they understand the risks associated with cloud based AI services.",
    ],
  },
  {
    title: "Third Party Services",
    paragraphs: [
      "Invisible Patient relies on trusted third party providers to operate.",
      "These currently include:",
    ],
    items: [
      "Google for authentication",
      "Supabase for authentication and database hosting",
      "Anthropic for AI services",
      "Vercel for application hosting",
    ],
    blocks: [
      {
        paragraphs: [
          "These providers maintain their own privacy policies governing the information they process.",
        ],
      },
    ],
  },
  {
    title: "Data Storage",
    paragraphs: [
      "Your account information and caregiving data are stored using Supabase cloud infrastructure.",
      "Data is encrypted during transmission using HTTPS.",
      "Appropriate technical and organizational safeguards are used to protect your information, but no method of transmission or storage can be guaranteed to be completely secure.",
    ],
  },
  {
    title: "Data Sharing",
    paragraphs: [
      "We do not sell your personal information.",
      "We only share information:",
    ],
    items: [
      "With service providers necessary to operate the application",
      "When required by law",
      "To protect our users or our platform",
      "During a business transfer such as a merger or acquisition",
    ],
  },
  {
    title: "Your Choices",
    paragraphs: ["You may:"],
    items: [
      "Update your profile information",
      "Stop using the application at any time",
      "Request deletion of your account and associated data by contacting us",
    ],
    blocks: [
      {
        paragraphs: [
          "Deleting your account may permanently remove your stored caregiving information.",
        ],
      },
    ],
  },
  {
    title: "Children's Privacy",
    paragraphs: [
      "Invisible Patient is not intended for children under the age of 13.",
      "We do not knowingly collect information from children under 13.",
    ],
  },
  {
    title: "Security",
    paragraphs: ["We use industry standard security practices including:"],
    items: [
      "Encrypted HTTPS connections",
      "Secure authentication",
      "Database access controls",
      "Row Level Security for user owned data",
      "Secure session management",
    ],
    blocks: [
      {
        paragraphs: [
          "While we work to protect your information, no system can guarantee absolute security.",
        ],
      },
    ],
  },
  {
    title: "Medical Disclaimer",
    paragraphs: [
      "Invisible Patient provides organizational tools and AI assisted informational support.",
      "It is not a medical device and does not provide medical advice, diagnosis, or treatment.",
      "Always consult qualified healthcare professionals regarding medical decisions.",
      "Do not rely on AI generated responses during emergencies.",
      "If you believe someone is experiencing a medical emergency, contact your local emergency services immediately.",
    ],
  },
  {
    title: "Changes to this Policy",
    paragraphs: [
      "We may update this Privacy Policy periodically.",
      "Material changes will be reflected by updating the Last Updated date above.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Questions regarding this Privacy Policy may be sent to our support team.",
    ],
    contact: true,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      introduction={[
        'Welcome to Invisible Patient, referred to as "Invisible Patient," "we," "our," or "us." This Privacy Policy explains what information we collect, how we use it, who we share it with, and the choices available to you.',
        "By using Invisible Patient, you agree to the practices described in this Privacy Policy.",
      ]}
      sections={sections}
    />
  );
}
