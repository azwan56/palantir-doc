export interface SectionEntry {
  id: string;
  zhName: string;
  category: 'foundation' | 'semantic' | 'kinetic' | 'apps' | 'architecture' | 'governance' | 'legacy' | 'other';
  order: number;
  description: string;
  docCount: number;
}

export interface DocEntry {
  id: string;
  relPath: string;
  sectionId: string;
  navTitle: string;
  h1: string;
  sourceUrl: string;
  headings: string[];
  excerpt: string;
  searchText: string;
  imageCount: number;
  codeCount: number;
  badges: string[];
  wordEstimate: number;
}

export interface DocsIndex {
  generatedAt: string;
  totalDocs: number;
  totalSections: number;
  sections: SectionEntry[];
  docs: DocEntry[];
}

export interface CurriculumLesson {
  id: string;
  stageId: string;
  order: number;
  title: string;
  enSubtitle: string;
  duration: string;
  level: '入门' | '核心' | '进阶' | '架构';
  tldr: string;
  analogy: string;
  keyPoints: string[];
  pitfall: string;
  diagram?: {
    src: string;
    caption: string;
    alt: string;
  };
  sourceDocs: Array<{
    docId: string;
    label: string;
  }>;
}

export interface CurriculumStage {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  goal: string;
  lessons: CurriculumLesson[];
}

export interface GlossaryTerm {
  term: string;
  zhName: string;
  category: '语义层' | '动力层' | '应用层' | '架构与治理';
  summary: string;
  example: string;
  docId: string;
}

export interface AntiPatternItem {
  id: string;
  name: string;
  zhName: string;
  symptom: string;
  avoidSnippet: string;
  preferSnippet: string;
  impact: string;
  docId: string;
}

export interface QuizQuestion {
  id: string;
  level: '入门' | '进阶';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  docId: string;
  docTitle: string;
}
