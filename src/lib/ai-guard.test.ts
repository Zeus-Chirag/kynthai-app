import { describe, expect, it } from 'vitest';
import { guardAiScope } from './ai-guard';

describe('ai-guard: off-topic / action-execution refusal', () => {
  it('refuses software build requests (landing page)', () => {
    const r = guardAiScope('Can you build me a landing page for my startup selling dog food?');
    expect(r.refused).toBe(true);
    expect(r.reason).toBe('build');
  });

  it('refuses code generation', () => {
    for (const m of [
      'Write me a Python script that sorts a list',
      'Create a React component for a login form',
      'Generate a SQL query to get all users',
      'Can you code a website for my bakery?',
      'Build an app that tracks my sleep',
    ]) {
      const r = guardAiScope(m);
      expect(r.refused).toBe(true);
      expect(r.reason).toBe('build');
    }
  });

  it('refuses clear general trivia (no health signal)', () => {
    for (const m of [
      'What is two plus two?',
      'What is the capital of France?',
      'Spell the word pneumonoultramicroscopicsilicovolcanoconiosis',
      'Who won the last cricket match?',
      'Give me a movie recommendation',
    ]) {
      const r = guardAiScope(m);
      expect(r.refused).toBe(true);
    }
  });

  it('NEVER refuses health-related messages (veto)', () => {
    for (const m of [
      'What is metformin used for?',
      'Can I take ibuprofen with my blood pressure medication?',
      'I have a fever and my nose is closed, what should I do?',
      'Are there any interactions between my current medications?',
      'I forgot to take my pill this morning',
      'When should I call my doctor about this symptom?',
    ]) {
      const r = guardAiScope(m);
      expect(r.refused).toBe(false);
    }
  });

  it('health veto wins even when build keywords are present', () => {
    // "build" appears but it's about the patient's health plan, not software
    const r = guardAiScope('Can we build a plan to keep my blood pressure in check?');
    expect(r.refused).toBe(false);
  });
});
