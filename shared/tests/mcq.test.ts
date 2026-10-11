import { describe, expect, it } from 'vitest';
import {
  McqExportRequest,
  McqImportRequest,
  McqImportResponse,
  McqQuestion,
  McqReference,
  McqSet,
  McqSetSummary,
} from '../src/schemas/mcq.js';
import { bad, DATE, ID, ID2, issueMessages, issuePaths, ok } from './helpers.js';

const q = (over: Record<string, unknown> = {}) => ({
  number: 1,
  question: 'Which scheduling algorithm can cause starvation?',
  options: { A: 'Round Robin', B: 'FCFS' },
  ...over,
});

const manyQuestions = (n: number) => Array.from({ length: n }, (_, i) => q({ number: i + 1 }));

describe('McqReference', () => {
  it('accepts filename with or without page', () => {
    ok(McqReference, { filename: 'OS-Notes.pdf' });
    ok(McqReference, { filename: 'OS-Notes.pdf', page: 14 });
  });
  it('rejects empty filename, page < 1, non-integer page', () => {
    bad(McqReference, { filename: '' });
    bad(McqReference, { page: 3 });
    bad(McqReference, { filename: 'a.pdf', page: 0 });
    bad(McqReference, { filename: 'a.pdf', page: 1.5 });
    bad(McqReference, { filename: 'a.pdf', page: '3' });
  });
});

describe('McqQuestion', () => {
  it('accepts a minimal question and defaults answer and explanation to null', () => {
    const r = McqQuestion.parse(q());
    expect(r.answer).toBeNull();
    expect(r.explanation).toBeNull();
    expect(r.reference).toBeUndefined();
  });
  it('accepts a full question', () => {
    ok(
      McqQuestion,
      q({
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        answer: 'C',
        explanation: 'Because.',
        reference: { filename: 'OS-Notes.pdf', page: 14 },
      }),
    );
  });
  it('keeps explicit null answer and explanation', () => {
    const r = McqQuestion.parse(q({ answer: null, explanation: null }));
    expect(r.answer).toBeNull();
    expect(r.explanation).toBeNull();
  });

  describe('answer', () => {
    it('is rejected when not one of the option letters (path = answer)', () => {
      const input = q({ answer: 'C' }); // options are only A and B
      bad(McqQuestion, input);
      expect(issuePaths(McqQuestion, input)).toContainEqual(['answer']);
      expect(issueMessages(McqQuestion, input)).toContain(
        'answer must be one of the option letters',
      );
    });
    it('is accepted when it is one of the option letters', () => {
      ok(McqQuestion, q({ answer: 'A' }));
      ok(McqQuestion, q({ answer: 'B' }));
    });
    it('must be a letter A-F', () => {
      bad(McqQuestion, q({ answer: 'G' }));
      bad(McqQuestion, q({ answer: 'a' }));
      bad(McqQuestion, q({ answer: '' }));
      bad(McqQuestion, q({ answer: 1 }));
    });
  });

  describe('options', () => {
    it('needs at least 2', () => {
      bad(McqQuestion, q({ options: {} }));
      bad(McqQuestion, q({ options: { A: 'only one' } }));
      expect(issueMessages(McqQuestion, q({ options: { A: 'x' } }))).toContain(
        'A question needs between 2 and 6 options',
      );
    });
    it('accepts 2 up to 6 (A-F)', () => {
      ok(McqQuestion, q({ options: { A: 'a', B: 'b' } }));
      ok(McqQuestion, q({ options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f' } }));
    });
    // Letters are limited to A-F, so a 7th option can only come with an invalid letter.
    it('rejects a 7th option (letter G is outside A-F)', () => {
      const seven = { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f', G: 'g' };
      bad(McqQuestion, q({ options: seven }));
    });
    it('rejects letters outside A-F, lowercase letters, and numeric keys', () => {
      bad(McqQuestion, q({ options: { A: 'a', G: 'g' } }));
      bad(McqQuestion, q({ options: { A: 'a', b: 'b' } }));
      bad(McqQuestion, q({ options: { A: 'a', '1': 'b' } }));
    });
    it('rejects empty or whitespace-only option text and text over 1000 chars', () => {
      bad(McqQuestion, q({ options: { A: 'a', B: '' } }));
      bad(McqQuestion, q({ options: { A: 'a', B: '   ' } }));
      ok(McqQuestion, q({ options: { A: 'a', B: 'b'.repeat(1000) } }));
      bad(McqQuestion, q({ options: { A: 'a', B: 'b'.repeat(1001) } }));
    });
    it('rejects non-object options', () => {
      bad(McqQuestion, q({ options: ['a', 'b'] }));
      bad(McqQuestion, q({ options: 'A,B' }));
    });
  });

  describe('other fields', () => {
    it('number must be an integer >= 1', () => {
      ok(McqQuestion, q({ number: 1 }));
      bad(McqQuestion, q({ number: 0 }));
      bad(McqQuestion, q({ number: -1 }));
      bad(McqQuestion, q({ number: 1.5 }));
      bad(McqQuestion, q({ number: '1' }));
    });
    it('question is trimmed, non-empty and at most 2000 chars', () => {
      expect(McqQuestion.parse(q({ question: '  hi  ' })).question).toBe('hi');
      ok(McqQuestion, q({ question: 'a'.repeat(2000) }));
      bad(McqQuestion, q({ question: 'a'.repeat(2001) }));
      bad(McqQuestion, q({ question: '   ' }));
      bad(McqQuestion, q({ question: undefined }));
    });
    it('explanation is at most 4000 chars', () => {
      ok(McqQuestion, q({ explanation: 'a'.repeat(4000) }));
      bad(McqQuestion, q({ explanation: 'a'.repeat(4001) }));
    });
    it('reference is validated when present', () => {
      bad(McqQuestion, q({ reference: { filename: '' } }));
      bad(McqQuestion, q({ reference: { filename: 'a.pdf', page: 0 } }));
    });
  });
});

describe('McqSet and McqSetSummary', () => {
  const set = {
    id: ID,
    topicId: ID2,
    title: 'Set 1',
    questionCount: 1,
    questions: [q({ answer: 'A' })],
    createdAt: DATE,
    updatedAt: DATE,
  };
  it('McqSet accepts a valid set (also with no questions)', () => {
    ok(McqSet, set);
    ok(McqSet, { ...set, questions: [], questionCount: 0 });
  });
  it('McqSet rejects invalid embedded questions and missing fields', () => {
    bad(McqSet, { ...set, questions: [q({ answer: 'Z' })] });
    bad(McqSet, { ...set, questionCount: 1.5 });
    bad(McqSet, { ...set, title: undefined });
  });
  it('McqSetSummary has no questions field', () => {
    const { questions: _omit, ...summary } = set;
    void _omit;
    ok(McqSetSummary, summary);
    expect('questions' in McqSetSummary.shape).toBe(false);
    expect(McqSetSummary.parse(set)).not.toHaveProperty('questions');
  });
});

describe('McqImportRequest', () => {
  // dtos.md section 6.3
  const example = {
    topic: 'Operating Systems',
    title: 'Scheduling MCQs - Set 1',
    questions: [
      {
        number: 1,
        question: 'Which scheduling algorithm can cause starvation?',
        options: {
          A: 'Round Robin',
          B: 'FCFS',
          C: 'Priority Scheduling',
          D: 'None of these',
        },
        answer: 'C',
        explanation: 'Low-priority processes may wait indefinitely.',
        reference: { filename: 'OS-Notes.pdf', page: 14 },
      },
    ],
  };

  it('accepts the example from dtos.md section 6.3', () => {
    const r = McqImportRequest.parse(example);
    expect(r.title).toBe('Scheduling MCQs - Set 1');
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0]?.answer).toBe('C');
  });
  it('topic is optional', () => {
    const { topic: _omit, ...noTopic } = example;
    void _omit;
    ok(McqImportRequest, noTopic);
  });
  it('rejects duplicate question numbers and reports the path of the later one', () => {
    const input = {
      title: 'T',
      questions: [q({ number: 1 }), q({ number: 2 }), q({ number: 1 })],
    };
    bad(McqImportRequest, input);
    expect(issuePaths(McqImportRequest, input)).toEqual([['questions', 2, 'number']]);
    expect(issueMessages(McqImportRequest, input)).toEqual(['Duplicate question number 1']);
  });
  it('reports every duplicate', () => {
    const input = { title: 'T', questions: [q({ number: 5 }), q({ number: 5 }), q({ number: 5 })] };
    expect(issuePaths(McqImportRequest, input)).toEqual([
      ['questions', 1, 'number'],
      ['questions', 2, 'number'],
    ]);
  });
  it('allows non-sequential but unique numbers', () => {
    ok(McqImportRequest, { title: 'T', questions: [q({ number: 10 }), q({ number: 3 })] });
  });
  it('rejects an empty questions array and a missing one', () => {
    bad(McqImportRequest, { title: 'T', questions: [] });
    bad(McqImportRequest, { title: 'T' });
  });
  it('accepts exactly 500 questions and rejects 501', () => {
    ok(McqImportRequest, { title: 'T', questions: manyQuestions(500) });
    bad(McqImportRequest, { title: 'T', questions: manyQuestions(501) });
  });
  it('reports the path of an invalid question field', () => {
    const input = { title: 'T', questions: [q(), q({ number: 2, answer: 'D' })] };
    expect(issuePaths(McqImportRequest, input)).toContainEqual(['questions', 1, 'answer']);
  });
  it('title is trimmed, non-empty and at most 200 chars', () => {
    const questions = [q()];
    expect(McqImportRequest.parse({ title: '  T  ', questions }).title).toBe('T');
    ok(McqImportRequest, { title: 'a'.repeat(200), questions });
    bad(McqImportRequest, { title: 'a'.repeat(201), questions });
    bad(McqImportRequest, { title: '   ', questions });
    bad(McqImportRequest, { questions });
  });
  it('rejects wrong top-level types', () => {
    bad(McqImportRequest, null);
    bad(McqImportRequest, []);
    bad(McqImportRequest, { title: 'T', questions: 'nope' });
    bad(McqImportRequest, { title: 'T', topic: 5, questions: [q()] });
  });
});

describe('McqImportResponse', () => {
  const valid = { setId: ID, title: 'T', questionCount: 3, replaced: false };
  it('accepts a valid response', () => ok(McqImportResponse, valid));
  it('rejects bad types', () => {
    bad(McqImportResponse, { ...valid, replaced: 'no' });
    bad(McqImportResponse, { ...valid, setId: 'x' });
    bad(McqImportResponse, { ...valid, questionCount: 1.2 });
  });
});

describe('McqExportRequest', () => {
  it('applies defaults on an empty body', () => {
    expect(McqExportRequest.parse({})).toEqual({
      includeAnswers: 'key',
      includeExplanations: false,
      pageSize: 'A4',
    });
  });
  it('accepts every enum value', () => {
    for (const includeAnswers of ['none', 'marked', 'key'])
      ok(McqExportRequest, { includeAnswers });
    for (const pageSize of ['A4', 'Letter']) ok(McqExportRequest, { pageSize });
  });
  it('rejects unknown enum values and wrong types', () => {
    bad(McqExportRequest, { includeAnswers: 'all' });
    bad(McqExportRequest, { pageSize: 'A3' });
    bad(McqExportRequest, { includeExplanations: 'yes' });
  });
  it('validates questionNumbers', () => {
    ok(McqExportRequest, { questionNumbers: [1, 2, 3] });
    ok(McqExportRequest, { questionNumbers: [] });
    ok(McqExportRequest, { questionNumbers: Array.from({ length: 500 }, (_, i) => i + 1) });
    bad(McqExportRequest, { questionNumbers: Array.from({ length: 501 }, (_, i) => i + 1) });
    bad(McqExportRequest, { questionNumbers: [0] });
    bad(McqExportRequest, { questionNumbers: [1.5] });
    bad(McqExportRequest, { questionNumbers: ['1'] });
  });
});
