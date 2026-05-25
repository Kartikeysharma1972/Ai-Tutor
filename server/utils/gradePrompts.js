export function getGradeGroup(grade) {
  if (grade <= 3) return 'primary-lower';
  if (grade <= 5) return 'primary-upper';
  if (grade <= 8) return 'middle';
  if (grade <= 10) return 'secondary';
  return 'senior-secondary';
}

export function getGradeBehavior(grade) {
  const group = getGradeGroup(grade);
  const behaviors = {
    'primary-lower': {
      tone: 'Very friendly, playful, and encouraging',
      vocabulary: 'Very simple words, short sentences, use fun comparisons',
      depth: 'Basic surface-level, focus on visual analogies and stories',
      examples: 'Everyday objects, animals, colors, simple counting',
      questionStyle: 'Image-based, picture click, matching, counting, true/false',
    },
    'primary-upper': {
      tone: 'Friendly and supportive, slightly more structured',
      vocabulary: 'Simple but clear, real-world examples',
      depth: 'Slightly deeper, introduce basic reasoning',
      examples: 'Real-world scenarios, simple experiments, daily life',
      questionStyle: 'MCQ, fill blanks, matching, drag-drop, word problems',
    },
    'middle': {
      tone: 'Encouraging and structured, builds confidence',
      vocabulary: 'Introduce technical terms with explanations',
      depth: 'Conceptual explanations, connect ideas across topics',
      examples: 'Scientific examples, historical events, mathematical patterns',
      questionStyle: 'MCQ, assertion-reason, diagram MCQ, case-study, sequencing',
    },
    'secondary': {
      tone: 'Formal, exam-focused, thorough',
      vocabulary: 'CBSE board-level terminology, precise language',
      depth: 'Full CBSE depth, board exam preparation level',
      examples: 'Board exam questions, NCERT examples, previous year papers',
      questionStyle: 'CBSE MCQ, assertion-reason, case-based, HOTS, numericals',
    },
    'senior-secondary': {
      tone: 'Analytical, rigorous, competitive-exam aware',
      vocabulary: 'Advanced technical language, domain-specific jargon',
      depth: 'Deep conceptual + competitive exam level analysis',
      examples: 'JEE/NEET/competitive examples, research applications',
      questionStyle: 'Multi-select, integer type, matrix match, case analysis, code debugging',
    },
  };
  return behaviors[group];
}

function getQuestionTypeSchema(gradeGroup) {
  const common = `
--- MCQ ---
{"question":"...", "type":"mcq", "options":["A","B","C","D"], "correctAnswer":"exact option text", "difficulty":"easy|medium|hard", "topic":"...", "explanation":"...", "studyNotes":"..."}

--- True/False ---
{"question":"...", "type":"true-false", "options":["True","False"], "correctAnswer":"True or False", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}

--- Fill in the Blanks ---
{"question":"The process of _____ converts light energy into chemical energy.", "type":"fill-blank", "correctAnswer":"photosynthesis", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const matchFollowing = `
--- Match the Following ---
{"question":"Match the following:", "type":"match-following", "pairs":[{"left":"Column A item","right":"Column B item"},{"left":"...","right":"..."}], "correctAnswer":"1-B, 2-A, 3-D, 4-C", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const sequenceOrdering = `
--- Sequence Ordering ---
{"question":"Arrange in correct order:", "type":"sequence-ordering", "items":["step3","step1","step4","step2"], "correctAnswer":"step1, step2, step3, step4", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const assertionReason = `
--- Assertion-Reason ---
{"question":"Assertion: [statement]\\nReason: [statement]", "type":"assertion-reason", "options":["Both A and R are true, R is the correct explanation of A","Both A and R are true, R is NOT the correct explanation of A","A is true but R is false","A is false but R is true"], "correctAnswer":"exact option text", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const caseStudy = `
--- Case-Study Based ---
{"question":"Read the passage below and answer:\\n[passage text]\\n\\nQuestion: ...", "type":"case-study", "options":["A","B","C","D"], "correctAnswer":"exact option text", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const numerical = `
--- Numerical/Calculation ---
{"question":"Calculate the value of ...", "type":"numerical", "correctAnswer":"42", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const oneWord = `
--- One-Word Answer ---
{"question":"Name the process by which ...", "type":"one-word", "correctAnswer":"osmosis", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const hots = `
--- HOTS (Higher Order Thinking) ---
{"question":"Why do you think ... Explain with reasoning.", "type":"hots", "options":["A","B","C","D"], "correctAnswer":"exact option text", "difficulty":"hard", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const codeOutput = `
--- Code Output ---
{"question":"What will be the output of the following code?\\n\`\`\`\\nprint(2+3*4)\\n\`\`\`", "type":"code-output", "options":["14","20","12","24"], "correctAnswer":"14", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const multiSelect = `
--- Multi-Select MCQ ---
{"question":"Which of the following are correct? (Select all that apply)", "type":"multi-select", "options":["A","B","C","D"], "correctAnswer":"A, C", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const integerType = `
--- Integer Type ---
{"question":"The atomic number of Carbon is ___", "type":"integer-type", "correctAnswer":"6", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const matrixMatch = `
--- Matrix Match ---
{"question":"Match the items in Column I with Column II:", "type":"matrix-match", "pairs":[{"left":"Column I item","right":"Column II item"},{"left":"...","right":"..."}], "correctAnswer":"1-C, 2-A, 3-D, 4-B", "difficulty":"...", "topic":"...", "explanation":"...", "studyNotes":"..."}
`;

  const schemas = {
    'primary-lower': common + matchFollowing,
    'primary-upper': common + matchFollowing + sequenceOrdering,
    'middle': common + matchFollowing + sequenceOrdering + assertionReason + caseStudy + oneWord,
    'secondary': common + assertionReason + caseStudy + numerical + hots + codeOutput,
    'senior-secondary': common + assertionReason + caseStudy + numerical + multiSelect + integerType + matrixMatch + codeOutput,
  };

  return schemas[gradeGroup] || schemas['middle'];
}

function getQuestionTypeDistribution(gradeGroup, totalQuestions) {
  const distributions = {
    'primary-lower': { 'mcq': 0.35, 'true-false': 0.25, 'fill-blank': 0.20, 'match-following': 0.20 },
    'primary-upper': { 'mcq': 0.27, 'true-false': 0.13, 'fill-blank': 0.20, 'match-following': 0.20, 'sequence-ordering': 0.20 },
    'middle': { 'mcq': 0.20, 'true-false': 0.08, 'fill-blank': 0.12, 'match-following': 0.12, 'sequence-ordering': 0.12, 'assertion-reason': 0.12, 'case-study': 0.12, 'one-word': 0.12 },
    'secondary': { 'mcq': 0.20, 'true-false': 0.08, 'fill-blank': 0.08, 'assertion-reason': 0.16, 'case-study': 0.16, 'numerical': 0.12, 'hots': 0.12, 'code-output': 0.08 },
    'senior-secondary': { 'mcq': 0.13, 'true-false': 0.07, 'fill-blank': 0.07, 'assertion-reason': 0.10, 'case-study': 0.13, 'numerical': 0.13, 'multi-select': 0.10, 'integer-type': 0.10, 'matrix-match': 0.07, 'code-output': 0.10 },
  };

  const dist = distributions[gradeGroup] || distributions['middle'];
  const types = Object.entries(dist);
  let remaining = totalQuestions;
  const result = [];

  types.forEach(([type, pct], i) => {
    const count = i === types.length - 1 ? remaining : Math.max(1, Math.round(totalQuestions * pct));
    remaining -= count;
    if (remaining < 0) remaining = 0;
    result.push(`- ${count} questions of type "${type}"`);
  });

  return result.join('\n');
}

export function getExpectedTypes(grade) {
  const gradeGroup = getGradeGroup(grade);
  const typeMap = {
    'primary-lower': ['mcq', 'true-false', 'fill-blank', 'match-following'],
    'primary-upper': ['mcq', 'true-false', 'fill-blank', 'match-following', 'sequence-ordering'],
    'middle': ['mcq', 'true-false', 'fill-blank', 'match-following', 'sequence-ordering', 'assertion-reason', 'case-study', 'one-word'],
    'secondary': ['mcq', 'true-false', 'fill-blank', 'assertion-reason', 'case-study', 'numerical', 'hots', 'code-output'],
    'senior-secondary': ['mcq', 'true-false', 'fill-blank', 'assertion-reason', 'case-study', 'numerical', 'multi-select', 'integer-type', 'matrix-match', 'code-output'],
  };
  return typeMap[gradeGroup] || typeMap['middle'];
}

export function buildSystemPrompt(grade, tool, extra = {}) {
  const behavior = getGradeBehavior(grade);
  const gradeGroup = getGradeGroup(grade);

  let systemPrompt = `You are an AI Tutor for a Class ${grade} student studying the CBSE curriculum in India.

GRADE BEHAVIOR PROFILE:
- Tone: ${behavior.tone}
- Vocabulary Level: ${behavior.vocabulary}
- Explanation Depth: ${behavior.depth}
- Example Style: ${behavior.examples}

IMPORTANT RULES:
- Always calibrate your language, depth, and examples to a Class ${grade} student
- Follow NCERT/CBSE syllabus scope strictly
- Be encouraging and supportive
- Use Hindi transliteration sparingly if it helps explain a concept
`;

  if (tool === 'concept-explainer') {
    const level = extra.explanationLevel || 'beginner';
    const levelDesc = {
      beginner: 'CBSE standard-level explanation, simple language, foundational understanding',
      intermediate: 'Slightly above CBSE, added depth, broader context, connecting concepts',
      advanced: 'Rigorous, competitive-exam level, deep conceptual coverage, edge cases',
    };
    systemPrompt += `
TOOL: Concept Explainer
EXPLANATION LEVEL: ${level} — ${levelDesc[level] || levelDesc.beginner}
${extra.subject ? `SUBJECT CONTEXT: ${extra.subject}` : ''}
${extra.chapter ? `CHAPTER CONTEXT: ${extra.chapter}` : ''}

${extra.subject || extra.chapter ? `The student is studying ${extra.subject || 'a subject'}${extra.chapter ? ', specifically the chapter: "' + extra.chapter + '"' : ''}. Focus your explanation within this scope. Reference NCERT content, examples, and terminology from this specific chapter. Connect concepts to other topics within this chapter where relevant.` : ''}

RESPONSE GUIDELINES:
- Give ACCURATE, DETAILED answers. Do not be vague or generic.
- If a question is about a specific formula, theorem, or law — state it precisely with the correct form.
- Use NCERT-aligned terminology and examples.
- For Maths/Science: always include step-by-step working where applicable.
- For conceptual questions: explain the WHY, not just the WHAT.
- If the student seems confused, break it down further with simpler analogies.

RESPONSE FORMAT:
1. **Explanation** — Clear, thorough explanation with real-world analogies appropriate for Class ${grade}
2. **Key Diagram/Flow** — Text-based diagram, flowchart, or table showing the concept structure
3. **Examples** — 2-3 worked examples relevant to Class ${grade} CBSE curriculum${extra.chapter ? ' from "' + extra.chapter + '"' : ''}
4. **Quick Recap** — 3-4 bullet points summarizing the key takeaways
5. **What to Study Next** — Suggest prerequisite concepts to revisit or next topics to explore

Keep responses well-structured with headers and bullet points. Use markdown formatting. Be precise and helpful.
`;
  }

  if (tool === 'document-summarizer') {
    const mode = extra.summarizationMode || 'full';
    systemPrompt += `
TOOL: Document Summarizer
MODE: ${mode}

${mode === 'full' ? 'Provide a comprehensive summary of the entire document, covering all key points.' : ''}
${mode === 'key-points' ? 'Extract the most important points as a clean bullet-point list.' : ''}
${mode === 'search' ? `Answer this specific question from the document: "${extra.query || ''}"` : ''}

Calibrate the summary language and depth to Class ${grade} level.
Use clear headings and bullet points. Highlight important terms.
`;
  }

  if (tool === 'project-generator') {
    systemPrompt += `
TOOL: Project Idea Generator
SUBJECT: ${extra.subject || 'General'}
PROJECT TYPE: ${extra.projectType || 'Any'}
${extra.topic ? `SPECIFIC TOPIC: ${extra.topic}` : ''}

Generate exactly ${extra.count || 4} unique project ideas. For each idea provide:

**Project Title:** [Creative, descriptive title]
**Description:** [2-3 sentence overview]
**Materials/Tools Needed:** [Bullet list]
**Effort Level:** [Easy / Medium / Hard]
**CBSE Relevance:** [Which chapter/topic this connects to]

Make ideas creative, feasible for a Class ${grade} student, and aligned with CBSE curriculum.
`;
  }

  if (tool === 'mock-test') {
    const testConfig = getMockTestConfig(grade);
    const typeSchemas = getQuestionTypeSchema(gradeGroup);
    const typeDistribution = getQuestionTypeDistribution(gradeGroup, testConfig.totalQuestions);
    systemPrompt += `
TOOL: Mock Test Generator
SUBJECT: ${extra.subject}
CHAPTERS: ${extra.chapters?.join(', ') || 'All'}

Generate exactly ${testConfig.totalQuestions} questions following this structure:
- Easy: ${testConfig.easyPercent}% (${Math.round(testConfig.totalQuestions * testConfig.easyPercent / 100)} questions)
- Medium: ${testConfig.mediumPercent}% (${Math.round(testConfig.totalQuestions * testConfig.mediumPercent / 100)} questions)
- Hard: ${testConfig.hardPercent}% (${Math.round(testConfig.totalQuestions * testConfig.hardPercent / 100)} questions)

MANDATORY QUESTION TYPE DISTRIBUTION — You MUST follow this EXACTLY:
${typeDistribution}

⚠️ CRITICAL: Do NOT generate all MCQ questions. The distribution above is MANDATORY. If it says "2 true-false", you MUST generate exactly 2 true-false type questions. If it says "2 match-following", you MUST include 2 match-following questions with a "pairs" array. Follow each type's schema below EXACTLY.

RESPONSE FORMAT: Return a JSON object with a "questions" key containing an array.
Each question object MUST follow one of these schemas based on its type:

${typeSchemas}

IMPORTANT:
- Return ONLY valid JSON: {"questions": [...]}
- You MUST follow the MANDATORY type distribution above — NOT all MCQ
- Make questions CBSE-aligned and grade-appropriate
- For "match-following" and "matrix-match", provide exactly 4-5 pairs in the "pairs" array
- For "sequence-ordering", provide 4-6 items in the "items" array (shuffled, not in correct order)
- For "assertion-reason", always provide both Assertion and Reason in the question text
- For "multi-select", correctAnswer should list all correct options separated by ", "
- correctAnswer must exactly match one of the options (for MCQ types) or be the precise answer
- Each question MUST have a "type" field matching one of the types listed above
`;
  }

  if (tool === 'focus-area') {
    systemPrompt += `
TOOL: Focus Area — Deep Study
SUBJECT: ${extra.subject}
CHAPTER: ${extra.chapter}
TOPIC: ${extra.topic}

Provide comprehensive study material with these sections:

## 📚 Complete Concept Explanation
Full explanation of "${extra.topic}" calibrated to Class ${grade} level. Cover all subtopics.

## 📐 Key Formulas & Definitions
${grade >= 6 ? 'List all relevant formulas, theorems, and definitions.' : 'List key terms and their simple meanings.'}

## 🗺️ Mind Map
Create a text-based mind map / concept tree showing how subtopics connect.

## 📝 Frequently Asked Exam Questions
5-6 questions that commonly appear in CBSE exams on this topic, each with a detailed answer.

## ✍️ Practice Questions
5-6 practice questions with answers hidden (format: Q: question, then A: answer on next line).

Use markdown formatting. Be thorough and exam-focused.
`;
  }

  return systemPrompt;
}

export function getMockTestConfig(grade) {
  if (grade <= 3) return { totalQuestions: 12, totalTime: 20, easyPercent: 70, mediumPercent: 20, hardPercent: 10 };
  if (grade <= 5) return { totalQuestions: 15, totalTime: 20, easyPercent: 70, mediumPercent: 20, hardPercent: 10 };
  if (grade <= 8) return { totalQuestions: 25, totalTime: 40, easyPercent: 50, mediumPercent: 35, hardPercent: 15 };
  if (grade <= 10) return { totalQuestions: 25, totalTime: 40, easyPercent: 30, mediumPercent: 50, hardPercent: 20 };
  return { totalQuestions: 30, totalTime: 50, easyPercent: 30, mediumPercent: 50, hardPercent: 20 };
}
