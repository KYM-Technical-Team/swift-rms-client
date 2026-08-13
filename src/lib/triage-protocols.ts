export type TriageColour = 'RED' | 'YELLOW' | 'GREEN';

export interface ProtocolQuestion {
  id: string;
  text: string;
  note?: string;
  yesColour?: TriageColour;
  noColour?: TriageColour;
}

export interface TriageProtocol {
  id: string;
  name: string;
  shortName: string;
  keywords: string[];
  icon: 'obstetric' | 'paediatric' | 'breathing' | 'chest' | 'consciousness' | 'trauma' | 'burns' | 'other';
  questions: ProtocolQuestion[];
  criteria: Record<TriageColour, string[]>;
}

export const triageProtocols: TriageProtocol[] = [
  {
    id: 'obstetric',
    name: 'Obstetric',
    shortName: 'Obstetric',
    keywords: ['pregnant', 'pregnancy', 'delivery', 'labour'],
    icon: 'obstetric',
    questions: [
      { id: 'pregnant', text: 'Is the patient pregnant?', noColour: 'GREEN' },
      { id: 'weeks', text: 'How many weeks of pregnancy?', note: 'Record gestational age in call notes.' },
      { id: 'bleeding', text: 'Is there heavy vaginal bleeding?', yesColour: 'RED' },
      { id: 'labour', text: 'Is the patient in labour?', yesColour: 'YELLOW' },
      { id: 'contact', text: 'Is the patient in contact with antenatal care?', noColour: 'YELLOW' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Clear vaginal discharge with no other symptoms'],
      YELLOW: ['Imminent delivery or water broken', 'Vaginal bleeding without critical signs', 'Fever or pregnancy-related pain'],
      RED: ['Unconscious or decreased consciousness', 'Not breathing normally', 'Major bleeding or severe pain'],
    },
  },
  {
    id: 'paediatric',
    name: 'Paediatric',
    shortName: 'Paediatric',
    keywords: ['child', 'children', 'baby', 'infant'],
    icon: 'paediatric',
    questions: [
      { id: 'age', text: 'How old is the child?' },
      { id: 'trauma', text: 'Did the child have a trauma?', yesColour: 'YELLOW', note: 'If yes, follow the Trauma protocol.' },
      { id: 'breathing', text: 'Is the child breathing normally?', noColour: 'RED' },
      { id: 'alert', text: 'Is the child awake, lethargic or unconscious?', noColour: 'RED' },
      { id: 'fever', text: 'Does the child have fever?', yesColour: 'YELLOW' },
      { id: 'seizure', text: 'Has the child had a seizure?', yesColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Cough or cold symptoms without danger signs'],
      YELLOW: ['Dehydration', 'Vomiting and diarrhoea continues', 'Fever or lethargy'],
      RED: ['Unconscious or lethargic', 'Not breathing normally', 'Ongoing or multiple seizures'],
    },
  },
  {
    id: 'breathing',
    name: 'Breathing difficulty',
    shortName: 'Breathing',
    keywords: ['choking', 'shortness of breath', 'difficult breathing'],
    icon: 'breathing',
    questions: [
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'sentences', text: 'Can the patient speak in full sentences?', noColour: 'RED' },
      { id: 'choking', text: 'Is the patient choking?', yesColour: 'RED' },
      { id: 'upright', text: 'Does the patient have to sit up to breathe?', yesColour: 'YELLOW' },
      { id: 'pain', text: 'Does it hurt to breathe?', yesColour: 'YELLOW' },
      { id: 'pale', text: 'Is the patient pale or sweating?', yesColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Cough, cold or blocked nose with no danger signs'],
      YELLOW: ['History of respiratory problems', 'Breathing normal when seated', 'Abnormal vital signs'],
      RED: ['Unconscious or decreased consciousness', 'Unable to speak due to breathing difficulty', 'Choking or severe chest pain'],
    },
  },
  {
    id: 'chest-pain',
    name: 'Chest pain',
    shortName: 'Chest Pain',
    keywords: ['chest pain', 'epigastric pain'],
    icon: 'chest',
    questions: [
      { id: 'trauma', text: 'Has the patient had a trauma?', yesColour: 'YELLOW' },
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'breath', text: 'Is the patient short of breath?', yesColour: 'RED' },
      { id: 'radiating', text: 'Does the patient feel pain anywhere else?', yesColour: 'YELLOW' },
      { id: 'pale', text: 'Is the patient pale or sweating?', yesColour: 'RED' },
      { id: 'faint', text: 'Is the patient weak or faint?', yesColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Under 35 with no other symptoms', 'Costal pain or mild chest burn'],
      YELLOW: ['Conscious and breathing normally with rapid heart rate', 'Deep pain', 'All home calls for chest pain'],
      RED: ['Unconscious or decreased consciousness', 'Difficulty breathing', 'Syncope or very pale'],
    },
  },
  {
    id: 'consciousness',
    name: 'Consciousness',
    shortName: 'Consciousness',
    keywords: ['unconscious', 'fainted', 'collapsed', 'stroke', 'cannot speak', 'loss of strength'],
    icon: 'consciousness',
    questions: [
      { id: 'trauma', text: 'Has the patient had a trauma?', yesColour: 'YELLOW' },
      { id: 'alert', text: 'Can the patient talk and answer questions?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'seizure', text: 'Has the patient had a seizure?', yesColour: 'RED' },
      { id: 'stroke', text: 'Is there facial droop, speech difficulty or weakness?', yesColour: 'RED' },
      { id: 'diabetic', text: 'Is the patient diabetic?', yesColour: 'YELLOW' },
    ],
    criteria: {
      GREEN: ['Headache without previous episodes or other symptoms', 'Fainted, alert and now symptom-free'],
      YELLOW: ['Diabetic with no insulin at the moment', 'Multiple fainting', 'Confused or altered speech'],
      RED: ['Unconscious or decreased consciousness', 'Difficulty breathing', 'Stroke signs or sudden severe headache'],
    },
  },
  {
    id: 'animal-bite',
    name: 'Animal bite',
    shortName: 'Animal Bite',
    keywords: ['animal', 'snake', 'bite', 'sting'],
    icon: 'other',
    questions: [
      { id: 'contained', text: 'Is the animal contained?' },
      { id: 'breathing', text: 'Is the patient short of breath?', yesColour: 'RED' },
      { id: 'bleeding', text: 'Is the patient bleeding?', yesColour: 'YELLOW' },
      { id: 'controlled', text: 'Can the bleeding be controlled with pressure?', noColour: 'RED' },
      { id: 'snake', text: 'Was this a snake bite?', yesColour: 'YELLOW' },
    ],
    criteria: {
      GREEN: ['No green code for snake bites'],
      YELLOW: ['Controlled bleeding or swelling', 'Bite below the neck from a non-poisonous animal', 'All snake bites'],
      RED: ['Unconscious or abnormal breathing', 'Uncontrolled bleeding', 'Serious neck or face bite'],
    },
  },
  {
    id: 'drowning',
    name: 'Drowning',
    shortName: 'Drowning',
    keywords: ['water', 'drowned', 'drowning'],
    icon: 'breathing',
    questions: [
      { id: 'removed', text: 'Has the patient been removed from the water?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'coughing', text: 'Is the patient coughing?', yesColour: 'YELLOW' },
      { id: 'injury', text: 'Can the patient move all limbs?', noColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Lost in water and cannot be seen'],
      YELLOW: ['Not submerged but coughing', 'Fractured leg or arm', 'All cases after drowning except those still in water'],
      RED: ['Unconscious or decreased consciousness', 'Difficulty breathing', 'Still in water'],
    },
  },
  {
    id: 'electric-shock',
    name: 'Electric shock',
    shortName: 'Electric Shock',
    keywords: ['electric', 'electrocution', 'lightning'],
    icon: 'other',
    questions: [
      { id: 'contact', text: 'Is the patient still in contact with the source?', yesColour: 'RED' },
      { id: 'alert', text: 'Is the patient alert and able to walk?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'burns', text: 'Does the patient have burns?', yesColour: 'YELLOW' },
      { id: 'injuries', text: 'Does the patient have other injuries?', yesColour: 'YELLOW' },
    ],
    criteria: {
      GREEN: ['Household electric shock with no temporary loss of consciousness', 'No symptoms'],
      YELLOW: ['Multiple victims without major symptoms', 'Temporary loss of consciousness', 'Industrial electric shock'],
      RED: ['Unconscious or not breathing normally', 'Burns', 'Lightning or high-voltage source'],
    },
  },
  {
    id: 'burns',
    name: 'Fire and burns',
    shortName: 'Burns',
    keywords: ['burn', 'fire', 'heat', 'explosion', 'caustic'],
    icon: 'burns',
    questions: [
      { id: 'electric', text: 'Was the patient burned by electricity?', yesColour: 'RED' },
      { id: 'flammable', text: 'Was petrol or another flammable liquid involved?', yesColour: 'RED' },
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient short of breath?', yesColour: 'RED' },
      { id: 'blister', text: 'Is the burned skin red, blistered or black?', yesColour: 'YELLOW' },
      { id: 'face', text: 'Is the patient burned on the face or neck?', yesColour: 'RED' },
    ],
    criteria: {
      GREEN: ['First-degree burns under 10%', 'Minor second-degree burns on hands, arms, legs or feet'],
      YELLOW: ['Burns under 20% but over 10%', 'All burns involving children'],
      RED: ['Unconscious or abnormal breathing', 'Electrical or chemical burn', 'Face, neck or burns over 20%'],
    },
  },
  {
    id: 'road-accident',
    name: 'Road accident',
    shortName: 'Road Accident',
    keywords: ['road accident', 'vehicle', 'crash', 'collision'],
    icon: 'trauma',
    questions: [
      { id: 'what', text: 'Describe how the accident happened.' },
      { id: 'injured', text: 'How many people are injured?' },
      { id: 'trapped', text: 'Is anyone trapped in a vehicle?', yesColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'bleeding', text: 'Is the patient bleeding?', yesColour: 'YELLOW' },
      { id: 'limbs', text: 'Can the patient move all arms and legs?', noColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Small cuts', 'Bruises', 'Walking with no symptoms'],
      YELLOW: ['Neck or back pain with moving limbs', 'Isolated fracture', 'Low-speed collision'],
      RED: ['Unconscious or abnormal breathing', 'Trapped patient', 'Uncontrolled bleeding or multiple fractures'],
    },
  },
  {
    id: 'seizures',
    name: 'Seizures',
    shortName: 'Seizures',
    keywords: ['seizure', 'convulsion'],
    icon: 'consciousness',
    questions: [
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'active', text: 'Is the patient still seizing?', yesColour: 'RED' },
      { id: 'duration', text: 'Has the seizure lasted more than five minutes?', yesColour: 'RED' },
      { id: 'repeat', text: 'Has the patient had multiple seizures?', yesColour: 'RED' },
      { id: 'pregnant', text: 'Is the patient pregnant?', yesColour: 'RED' },
    ],
    criteria: {
      GREEN: [],
      YELLOW: ['Single seizure with no other symptoms', 'All home calls for seizure, even if refused'],
      RED: ['Unconscious or not breathing after seizure', 'Decreased consciousness', 'Ongoing or multiple seizures'],
    },
  },
  {
    id: 'trauma',
    name: 'Other trauma',
    shortName: 'Trauma',
    keywords: ['hurt', 'fall', 'wound', 'laceration', 'fracture', 'work accident', 'sport accident'],
    icon: 'trauma',
    questions: [
      { id: 'what', text: 'Describe what happened and the patient position.' },
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'bleeding', text: 'Is the patient bleeding?', yesColour: 'YELLOW' },
      { id: 'injury', text: 'Is there an obvious injury?', yesColour: 'YELLOW' },
      { id: 'limbs', text: 'Can the patient move all arms and legs?', noColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Small cuts or bruises', 'Small peripheral wounds'],
      YELLOW: ['Fall under three metres', 'Neck or back pain with moving limbs', 'Isolated fracture'],
      RED: ['Unconscious or abnormal breathing', 'Decreased consciousness', 'Uncontrolled bleeding or central open wounds'],
    },
  },
  {
    id: 'bleeding',
    name: 'Bleeding',
    shortName: 'Bleeding',
    keywords: ['bleeding', 'laceration', 'blood'],
    icon: 'trauma',
    questions: [
      { id: 'trauma', text: 'Has the patient had a trauma?', yesColour: 'YELLOW' },
      { id: 'pregnant', text: 'Is the patient pregnant or recently delivered?', yesColour: 'RED' },
      { id: 'amount', text: 'Is the bleeding heavy?', yesColour: 'RED' },
      { id: 'controlled', text: 'Can the bleeding be controlled with pressure?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'pale', text: 'Is the patient pale or sweating?', yesColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Minor bleeding from hands, arms, legs or feet', 'Controlled bleeding'],
      YELLOW: ['Minor central bleeding', 'Other scene-controlled bleeding'],
      RED: ['Unconscious or abnormal breathing', 'Uncontrolled bleeding', 'Major blood loss or pregnancy-related bleeding'],
    },
  },
  {
    id: 'violence',
    name: 'Violence',
    shortName: 'Violence',
    keywords: ['assault', 'domestic violence', 'sexual assault', 'brawl', 'weapon', 'stabbing', 'firearm'],
    icon: 'trauma',
    questions: [
      { id: 'safe', text: 'Are you and the patient in a safe location?', noColour: 'RED', note: 'Consider alerting the police.' },
      { id: 'weapon', text: 'Was a weapon involved?', yesColour: 'RED' },
      { id: 'alert', text: 'Is the patient alert and able to talk?', noColour: 'RED' },
      { id: 'breathing', text: 'Is the patient breathing normally?', noColour: 'RED' },
      { id: 'bleeding', text: 'Is the patient bleeding?', yesColour: 'YELLOW' },
      { id: 'limbs', text: 'Can the patient move all arms and legs?', noColour: 'RED' },
    ],
    criteria: {
      GREEN: ['Small cuts or bruises', 'Small peripheral wounds'],
      YELLOW: ['Penetrating peripheral injury', 'Neck or back pain with moving limbs', 'All sexual or gender-based violence'],
      RED: ['Unconscious or abnormal breathing', 'Penetrating central injury', 'Uncontrolled bleeding or multiple fractures'],
    },
  },
];

export const protocolById = Object.fromEntries(triageProtocols.map((protocol) => [protocol.id, protocol]));

export function recommendColour(
  protocol: TriageProtocol,
  answers: Record<string, string>,
): TriageColour {
  let colour: TriageColour = 'GREEN';

  for (const question of protocol.questions) {
    const answer = answers[question.id];
    const candidate = answer === 'yes' ? question.yesColour : answer === 'no' ? question.noColour : undefined;
    if (candidate === 'RED') return 'RED';
    if (candidate === 'YELLOW') colour = 'YELLOW';
  }

  return colour;
}
