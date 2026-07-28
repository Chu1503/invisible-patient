"use client";

import {
  ArrowUpRight,
  Bed,
  Brain,
  Building2,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { getCareResources, type CareResource } from "@/lib/care";

const RESOURCE_ICONS: Record<string, LucideIcon> = {
  resource_eldercare: Building2,
  resource_respite: Bed,
  resource_state_support: ShieldCheck,
  resource_alz: Brain,
};

function ResourceCard({ resource }: { resource: CareResource }) {
  const Icon = RESOURCE_ICONS[resource.id] ?? Search;

  return (
    <a
      className="resource-card"
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${resource.title}, opens the official website in a new tab`}
    >
      <span className="resource-card-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div className="resource-card-copy">
        <div className="resource-card-heading">
          <h3>{resource.title}</h3>
          <ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <p>{resource.description}</p>
      </div>
      <div className="resource-card-meta">
        <span>{resource.verifiedBy}</span>
        <span>Caregiver support</span>
      </div>
    </a>
  );
}

export default function ReadResources() {
  const caregiverResources = getCareResources().filter(
    (resource) =>
      resource.category === "caregiver-support" ||
      resource.category === "respite"
  );

  return (
    <section className="read-resources" aria-labelledby="resources-heading">
      <header className="resources-heading">
        <h2 id="resources-heading">Resources</h2>
      </header>

      <div className="resource-grid">
        {caregiverResources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>

      <aside className="resource-urgent" aria-labelledby="urgent-support-heading">
        <div>
          <span>Urgent support</span>
          <h3 id="urgent-support-heading">Emotional distress or suicidal crisis</h3>
          <p>
            The 988 Suicide &amp; Crisis Lifeline offers immediate, confidential
            support in the United States.
          </p>
        </div>
        <div className="resource-urgent-actions">
          <a href="tel:988">Call 988</a>
          <a href="sms:988">Text 988</a>
          <a href="https://988lifeline.org/chat/" target="_blank" rel="noreferrer">
            Chat online
            <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
      </aside>
    </section>
  );
}
