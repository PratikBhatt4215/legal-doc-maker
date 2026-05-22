import { Scale, Building2, Users, Baby, Landmark, MessageSquare } from "lucide-react";

export const courts = [
  {
    id: "high-court",
    title: "High Court",
    description: "WP, MCRC, CRA, SA, WA",
    icon: Scale,
    color: "#9b1c31"
  },
  {
    id: "district-court",
    title: "District Court",
    description: "Criminal, Civil, Claims, NI Act",
    icon: Building2,
    color: "#9b1c31"
  },
  {
    id: "family-court",
    title: "Family Court",
    description: "Divorce, Maintenance, Consent",
    icon: Users,
    color: "#9b1c31"
  },
  {
    id: "juvenile-court",
    title: "Juvenile Court",
    description: "Bail, Appeals, JJ Act",
    icon: Baby,
    color: "#9b1c31"
  },
  {
    id: "revenue-court",
    title: "Revenue Court",
    description: "Tehsil, SDM, Collector, Commissioner",
    icon: Landmark,
    color: "#9b1c31"
  },
  {
    id: "forum-court",
    title: "Forum Court",
    description: "Consumer cases, Administrative disputes",
    icon: MessageSquare,
    color: "#9b1c31"
  }
];

export const courtForms: Record<string, Array<{ id: string; name: string; description: string }>> = {
  "high-court": [
    { id: "wp", name: "Writ Petition (WP)", description: "Constitutional remedy petition" },
    { id: "mcrc", name: "MCRC", description: "Miscellaneous Criminal Case" },
    { id: "cra", name: "Criminal Appeal (CRA)", description: "Appeal against conviction" },
    { id: "sa", name: "Second Appeal (SA)", description: "Civil second appeal" },
    { id: "wa", name: "Writ Appeal (WA)", description: "Appeal against writ order" }
  ],
  "district-court": [
    { id: "criminal", name: "Criminal Cases", description: "Criminal proceedings and trials" },
    { id: "civil", name: "Civil Cases", description: "Civil suits and disputes" },
    { id: "claims", name: "Claims", description: "Monetary and property claims" },
    { id: "ni-act", name: "NI Act Cases", description: "Negotiable Instruments Act cases" }
  ],
  "family-court": [
    { id: "divorce", name: "Divorce Petition", description: "Dissolution of marriage" },
    { id: "maintenance", name: "Maintenance", description: "Spousal and child support" },
    { id: "consent", name: "Consent Terms", description: "Mutual consent agreements" }
  ],
  "juvenile-court": [
    { id: "bail", name: "Bail Application", description: "Bail for juveniles" },
    { id: "appeals", name: "Appeals", description: "Appeals in juvenile matters" },
    { id: "jj-act", name: "JJ Act Cases", description: "Juvenile Justice Act proceedings" }
  ],
  "revenue-court": [
    { id: "tehsil", name: "Tehsil Court", description: "Tehsil level revenue matters" },
    { id: "sdm", name: "SDM Court", description: "Sub-Divisional Magistrate cases" },
    { id: "collector", name: "Collector Court", description: "District Collector proceedings" },
    { id: "commissioner", name: "Commissioner Court", description: "Revenue Commissioner cases" }
  ],
  "forum-court": [
    { id: "consumer", name: "Consumer Cases", description: "Consumer protection disputes" },
    { id: "administrative", name: "Administrative Disputes", description: "Administrative tribunal matters" }
  ]
};
