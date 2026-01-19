import { describe, it, expect } from 'vitest';
import { getActionTypeLabel, getActionLabel, ACTION_TYPE_LABELS } from './action-labels';
import type { ActionType } from '../types/actions';

describe('action-labels', () => {
  describe('ACTION_TYPE_LABELS', () => {
    it('has a label for each action type', () => {
      const actionTypes: ActionType[] = [
        'keyboard',
        'launch',
        'script',
        'http',
        'media',
        'system',
        'profile',
        'workspace',
        'text',
        'home_assistant',
        'node_red',
      ];

      actionTypes.forEach((type) => {
        expect(ACTION_TYPE_LABELS[type]).toBeDefined();
        expect(typeof ACTION_TYPE_LABELS[type]).toBe('string');
      });
    });

    it('has expected abbreviations', () => {
      expect(ACTION_TYPE_LABELS.keyboard).toBe('kbd');
      expect(ACTION_TYPE_LABELS.launch).toBe('app');
      expect(ACTION_TYPE_LABELS.http).toBe('http');
      expect(ACTION_TYPE_LABELS.media).toBe('med');
      expect(ACTION_TYPE_LABELS.system).toBe('sys');
      expect(ACTION_TYPE_LABELS.workspace).toBe('ws');
    });
  });

  describe('getActionTypeLabel', () => {
    it('returns correct label for keyboard action', () => {
      expect(getActionTypeLabel('keyboard')).toBe('kbd');
    });

    it('returns correct label for launch action', () => {
      expect(getActionTypeLabel('launch')).toBe('app');
    });

    it('returns correct label for http action', () => {
      expect(getActionTypeLabel('http')).toBe('http');
    });

    it('returns correct label for media action', () => {
      expect(getActionTypeLabel('media')).toBe('med');
    });

    it('returns correct label for system action', () => {
      expect(getActionTypeLabel('system')).toBe('sys');
    });

    it('returns correct label for workspace action', () => {
      expect(getActionTypeLabel('workspace')).toBe('ws');
    });
  });

  describe('getActionLabel', () => {
    it('returns "-" for undefined action', () => {
      expect(getActionLabel(undefined)).toBe('-');
    });

    it('returns "-" for null action', () => {
      expect(getActionLabel(null)).toBe('-');
    });

    it('returns "-" for action without type', () => {
      expect(getActionLabel({})).toBe('-');
    });

    it('returns correct label for keyboard action', () => {
      const action = { type: 'keyboard' as const, keys: 'A' };
      expect(getActionLabel(action)).toBe('kbd');
    });

    it('returns correct label for launch action', () => {
      const action = { type: 'launch' as const, path: '/app' };
      expect(getActionLabel(action)).toBe('app');
    });

    it('returns correct label for http action', () => {
      const action = { type: 'http' as const, url: 'https://example.com', method: 'GET' as const };
      expect(getActionLabel(action)).toBe('http');
    });

    it('returns correct label for complete action object', () => {
      const action = {
        id: '123',
        name: 'Test',
        type: 'media' as const,
        action: 'play_pause' as const,
      };
      expect(getActionLabel(action)).toBe('med');
    });
  });
});
