export const DEFAULT_SAMPLE_COMMENTS: string[] = [
  "The new community park is absolutely wonderful! My kids love playing there every weekend.",
  "The trash collection schedule is very confusing and inconsistent. We never know when to put bins out.",
  "The library hours are okay, but it would be great if they opened earlier on weekdays.",
  "I am extremely frustrated with the pothole situation on Main Street. My car was damaged last week.",
  "The new bike lanes are a fantastic addition. I feel much safer commuting to work now.",
  "The local farmers market is a highlight of our neighborhood. Fresh produce and great community spirit.",
  "Noise levels near the construction site are unbearable. It starts at 6am and wakes up my whole family.",
  "The community center staff are always helpful and friendly. Great programs for seniors too.",
  "Internet connectivity in the south district is terrible. We lose connection multiple times a day.",
  "The new street lighting has made evening walks feel much safer. Thank you for this improvement.",
  "Public transport frequency needs improvement. Waiting 45 minutes for a bus is unacceptable.",
  "The annual street festival was amazing this year. Best event the neighborhood has had in years.",
  "Water pressure in our building has been low for three months. Multiple complaints have been ignored.",
  "The new recycling program is a great initiative. Easy to follow and makes a real difference.",
  "Customer service at the city office is slow and unhelpful. Spent two hours waiting for a simple form."
];

export const PRESET_SCENARIOS = [
  {
    id: "full-sample",
    name: "Full 15-Comment Survey",
    description: "The complete dataset from sample_data/comments.csv covering parks, transit, sanitation, and municipal services.",
    comments: DEFAULT_SAMPLE_COMMENTS
  },
  {
    id: "parks-positive",
    name: "Parks & Recreation (Positive Lean)",
    description: "Resident feedback focusing on urban parks, greenways, and public activities.",
    comments: [
      "The new community park is absolutely wonderful! My kids love playing there every weekend.",
      "The new bike lanes are a fantastic addition. I feel much safer commuting to work now.",
      "The local farmers market is a highlight of our neighborhood. Fresh produce and great community spirit.",
      "The community center staff are always helpful and friendly. Great programs for seniors too.",
      "The annual street festival was amazing this year. Best event the neighborhood has had in years.",
      "The park benches are clean and well maintained, though some extra shade trees would be appreciated."
    ]
  },
  {
    id: "infrastructure-critical",
    name: "Infrastructure & Roads (Needs Attention)",
    description: "Urgent citizen complaints regarding potholes, water pressure, and sanitation delays.",
    comments: [
      "I am extremely frustrated with the pothole situation on Main Street. My car was damaged last week.",
      "Water pressure in our building has been low for three months. Multiple complaints have been ignored.",
      "The trash collection schedule is very confusing and inconsistent. We never know when to put bins out.",
      "Noise levels near the construction site are unbearable. It starts at 6am and wakes up my whole family.",
      "Customer service at the city office is slow and unhelpful. Spent two hours waiting for a simple form.",
      "Public transport frequency needs improvement. Waiting 45 minutes for a bus is unacceptable."
    ]
  }
];
